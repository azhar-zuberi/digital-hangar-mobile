// Pure, framework-free validation for the "Add My Aircraft" form (issue #8).
// Kept dependency-free (no React Native / Supabase imports) so it's trivially
// unit-testable and reusable from both the form screen and its submit hook.
//
// Fields collected here are exactly the required set per
// IMPLEMENTATION_SPEC.md §2 step 3: registration, manufacturer, model,
// primary photo. Optional fields (nickname, year, serial number, engine
// info, home airport, purchase date, ownership story) are deliberately not
// part of this form — they're progressive disclosure after creation, per the
// same spec section and the issue's acceptance criteria.

export type AircraftFormValues = {
  registration: string;
  manufacturer: string;
  model: string;
  /** Local file:// (or blob:/data: on web) URI from the image picker, or
   * null before anything has been selected. */
  primaryPhotoUri: string | null;
};

export type AircraftFormField = keyof AircraftFormValues;

export type AircraftFormErrors = Partial<Record<AircraftFormField, string>>;

// Calm, non-alarming copy per docs/BRAND.md §17 — states what to do, not
// what's wrong ("Add your..." rather than "Registration is required").
export const AIRCRAFT_FORM_ERROR_COPY = {
  registrationRequired: "Add your aircraft's registration (tail number) to continue.",
  registrationInvalid:
    "That doesn't look like a registration — letters, numbers, and hyphens only.",
  manufacturerRequired: 'Add the manufacturer, e.g. "Piper" or "Cessna."',
  modelRequired: 'Add the model, e.g. "PA-28" or "172."',
  primaryPhotoRequired: 'Add a photo so your aircraft has a home here.',
} as const;

// Deliberately permissive: this covers US tail numbers (N123AZ) as well as
// common international registrations (G-ABCD, C-GABC, VH-ABC) rather than
// enforcing the FAA-only N-number format. Digital Hangar isn't US-only.
export const REGISTRATION_PATTERN = /^[A-Z0-9-]{2,10}$/;

/** Trims and uppercases a registration for both validation and storage —
 * call this before comparing against `aircraft.registration` or persisting
 * it, so "n123az" and "N123AZ" are treated as the same tail number. */
export function normalizeRegistration(value: string): string {
  return value.trim().toUpperCase();
}

export function validateAircraftForm(values: AircraftFormValues): AircraftFormErrors {
  const errors: AircraftFormErrors = {};

  const registration = normalizeRegistration(values.registration);
  if (!registration) {
    errors.registration = AIRCRAFT_FORM_ERROR_COPY.registrationRequired;
  } else if (!REGISTRATION_PATTERN.test(registration)) {
    errors.registration = AIRCRAFT_FORM_ERROR_COPY.registrationInvalid;
  }

  if (!values.manufacturer.trim()) {
    errors.manufacturer = AIRCRAFT_FORM_ERROR_COPY.manufacturerRequired;
  }

  if (!values.model.trim()) {
    errors.model = AIRCRAFT_FORM_ERROR_COPY.modelRequired;
  }

  if (!values.primaryPhotoUri) {
    errors.primaryPhotoUri = AIRCRAFT_FORM_ERROR_COPY.primaryPhotoRequired;
  }

  return errors;
}

/** Field order the form focuses through on validation failure/submission —
 * also used to pick which invalid field to focus first. */
export const AIRCRAFT_FORM_FIELD_ORDER: AircraftFormField[] = [
  'registration',
  'manufacturer',
  'model',
  'primaryPhotoUri',
];

export function firstInvalidField(errors: AircraftFormErrors): AircraftFormField | null {
  return AIRCRAFT_FORM_FIELD_ORDER.find((field) => errors[field]) ?? null;
}
