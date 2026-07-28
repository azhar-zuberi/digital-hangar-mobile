import { formatRelativeEventDate } from '../relativeTime';

// A fixed "now" so these tests are deterministic regardless of when they
// run — a Wednesday, well clear of month/year boundaries.
const NOW = new Date(2026, 6, 15); // 2026-07-15 (local time, matches CLAUDE.md's currentDate)

describe('formatRelativeEventDate', () => {
  it('formats the same day as "Today"', () => {
    expect(formatRelativeEventDate('2026-07-15', NOW)).toBe('Today');
  });

  it('formats one day back as "Yesterday"', () => {
    expect(formatRelativeEventDate('2026-07-14', NOW)).toBe('Yesterday');
  });

  it('formats a few days back in days', () => {
    expect(formatRelativeEventDate('2026-07-13', NOW)).toBe('2 days ago');
    expect(formatRelativeEventDate('2026-07-09', NOW)).toBe('6 days ago');
  });

  it('formats about a week back in weeks', () => {
    expect(formatRelativeEventDate('2026-07-08', NOW)).toBe('1 week ago');
    expect(formatRelativeEventDate('2026-06-24', NOW)).toBe('3 weeks ago');
  });

  it('formats about a month back in months', () => {
    expect(formatRelativeEventDate('2026-06-14', NOW)).toBe('1 month ago');
    expect(formatRelativeEventDate('2026-03-15', NOW)).toBe('4 months ago');
  });

  it('formats a year or more back in years', () => {
    expect(formatRelativeEventDate('2025-07-10', NOW)).toBe('1 year ago');
    expect(formatRelativeEventDate('2023-01-01', NOW)).toBe('4 years ago');
  });

  it('treats a future date as "Today" rather than a negative duration', () => {
    expect(formatRelativeEventDate('2026-07-20', NOW)).toBe('Today');
  });

  it('reads the date from the string, not a UTC-parsed Date', () => {
    // new Date('2026-07-15') parses as UTC midnight, which renders as
    // 2026-07-14 in negative-UTC-offset timezones — this guards against
    // that regression the same way timelineGrouping.test.ts does for year
    // grouping.
    expect(formatRelativeEventDate('2026-07-15', NOW)).toBe('Today');
  });
});
