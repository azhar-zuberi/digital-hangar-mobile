// Pure, framework-free validation + diffing for issue #37's optional-fields
// edit form. Kept dependency-free (no React Native / Supabase imports), same
// reasoning as aircraftValidation.ts: trivially unit-testable, reusable from
// both the screen and its submit path.
//
// Fields here are exactly the "actually exists in the `aircraft` table"
// optional set — nickname, year, serial_number, engine_information,
// home_airport. `purchase_date`/`ownership_story` from PRD §10 are NOT
// included: those columns don't exist in the schema (see
// src/models/database.types.ts and
// supabase/migrations/20260726190000_create_aircraft_and_communities.sql),
// and issue #37's current body explicitly scoped them out for a future
// migration rather than having this form invent columns.

export type AircraftEditFormValues = {
  nickname: string;
  /** Raw text field state — parsed to a number (or null) via `parseYear`. */
  year: string;
  serialNumber: string;
  engineInformation: string;
  homeAirport: string;
};

export type AircraftEditFormField = keyof AircraftEditFormValues;

export type AircraftEditFormErrors = Partial<Record<AircraftEditFormField, string>>;

export const NICKNAME_MAX_LENGTH = 50;
export const MIN_YEAR = 1900;

/** Aircraft built next calendar year don't exist yet — same "no future date"
 * spirit as timelineValidation.ts's event-date rule. */
export function maxYear(): number {
  return new Date().getFullYear();
}

// Calm, non-alarming copy per docs/BRAND.md §17.
export const AIRCRAFT_EDIT_ERROR_COPY = {
  nicknameTooLong: `Keep the nickname under ${NICKNAME_MAX_LENGTH} characters.`,
  yearInvalid: () => `Enter a year between ${MIN_YEAR} and ${maxYear()}.`,
} as const;

export function validateAircraftEditForm(values: AircraftEditFormValues): AircraftEditFormErrors {
  const errors: AircraftEditFormErrors = {};

  if (values.nickname.trim().length > NICKNAME_MAX_LENGTH) {
    errors.nickname = AIRCRAFT_EDIT_ERROR_COPY.nicknameTooLong;
  }

  const trimmedYear = values.year.trim();
  if (trimmedYear) {
    const parsed = Number(trimmedYear);
    if (!Number.isInteger(parsed) || parsed < MIN_YEAR || parsed > maxYear()) {
      errors.year = AIRCRAFT_EDIT_ERROR_COPY.yearInvalid();
    }
  }

  return errors;
}

/** Field order the form focuses through on validation failure — same
 * "first invalid field" pattern as aircraftValidation.ts/timelineValidation.ts. */
export const AIRCRAFT_EDIT_FIELD_ORDER: AircraftEditFormField[] = [
  'nickname',
  'year',
  'serialNumber',
  'engineInformation',
  'homeAirport',
];

export function firstInvalidField(errors: AircraftEditFormErrors): AircraftEditFormField | null {
  return AIRCRAFT_EDIT_FIELD_ORDER.find((field) => errors[field]) ?? null;
}

/** Empty string parses to `null` (field cleared / left blank) rather than
 * `NaN` or `0` — a blank optional field means "not set," not "year zero." */
export function parseYear(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) ? parsed : null;
}

/** The `aircraft` row's shape for exactly the columns this form edits —
 * matches AircraftEditableFields in aircraftApi.ts field-for-field. */
export type AircraftEditableValues = {
  nickname: string | null;
  year: number | null;
  serial_number: string | null;
  engine_information: string | null;
  home_airport: string | null;
};

/** Trims free text and normalizes "" to `null`, so clearing a field out
 * saves as genuinely empty rather than an empty string. */
export function toEditableValues(values: AircraftEditFormValues): AircraftEditableValues {
  return {
    nickname: values.nickname.trim() || null,
    year: parseYear(values.year),
    serial_number: values.serialNumber.trim() || null,
    engine_information: values.engineInformation.trim() || null,
    home_airport: values.homeAirport.trim() || null,
  };
}

/**
 * Only the fields that actually changed from `initial`, per the acceptance
 * criteria's "Save button updates `aircraft` row (only modified fields)."
 * Returns an empty object when nothing changed, which callers treat as
 * "nothing to save" rather than issuing a no-op network request.
 */
export function diffEditableValues(
  initial: AircraftEditableValues,
  next: AircraftEditableValues,
): Partial<AircraftEditableValues> {
  // Written as explicit per-field comparisons rather than a generic
  // `Object.keys` loop: TypeScript can't narrow `next[key]`'s type back to
  // the specific field's type when `key` comes from a generic `keyof`
  // iteration, so a loop here would need an `as` cast per assignment anyway
  // — this is no less type-safe and reads as a plain field-by-field diff.
  const diff: Partial<AircraftEditableValues> = {};
  if (initial.nickname !== next.nickname) diff.nickname = next.nickname;
  if (initial.year !== next.year) diff.year = next.year;
  if (initial.serial_number !== next.serial_number) diff.serial_number = next.serial_number;
  if (initial.engine_information !== next.engine_information) {
    diff.engine_information = next.engine_information;
  }
  if (initial.home_airport !== next.home_airport) diff.home_airport = next.home_airport;
  return diff;
}

/** Converts a fetched `aircraft` row's editable columns into form field
 * strings for initializing the form — the inverse of `toEditableValues`. */
export function toFormValues(values: AircraftEditableValues): AircraftEditFormValues {
  return {
    nickname: values.nickname ?? '',
    year: values.year != null ? String(values.year) : '',
    serialNumber: values.serial_number ?? '',
    engineInformation: values.engine_information ?? '',
    homeAirport: values.home_airport ?? '',
  };
}
