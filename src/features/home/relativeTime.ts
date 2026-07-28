/**
 * Formats a 'YYYY-MM-DD' event-date string as a relative time ("Today",
 * "Yesterday", "2 days ago", ...) for the Recent Hangar Activity feed
 * (IMPLEMENTATION_SPEC.md §2 item 4: "actual timestamp (relative: '2 days
 * ago')"). Parses the date components directly rather than `new
 * Date(eventDate)`, which parses as UTC midnight and can be off by a day
 * in negative-UTC-offset timezones — same pitfall called out in
 * timelineApi.ts's TimelineEntry.event_date comment and worked around in
 * timelineGrouping.ts and TimelineEntryCard.tsx.
 *
 * `now` is an injectable parameter (defaulting to the real current time) so
 * this is deterministically testable without mocking global Date.
 */
export function formatRelativeEventDate(eventDate: string, now: Date = new Date()): string {
  const [year, month, day] = eventDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffDays = Math.round((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  if (diffDays < 30) {
    const weeks = Math.round(diffDays / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }

  if (diffDays < 365) {
    const months = Math.round(diffDays / 30);
    return months === 1 ? '1 month ago' : `${months} months ago`;
  }

  const years = Math.round(diffDays / 365);
  return years === 1 ? '1 year ago' : `${years} years ago`;
}
