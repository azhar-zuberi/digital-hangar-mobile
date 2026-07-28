import {
  diffEditableValues,
  firstInvalidField,
  parseYear,
  toEditableValues,
  toFormValues,
  validateAircraftEditForm,
  type AircraftEditFormValues,
} from '../aircraftEditValidation';

function makeValues(overrides: Partial<AircraftEditFormValues> = {}): AircraftEditFormValues {
  return {
    nickname: '',
    year: '',
    serialNumber: '',
    engineInformation: '',
    homeAirport: '',
    ...overrides,
  };
}

// Issue #37's optional-fields edit form is pure enough to unit test without
// mounting React — same rationale as aircraftValidation.test.ts /
// timelineValidation's tests.
describe('validateAircraftEditForm', () => {
  it('has no errors when every field is left blank (all fields optional)', () => {
    expect(validateAircraftEditForm(makeValues())).toEqual({});
  });

  it('rejects a nickname over 50 characters', () => {
    const errors = validateAircraftEditForm(makeValues({ nickname: 'x'.repeat(51) }));
    expect(errors.nickname).toMatch(/50 characters/);
  });

  it('accepts a nickname exactly at the 50 character limit', () => {
    const errors = validateAircraftEditForm(makeValues({ nickname: 'x'.repeat(50) }));
    expect(errors.nickname).toBeUndefined();
  });

  it('rejects a year before 1900', () => {
    const errors = validateAircraftEditForm(makeValues({ year: '1899' }));
    expect(errors.year).toMatch(/1900/);
  });

  it('rejects a year in the future', () => {
    const nextYear = String(new Date().getFullYear() + 1);
    const errors = validateAircraftEditForm(makeValues({ year: nextYear }));
    expect(errors.year).toBeDefined();
  });

  it('rejects a non-numeric year', () => {
    const errors = validateAircraftEditForm(makeValues({ year: 'abcd' }));
    expect(errors.year).toBeDefined();
  });

  it('accepts a valid year within range', () => {
    const errors = validateAircraftEditForm(makeValues({ year: '1979' }));
    expect(errors.year).toBeUndefined();
  });

  it('does not require serial number, engine information, or home airport', () => {
    const errors = validateAircraftEditForm(
      makeValues({ serialNumber: '', engineInformation: '', homeAirport: '' }),
    );
    expect(errors.serialNumber).toBeUndefined();
    expect(errors.engineInformation).toBeUndefined();
    expect(errors.homeAirport).toBeUndefined();
  });
});

describe('firstInvalidField', () => {
  it('returns fields in nickname, year, serialNumber, engineInformation, homeAirport order', () => {
    expect(firstInvalidField({ year: 'bad', nickname: 'bad' })).toBe('nickname');
    expect(firstInvalidField({ year: 'bad' })).toBe('year');
  });

  it('returns null when there are no errors', () => {
    expect(firstInvalidField({})).toBeNull();
  });
});

describe('parseYear', () => {
  it('parses a numeric string to a number', () => {
    expect(parseYear('1979')).toBe(1979);
  });

  it('returns null for a blank string', () => {
    expect(parseYear('   ')).toBeNull();
  });

  it('returns null for a non-integer string', () => {
    expect(parseYear('abcd')).toBeNull();
  });
});

describe('toEditableValues / toFormValues', () => {
  it('round-trips form values through editable values', () => {
    const values = makeValues({
      nickname: '  Bluebird  ',
      year: '1979',
      serialNumber: '28-7405136',
      engineInformation: 'Lycoming O-235-C1',
      homeAirport: 'KJFK',
    });

    const editable = toEditableValues(values);
    expect(editable).toEqual({
      nickname: 'Bluebird',
      year: 1979,
      serial_number: '28-7405136',
      engine_information: 'Lycoming O-235-C1',
      home_airport: 'KJFK',
    });

    expect(toFormValues(editable)).toEqual({
      nickname: 'Bluebird',
      year: '1979',
      serialNumber: '28-7405136',
      engineInformation: 'Lycoming O-235-C1',
      homeAirport: 'KJFK',
    });
  });

  it('normalizes blank fields to null rather than empty strings', () => {
    const editable = toEditableValues(makeValues());
    expect(editable).toEqual({
      nickname: null,
      year: null,
      serial_number: null,
      engine_information: null,
      home_airport: null,
    });
  });
});

describe('diffEditableValues', () => {
  const initial = toEditableValues(
    makeValues({ nickname: 'Bluebird', year: '1979', homeAirport: 'KJFK' }),
  );

  it('returns an empty object when nothing changed', () => {
    expect(diffEditableValues(initial, initial)).toEqual({});
  });

  it('includes only the fields that changed', () => {
    const next = toEditableValues(
      makeValues({ nickname: 'Bluebird', year: '1985', homeAirport: 'KJFK' }),
    );
    expect(diffEditableValues(initial, next)).toEqual({ year: 1985 });
  });

  it('includes a field cleared back to null as part of the diff', () => {
    const next = toEditableValues(makeValues({ year: '1979', homeAirport: 'KJFK' }));
    expect(diffEditableValues(initial, next)).toEqual({ nickname: null });
  });

  it('includes multiple changed fields', () => {
    const next = toEditableValues(
      makeValues({ nickname: 'Skybird', year: '1979', homeAirport: 'KBOS' }),
    );
    expect(diffEditableValues(initial, next)).toEqual({
      nickname: 'Skybird',
      home_airport: 'KBOS',
    });
  });
});
