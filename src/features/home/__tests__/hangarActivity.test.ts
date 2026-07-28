import { mergeHangarActivity, type HangarActivityItem } from '../hangarActivity';

function makeItem(overrides: Partial<HangarActivityItem>): HangarActivityItem {
  return {
    id: 'item-id',
    kind: 'timeline',
    badgeLabel: 'Memory',
    badgeVariant: 'default',
    title: 'Untitled',
    eventDate: '2024-01-01',
    thumbnailStoragePath: null,
    ...overrides,
  };
}

describe('mergeHangarActivity', () => {
  it('returns an empty array when every slice is empty', () => {
    expect(mergeHangarActivity({ timelineItems: [] }, 5)).toEqual([]);
  });

  it('sorts a single slice most-recent-first by eventDate', () => {
    const older = makeItem({ id: '1', eventDate: '2024-01-01' });
    const newer = makeItem({ id: '2', eventDate: '2024-06-01' });

    const merged = mergeHangarActivity({ timelineItems: [older, newer] }, 5);

    expect(merged.map((item) => item.id)).toEqual(['2', '1']);
  });

  it('caps the result to the given limit', () => {
    const items = ['1', '2', '3', '4', '5', '6'].map((id) =>
      makeItem({ id, eventDate: `2024-01-0${id}` }),
    );

    expect(mergeHangarActivity({ timelineItems: items }, 5)).toHaveLength(5);
  });

  // Phase 3/4 haven't landed real squawk/flight queries yet, but the merge
  // function is exercised here with hand-built items of those kinds so a
  // future useRecentSquawks()/useRecentFlights() hook can plug straight
  // into this without the sort/cap logic needing to change.
  it('merges timeline, squawk, and flight slices into one chronological feed', () => {
    const timelineItems = [
      makeItem({ id: 'timeline-1', kind: 'timeline', eventDate: '2024-06-01' }),
    ];
    const squawkItems = [
      makeItem({ id: 'squawk-1', kind: 'squawk', badgeLabel: 'Squawk', eventDate: '2024-06-15' }),
    ];
    const flightItems = [
      makeItem({ id: 'flight-1', kind: 'flight', badgeLabel: 'Flight', eventDate: '2024-05-01' }),
    ];

    const merged = mergeHangarActivity({ timelineItems, squawkItems, flightItems }, 5);

    expect(merged.map((item) => item.id)).toEqual(['squawk-1', 'timeline-1', 'flight-1']);
  });

  it('treats omitted squawk/flight slices as empty, not an error', () => {
    const timelineItems = [makeItem({ id: '1' })];
    expect(mergeHangarActivity({ timelineItems }, 5)).toEqual(timelineItems);
  });
});
