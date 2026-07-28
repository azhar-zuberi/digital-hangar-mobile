// Pure, framework-free validation for the Story tab's add-entry form (issue
// #36) — same rationale as aircraftValidation.ts: no React Native/Supabase
// imports, so it's trivially unit-testable and reusable from both the form
// screen and its submit hook.

import type { TimelineEntryType } from './timelineApi';

export type TimelineEntryFormValues = {
  type: TimelineEntryType;
  title: string;
  description: string;
  /** Always a concrete date — the date picker defaults to today and can
   * never be cleared to empty, so there's no separate "date is required"
   * state to validate for; only "is it in the future" needs checking. */
  eventDate: Date;
  /** Local file:// (or blob:/data: on web) URIs from the image picker, not
   * yet compressed or uploaded. */
  photoUris: string[];
};

export type TimelineEntryFormField = 'title' | 'eventDate';

export type TimelineEntryFormErrors = Partial<Record<TimelineEntryFormField, string>>;

// Calm, non-alarming copy per docs/BRAND.md §17 — mirrors
// aircraftValidation.ts's AIRCRAFT_FORM_ERROR_COPY pattern.
export const TIMELINE_ENTRY_FORM_ERROR_COPY = {
  titleRequired: 'Give this entry a title before saving.',
  eventDateFuture: "That date hasn't happened yet — pick today or an earlier date.",
} as const;

/**
 * Local 'YYYY-MM-DD' string for a Date, ignoring time-of-day — matches
 * `timeline_entries.event_date`'s Postgres `date` type and avoids the
 * UTC/local drift `toISOString()` would introduce (which can shift the
 * calendar day depending on the device's timezone). Use this instead of
 * `toISOString().slice(0, 10)` anywhere a Date needs to become the string
 * this column expects.
 */
export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Calendar-day comparison (not exact time) — a `date` selected earlier
 * today is never "future" relative to `today`, regardless of the current
 * clock time. */
export function isFutureDate(date: Date, today: Date = new Date()): boolean {
  return toDateString(date) > toDateString(today);
}

export function validateTimelineEntryForm(
  values: TimelineEntryFormValues,
  today: Date = new Date(),
): TimelineEntryFormErrors {
  const errors: TimelineEntryFormErrors = {};

  if (!values.title.trim()) {
    errors.title = TIMELINE_ENTRY_FORM_ERROR_COPY.titleRequired;
  }

  if (isFutureDate(values.eventDate, today)) {
    errors.eventDate = TIMELINE_ENTRY_FORM_ERROR_COPY.eventDateFuture;
  }

  return errors;
}

/** Field order the form focuses/announces through on validation failure. */
export const TIMELINE_ENTRY_FORM_FIELD_ORDER: TimelineEntryFormField[] = ['title', 'eventDate'];

export function firstInvalidField(errors: TimelineEntryFormErrors): TimelineEntryFormField | null {
  return TIMELINE_ENTRY_FORM_FIELD_ORDER.find((field) => errors[field]) ?? null;
}
