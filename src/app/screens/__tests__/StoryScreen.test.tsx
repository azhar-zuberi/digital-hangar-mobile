import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent } from '@testing-library/react-native';

import { StoryScreen } from '../StoryScreen';
import { useCurrentAircraftId } from '../../../features/timeline/useCurrentAircraftId';
import { useTimelineEntries } from '../../../features/timeline/useTimelineEntries';
import type { TimelineEntry } from '../../../features/timeline/timelineApi';

jest.mock('../../../features/timeline/useCurrentAircraftId');
jest.mock('../../../features/timeline/useTimelineEntries');

const mockedUseCurrentAircraftId = useCurrentAircraftId as jest.Mock;
const mockedUseTimelineEntries = useTimelineEntries as jest.Mock;

function makeEntry(overrides: Partial<TimelineEntry>): TimelineEntry {
  return {
    id: 'entry-1',
    aircraft_id: 'aircraft-1',
    created_by: 'user-1',
    type: 'memory',
    title: 'First solo flight',
    description: null,
    event_date: '2024-06-01',
    created_at: '2024-06-01T00:00:00Z',
    photos: [],
    ...overrides,
  };
}

// render() is async in this project's RNTL setup — see
// PlaceholderScreen.test.tsx's `await render(...)` precedent — so this
// helper is async too, and every call site below awaits it.
async function renderStoryScreen({
  navigation,
  scrollToEntryId,
}: {
  navigation?: Partial<{ getParent: jest.Mock; setParams: jest.Mock }>;
  scrollToEntryId?: string;
} = {}) {
  const queryClient = new QueryClient();
  const getParent = navigation?.getParent ?? jest.fn();
  const setParams = navigation?.setParams ?? jest.fn();

  const props = {
    navigation: { getParent, setParams } as never,
    route: { key: 'Story', name: 'Story' as const, params: { scrollToEntryId } },
  };

  return {
    ...(await render(
      <QueryClientProvider client={queryClient}>
        <StoryScreen {...props} />
      </QueryClientProvider>,
    )),
    getParent,
    setParams,
  };
}

// Story tab's list screen (issue #36) — a critical flow per docs/TDD.md §19
// ("timeline creation" implies the list that surfaces it). Hooks are
// mocked so this exercises StoryScreen's own rendering/grouping/empty-state
// logic, not the network layer (covered separately by timelineApi.ts's
// query-shape comments and timelineGrouping.test.ts's pure grouping tests).
describe('StoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the empty-state copy and an Add Entry button when there are no entries', async () => {
    mockedUseCurrentAircraftId.mockReturnValue({ data: 'aircraft-1', isLoading: false });
    mockedUseTimelineEntries.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      isRefetching: false,
      refetch: jest.fn(),
    });

    await renderStoryScreen();

    expect(screen.getByText('No memories yet. Start by adding one.')).toBeTruthy();
    expect(screen.getByLabelText('Add Entry')).toBeTruthy();
  });

  it('navigates to AddTimelineEntry with the current aircraft id from the empty state', async () => {
    mockedUseCurrentAircraftId.mockReturnValue({ data: 'aircraft-1', isLoading: false });
    mockedUseTimelineEntries.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      isRefetching: false,
      refetch: jest.fn(),
    });
    const navigate = jest.fn();
    const getParent = jest.fn(() => ({ navigate }));

    await renderStoryScreen({ navigation: { getParent } });
    fireEvent.press(screen.getByLabelText('Add Entry'));

    expect(navigate).toHaveBeenCalledWith('AddTimelineEntry', { aircraftId: 'aircraft-1' });
  });

  it('renders entries grouped under year section headers', async () => {
    mockedUseCurrentAircraftId.mockReturnValue({ data: 'aircraft-1', isLoading: false });
    mockedUseTimelineEntries.mockReturnValue({
      data: [
        makeEntry({ id: '1', title: 'First solo flight', event_date: '2024-06-01' }),
        makeEntry({ id: '2', title: 'Annual inspection complete', event_date: '2023-03-10' }),
      ],
      isLoading: false,
      isError: false,
      isRefetching: false,
      refetch: jest.fn(),
    });

    await renderStoryScreen();

    expect(screen.getByText('2024')).toBeTruthy();
    expect(screen.getByText('2023')).toBeTruthy();
    expect(screen.getByText('First solo flight')).toBeTruthy();
    expect(screen.getByText('Annual inspection complete')).toBeTruthy();
  });

  it('shows a calm retry message on error instead of a blank screen', async () => {
    mockedUseCurrentAircraftId.mockReturnValue({ data: 'aircraft-1', isLoading: false });
    mockedUseTimelineEntries.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      isRefetching: false,
      refetch: jest.fn(),
    });

    await renderStoryScreen();

    expect(screen.getByText(/couldn't load/i)).toBeTruthy();
  });
});
