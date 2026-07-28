import {
  firstInvalidField,
  isFutureDate,
  toDateString,
  validateTimelineEntryForm,
  type TimelineEntryFormValues,
} from '../timelineValidation';

const baseValues: TimelineEntryFormValues = {
  type: 'memory',
  title: 'First solo flight',
  description: '',
  eventDate: new Date(2024, 5, 1), // June 1, 2024
  photoUris: [],
};

describe('toDateString', () => {
  it('formats a local date as YYYY-MM-DD without UTC drift', () => {
    // Late-night local time near a UTC day boundary — toISOString() would
    // shift this to the next day in some timezones; toDateString must not.
    expect(toDateString(new Date(2024, 0, 5))).toBe('2024-01-05');
    expect(toDateString(new Date(2024, 11, 31))).toBe('2024-12-31');
  });

  it('pads single-digit months and days', () => {
    expect(toDateString(new Date(2024, 0, 1))).toBe('2024-01-01');
  });
});

describe('isFutureDate', () => {
  const today = new Date(2026, 6, 27); // 2026-07-27

  it('is false for today', () => {
    expect(isFutureDate(new Date(2026, 6, 27), today)).toBe(false);
  });

  it('is false for a date in the past', () => {
    expect(isFutureDate(new Date(2026, 6, 26), today)).toBe(false);
  });

  it('is true for a date in the future', () => {
    expect(isFutureDate(new Date(2026, 6, 28), today)).toBe(true);
  });

  it('ignores time-of-day — earlier today is never future', () => {
    const laterToday = new Date(2026, 6, 27, 23, 59);
    expect(isFutureDate(new Date(2026, 6, 27, 0, 0), laterToday)).toBe(false);
  });
});

describe('validateTimelineEntryForm', () => {
  const today = new Date(2026, 6, 27);

  it('passes for valid values', () => {
    expect(validateTimelineEntryForm(baseValues, today)).toEqual({});
  });

  it('requires a title', () => {
    const errors = validateTimelineEntryForm({ ...baseValues, title: '' }, today);
    expect(errors.title).toBeDefined();
  });

  it('rejects a whitespace-only title', () => {
    const errors = validateTimelineEntryForm({ ...baseValues, title: '   ' }, today);
    expect(errors.title).toBeDefined();
  });

  it('rejects a future event date, per the "cannot be in the future" AC', () => {
    const errors = validateTimelineEntryForm(
      { ...baseValues, eventDate: new Date(2026, 6, 28) },
      today,
    );
    expect(errors.eventDate).toBeDefined();
  });

  it("accepts today's date", () => {
    const errors = validateTimelineEntryForm({ ...baseValues, eventDate: today }, today);
    expect(errors.eventDate).toBeUndefined();
  });

  it('reports both errors when title and date are both invalid', () => {
    const errors = validateTimelineEntryForm(
      { ...baseValues, title: '', eventDate: new Date(2026, 6, 28) },
      today,
    );
    expect(errors.title).toBeDefined();
    expect(errors.eventDate).toBeDefined();
  });
});

describe('firstInvalidField', () => {
  it('returns title before eventDate when both are invalid', () => {
    expect(firstInvalidField({ title: 'required', eventDate: 'future' })).toBe('title');
  });

  it('returns eventDate when only it is invalid', () => {
    expect(firstInvalidField({ eventDate: 'future' })).toBe('eventDate');
  });

  it('returns null when there are no errors', () => {
    expect(firstInvalidField({})).toBeNull();
  });
});
