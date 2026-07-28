import type { TimelineEntry } from './timelineApi';

export type TimelineYearSection = {
  /** The calendar year as a string, e.g. "2024" — used directly as the
   * section header per IMPLEMENTATION_SPEC.md §2 ("grouped by year, e.g.
   * '2024', '2023', '2022'"). */
  title: string;
  data: TimelineEntry[];
};

/**
 * Partitions entries into per-year sections for the Story list's
 * SectionList, per IMPLEMENTATION_SPEC.md §2. Pure and framework-free (no
 * React Native imports) so it's unit-testable without rendering anything —
 * same rationale as timelineValidation.ts.
 *
 * Assumes `entries` is already reverse-chronological (fetchTimelineEntries
 * orders by event_date desc, then created_at desc) — this only partitions
 * consecutive same-year entries into sections, it never re-sorts. Reads the
 * year directly from the `event_date` string's first 4 characters rather
 * than `new Date(entry.event_date).getFullYear()`, which parses as UTC
 * midnight and can report the wrong year near a year boundary depending on
 * the device's timezone.
 */
export function groupTimelineEntriesByYear(entries: TimelineEntry[]): TimelineYearSection[] {
  const sections: TimelineYearSection[] = [];

  for (const entry of entries) {
    const year = entry.event_date.slice(0, 4);
    const lastSection = sections[sections.length - 1];

    if (lastSection && lastSection.title === year) {
      lastSection.data.push(entry);
    } else {
      sections.push({ title: year, data: [entry] });
    }
  }

  return sections;
}
