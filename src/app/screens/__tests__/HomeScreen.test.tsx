import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { HomeScreen } from '../HomeScreen';
import { useSelectedAircraft } from '../../../features/aircraft/useSelectedAircraft';
import { useRecentHangarActivity } from '../../../features/home/useRecentHangarActivity';

jest.mock('../../../features/aircraft/useSelectedAircraft');
jest.mock('../../../features/auth/signOut', () => ({ signOut: jest.fn(() => Promise.resolve()) }));
// Issue #38 (merged after this file was first written) added RecentHangarActivity
// to HomeScreen, which calls useQuery — mock the hook per the StoryScreen.test.tsx
// precedent so these Edit-Profile-focused tests don't need a real network layer.
jest.mock('../../../features/home/useRecentHangarActivity');

const mockedUseSelectedAircraft = useSelectedAircraft as jest.Mock;
const mockedUseRecentHangarActivity = useRecentHangarActivity as jest.Mock;

function baseAircraft(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'aircraft-1',
    registration: 'N123AZ',
    manufacturer: 'Piper',
    model: 'PA-28',
    nickname: null,
    primary_photo_url: null,
    visibility: 'community',
    ...overrides,
  };
}

// render() is async in this project's RNTL setup — see StoryScreen.test.tsx.
async function renderHomeScreen({ navigate = jest.fn() }: { navigate?: jest.Mock } = {}) {
  const props = {
    navigation: { navigate } as never,
    route: { key: 'Home', name: 'Home' as const, params: undefined },
  };
  const queryClient = new QueryClient();

  await render(
    <QueryClientProvider client={queryClient}>
      <HomeScreen {...props} />
    </QueryClientProvider>,
  );

  return { navigate };
}

// Issue #37's UI entry point decision: a dedicated "Edit Profile" button on
// Home. Covers that the button is present, reachable anytime (not gated on
// anything), and navigates to the new EditAircraftProfile route with the
// currently-selected aircraft's id.
describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseRecentHangarActivity.mockReturnValue({
      timelineItems: [],
      isLoading: false,
      isError: false,
      isRefetching: false,
      refetch: jest.fn(),
    });
  });

  it('shows an Edit Profile button for the selected aircraft', async () => {
    mockedUseSelectedAircraft.mockReturnValue({
      ownedAircraft: [baseAircraft()],
      selectedAircraft: baseAircraft(),
      selectAircraft: jest.fn(),
      isLoading: false,
      isError: false,
    });

    await renderHomeScreen();

    expect(screen.getByLabelText('Edit aircraft profile')).toBeTruthy();
  });

  it('navigates to EditAircraftProfile with the selected aircraft id', async () => {
    mockedUseSelectedAircraft.mockReturnValue({
      ownedAircraft: [baseAircraft({ id: 'aircraft-42' })],
      selectedAircraft: baseAircraft({ id: 'aircraft-42' }),
      selectAircraft: jest.fn(),
      isLoading: false,
      isError: false,
    });
    const { navigate } = await renderHomeScreen();

    await fireEvent.press(screen.getByLabelText('Edit aircraft profile'));

    expect(navigate).toHaveBeenCalledWith('EditAircraftProfile', { aircraftId: 'aircraft-42' });
  });

  it('does not render Edit Profile while there is no selected aircraft', async () => {
    mockedUseSelectedAircraft.mockReturnValue({
      ownedAircraft: [],
      selectedAircraft: null,
      selectAircraft: jest.fn(),
      isLoading: false,
      isError: false,
    });

    await renderHomeScreen();

    expect(screen.queryByLabelText('Edit aircraft profile')).toBeNull();
  });
});
