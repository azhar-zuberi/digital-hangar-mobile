import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { EditAircraftProfileScreen } from '../EditAircraftProfileScreen';
import { useAircraftEditableFields } from '../../../features/aircraft/useAircraftEditableFields';
import { useUpdateAircraftProfile } from '../../../features/aircraft/useUpdateAircraftProfile';
import type { AircraftEditableFields } from '../../../features/aircraft/aircraftApi';

jest.mock('../../../features/aircraft/useAircraftEditableFields');
jest.mock('../../../features/aircraft/useUpdateAircraftProfile');

const mockedUseAircraftEditableFields = useAircraftEditableFields as jest.Mock;
const mockedUseUpdateAircraftProfile = useUpdateAircraftProfile as jest.Mock;

function makeCurrent(overrides: Partial<AircraftEditableFields> = {}): AircraftEditableFields {
  return {
    id: 'aircraft-1',
    nickname: 'Bluebird',
    year: 1979,
    serial_number: '28-7405136',
    engine_information: 'Lycoming O-235-C1',
    home_airport: 'KJFK',
    ...overrides,
  };
}

// render() is async in this project's RNTL setup — see StoryScreen.test.tsx.
async function renderScreen({
  current,
  submit = jest.fn(),
  isSubmitting = false,
  bannerError = null,
  goBack = jest.fn(),
}: {
  current?: AircraftEditableFields | null;
  submit?: jest.Mock;
  isSubmitting?: boolean;
  bannerError?: string | null;
  goBack?: jest.Mock;
} = {}) {
  mockedUseAircraftEditableFields.mockReturnValue({
    data: current === undefined ? makeCurrent() : current,
    isLoading: false,
    isError: false,
  });
  mockedUseUpdateAircraftProfile.mockReturnValue({
    submit,
    isSubmitting,
    isSuccess: false,
    bannerError,
    reset: jest.fn(),
  });

  const queryClient = new QueryClient();
  const props = {
    navigation: { goBack, navigate: jest.fn() } as never,
    route: {
      key: 'EditAircraftProfile',
      name: 'EditAircraftProfile' as const,
      params: { aircraftId: 'aircraft-1' },
    },
  };

  await render(
    <QueryClientProvider client={queryClient}>
      <EditAircraftProfileScreen {...props} />
    </QueryClientProvider>,
  );

  return { submit, goBack };
}

// Issue #37's optional-fields edit form. Data hooks are mocked so this
// exercises the screen's own pre-fill / validate / diff-and-submit /
// cancel behavior, not the network layer (covered separately by
// aircraftApi.test.ts and aircraftEditValidation.test.ts).
describe('EditAircraftProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('pre-fills the form with the aircraft row current values', async () => {
    await renderScreen({ current: makeCurrent() });

    expect(screen.getByDisplayValue('Bluebird')).toBeTruthy();
    expect(screen.getByDisplayValue('1979')).toBeTruthy();
    expect(screen.getByDisplayValue('28-7405136')).toBeTruthy();
    expect(screen.getByDisplayValue('Lycoming O-235-C1')).toBeTruthy();
    expect(screen.getByDisplayValue('KJFK')).toBeTruthy();
  });

  it('leaves every field blank when no optional fields are set yet', async () => {
    await renderScreen({
      current: makeCurrent({
        nickname: null,
        year: null,
        serial_number: null,
        engine_information: null,
        home_airport: null,
      }),
    });

    expect(screen.getByLabelText('Nickname').props.value).toBe('');
  });

  it('cancel returns to the previous screen without calling submit', async () => {
    const { submit, goBack } = await renderScreen();

    await fireEvent.press(screen.getByLabelText('Cancel'));

    expect(goBack).toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
  });

  it('saving with no changes goes back without calling submit (no no-op network request)', async () => {
    const { submit, goBack } = await renderScreen();

    await fireEvent.press(screen.getByLabelText('Save changes'));

    expect(goBack).toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
  });

  it('saving a changed field submits only that field', async () => {
    const { submit } = await renderScreen();

    await fireEvent.changeText(screen.getByLabelText('Nickname'), 'Skybird');
    await fireEvent.press(screen.getByLabelText('Save changes'));

    expect(submit).toHaveBeenCalledWith({ nickname: 'Skybird' }, expect.anything());
  });

  it('clearing a previously-set field submits it as null', async () => {
    const { submit } = await renderScreen();

    await fireEvent.changeText(screen.getByLabelText('Home airport'), '');
    await fireEvent.press(screen.getByLabelText('Save changes'));

    expect(submit).toHaveBeenCalledWith({ home_airport: null }, expect.anything());
  });

  it('shows a validation error and does not submit when the year is out of range', async () => {
    const { submit } = await renderScreen();

    await fireEvent.changeText(screen.getByLabelText('Year'), '1850');
    await fireEvent.press(screen.getByLabelText('Save changes'));

    expect(screen.getByText(/1900/)).toBeTruthy();
    expect(submit).not.toHaveBeenCalled();
  });

  it('renders the banner error from the update mutation', async () => {
    await renderScreen({ bannerError: "That didn't save. Give it another try in a moment." });

    expect(screen.getByText("That didn't save. Give it another try in a moment.")).toBeTruthy();
  });

  it('disables Save while a save is in progress', async () => {
    await renderScreen({ isSubmitting: true });

    expect(screen.getByLabelText('Save changes').props.accessibilityState.disabled).toBe(true);
  });
});
