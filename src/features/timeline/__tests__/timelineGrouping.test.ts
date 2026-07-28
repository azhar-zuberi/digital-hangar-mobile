import { groupTimelineEntriesByYear } from '../timelineGrouping';
import type { TimelineEntry } from '../timelineApi';

function makeEntry(overrides: Partial<TimelineEntry>): TimelineEntry {
  return {
    id: overrides.id ?? 'entry-id',
    aircraft_id: 'aircraft-1',
    created_by: 'user-1',
    type: 'memory',
    title: 'Untitled',
    description: null,
    event_date: '2024-01-01',
    created_at: '2024-01-01T00:00:00Z',
    photos: [],
    ...overrides,
  };
}

describe('groupTimelineEntriesByYear', () => {
  it('returns an empty array for no entries', () => {
    expect(groupTimelineEntriesByYear([])).toEqual([]);
  });

  it('groups a single entry under its year', () => {
    const entry = makeEntry({ id: '1', event_date: '2024-06-15' });
    expect(groupTimelineEntriesByYear([entry])).toEqual([{ title: '2024', data: [entry] }]);
  });

  it('groups consecutive same-year entries into one section, preserving order', () => {
    const entries = [
      makeEntry({ id: '1', event_date: '2024-06-15' }),
      makeEntry({ id: '2', event_date: '2024-03-01' }),
    ];
    const sections = groupTimelineEntriesByYear(entries);
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe('2024');
    expect(sections[0].data.map((e) => e.id)).toEqual(['1', '2']);
  });

  it('splits entries spanning multiple years into separate sections, newest first', () => {
    const entries = [
      makeEntry({ id: '1', event_date: '2024-06-15' }),
      makeEntry({ id: '2', event_date: '2023-11-01' }),
      makeEntry({ id: '3', event_date: '2022-01-01' }),
    ];
    const sections = groupTimelineEntriesByYear(entries);
    expect(sections.map((s) => s.title)).toEqual(['2024', '2023', '2022']);
    expect(sections.map((s) => s.data.length)).toEqual([1, 1, 1]);
  });

  it('does not merge non-consecutive same-year entries into one section', () => {
    // Already-sorted input never actually produces this shape (a year
    // never reappears after a different year interrupts it), but the
    // function should still partition strictly by consecutive runs rather
    // than by a year->section map, since it deliberately never re-sorts.
    const entries = [
      makeEntry({ id: '1', event_date: '2024-06-15' }),
      makeEntry({ id: '2', event_date: '2023-01-01' }),
      makeEntry({ id: '3', event_date: '2024-01-01' }),
    ];
    const sections = groupTimelineEntriesByYear(entries);
    expect(sections.map((s) => s.title)).toEqual(['2024', '2023', '2024']);
  });

  it('reads the year from the event_date string, not a UTC-parsed Date', () => {
    // new Date('2025-01-01') parses as UTC midnight, which renders as
    // 2024-12-31 in negative-UTC-offset timezones — this guards against
    // that regression by asserting on a value that would fail if grouping
    // ever switched to `new Date(entry.event_date).getFullYear()`.
    const entry = makeEntry({ id: '1', event_date: '2025-01-01' });
    expect(groupTimelineEntriesByYear([entry])[0].title).toBe('2025');
  });
});
