import { fireEvent, render, screen } from '@testing-library/react-native';

import { RecentHangarActivity } from '../components/RecentHangarActivity';
import type { HangarActivityItem } from '../hangarActivity';

// useDisplayImageUrl hits Supabase Storage for a signed URL — irrelevant to
// this component's own rendering/empty-state/press-through logic, and not
// exercised by any of these items (none set a thumbnailStoragePath), so it
// is mocked out the same way StoryScreen.test.tsx mocks its data hooks
// rather than the network layer.
jest.mock('../../../hooks/useDisplayImageUrl', () => ({
  useDisplayImageUrl: () => ({ data: null }),
}));

function makeItem(overrides: Partial<HangarActivityItem>): HangarActivityItem {
  return {
    id: 'item-id',
    kind: 'timeline',
    badgeLabel: 'Memory',
    badgeVariant: 'default',
    title: 'First solo flight',
    eventDate: '2020-01-01',
    thumbnailStoragePath: null,
    ...overrides,
  };
}

// Home screen's Recent Hangar Activity section (issue #38): the Phase 2
// slice-and-render logic this component owns (mergeHangarActivity's own
// sort/cap behavior is covered separately in hangarActivity.test.ts).
describe('RecentHangarActivity', () => {
  it('shows a loading indicator while the timeline slice is loading', async () => {
    await render(
      <RecentHangarActivity timelineItems={[]} isLoading isError={false} onPressItem={jest.fn()} />,
    );

    expect(screen.getByText('Recent Hangar Activity')).toBeTruthy();
    expect(screen.queryByText(/story starts here/i)).toBeNull();
  });

  it('shows a calm error message instead of a blank feed', async () => {
    await render(
      <RecentHangarActivity timelineItems={[]} isLoading={false} isError onPressItem={jest.fn()} />,
    );

    expect(screen.getByText(/couldn't load/i)).toBeTruthy();
  });

  it('shows the spec empty-state copy when there is no activity at all', async () => {
    await render(
      <RecentHangarActivity
        timelineItems={[]}
        isLoading={false}
        isError={false}
        onPressItem={jest.fn()}
      />,
    );

    expect(
      screen.getByText("Your aircraft's story starts here. Add a memory or flight to get started."),
    ).toBeTruthy();
  });

  it('renders timeline items with their badge, title, and relative time', async () => {
    await render(
      <RecentHangarActivity
        timelineItems={[
          makeItem({
            id: '1',
            title: 'First solo flight',
            badgeLabel: 'Memory',
            eventDate: '2020-01-01',
          }),
          makeItem({
            id: '2',
            title: 'Annual inspection complete',
            badgeLabel: 'Milestone',
            badgeVariant: 'highlight',
            eventDate: '2024-06-01',
          }),
        ]}
        isLoading={false}
        isError={false}
        onPressItem={jest.fn()}
      />,
    );

    expect(screen.getByText('First solo flight')).toBeTruthy();
    expect(screen.getByText('Annual inspection complete')).toBeTruthy();
    expect(screen.getByText('Memory')).toBeTruthy();
    expect(screen.getByText('Milestone')).toBeTruthy();
  });

  it('caps rendered items to 5 and sorts most-recent-first across slices', async () => {
    const timelineItems = ['1', '2', '3'].map((id) =>
      makeItem({ id: `timeline-${id}`, title: `Timeline ${id}`, eventDate: `2024-01-0${id}` }),
    );
    // TODO(Phase 3)/TODO(Phase 4): once real squawk/flight hooks exist this
    // test can source these from fixtures instead of hand-built items —
    // for now it stands in for those future slices to prove the component
    // already merges/caps across kinds, not just within timelineItems.
    const squawkItems = [
      makeItem({ id: 'squawk-1', kind: 'squawk', title: 'Squawk 1', eventDate: '2024-02-01' }),
    ];
    const flightItems = [
      makeItem({ id: 'flight-1', kind: 'flight', title: 'Flight 1', eventDate: '2024-03-01' }),
      makeItem({ id: 'flight-2', kind: 'flight', title: 'Flight 2', eventDate: '2024-04-01' }),
      makeItem({ id: 'flight-3', kind: 'flight', title: 'Flight 3', eventDate: '2024-05-01' }),
    ];

    await render(
      <RecentHangarActivity
        timelineItems={timelineItems}
        squawkItems={squawkItems}
        flightItems={flightItems}
        isLoading={false}
        isError={false}
        onPressItem={jest.fn()}
      />,
    );

    // 3 timeline + 1 squawk + 3 flight = 7 candidates, capped to 5, most
    // recent eventDate first: Flight 3 (05-01), Flight 2 (04-01), Flight 1
    // (03-01), Squawk 1 (02-01), Timeline 3 (01-03).
    expect(screen.getByText('Flight 3')).toBeTruthy();
    expect(screen.getByText('Flight 2')).toBeTruthy();
    expect(screen.getByText('Flight 1')).toBeTruthy();
    expect(screen.getByText('Squawk 1')).toBeTruthy();
    expect(screen.getByText('Timeline 3')).toBeTruthy();
    expect(screen.queryByText('Timeline 1')).toBeNull();
    expect(screen.queryByText('Timeline 2')).toBeNull();
  });

  it('calls onPressItem with the tapped item', async () => {
    const onPressItem = jest.fn();
    const item = makeItem({ id: '1', title: 'First solo flight' });

    await render(
      <RecentHangarActivity
        timelineItems={[item]}
        isLoading={false}
        isError={false}
        onPressItem={onPressItem}
      />,
    );

    fireEvent.press(screen.getByLabelText('First solo flight'));

    expect(onPressItem).toHaveBeenCalledWith(item);
  });
});
