import { toHangarActivityItem } from '../useRecentHangarActivity';
import type { TimelineEntry } from '../../timeline/timelineApi';

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

// Maps timelineApi.ts's TimelineEntry shape onto the feed-agnostic
// HangarActivityItem shape (issue #38) — this is the one place that
// decides memory-vs-milestone badge label/variant, so it's worth its own
// direct test independent of the mount-and-render coverage in
// RecentHangarActivity.test.tsx.
describe('toHangarActivityItem', () => {
  it('maps a memory entry to a default-variant "Memory" badge', () => {
    const item = toHangarActivityItem(makeEntry({ type: 'memory' }));

    expect(item.kind).toBe('timeline');
    expect(item.badgeLabel).toBe('Memory');
    expect(item.badgeVariant).toBe('default');
  });

  it('maps a milestone entry to a highlight-variant "Milestone" badge', () => {
    const item = toHangarActivityItem(makeEntry({ type: 'milestone' }));

    expect(item.badgeLabel).toBe('Milestone');
    expect(item.badgeVariant).toBe('highlight');
  });

  it('carries the entry id, title, and event_date through unchanged', () => {
    const entry = makeEntry({
      id: 'entry-42',
      title: 'Annual inspection',
      event_date: '2023-03-10',
    });
    const item = toHangarActivityItem(entry);

    expect(item.id).toBe('entry-42');
    expect(item.title).toBe('Annual inspection');
    expect(item.eventDate).toBe('2023-03-10');
  });

  it('uses the first photo storage_path as the thumbnail when photos exist', () => {
    const entry = makeEntry({
      photos: [
        { id: 'p1', storage_path: 'aircraft-1/first.jpg', created_at: '2024-06-01T00:00:00Z' },
        { id: 'p2', storage_path: 'aircraft-1/second.jpg', created_at: '2024-06-02T00:00:00Z' },
      ],
    });

    expect(toHangarActivityItem(entry).thumbnailStoragePath).toBe('aircraft-1/first.jpg');
  });

  it('returns a null thumbnail when there are no photos', () => {
    expect(toHangarActivityItem(makeEntry({ photos: [] })).thumbnailStoragePath).toBeNull();
  });
});
