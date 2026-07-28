import { supabase } from '../../../services/supabaseClient';
import {
  fetchAircraftEditableFields,
  fetchOwnedAircraft,
  updateAircraftFields,
} from '../aircraftApi';

jest.mock('../../../services/supabaseClient', () => ({
  supabase: { from: jest.fn() },
}));

const mockedFrom = supabase.from as jest.Mock;

// Minimal stand-in for supabase-js's chainable, thenable
// PostgrestFilterBuilder: every filter method returns the same object so
// calls can be chained in any order the real code uses, and `await`ing the
// builder resolves via `then` the way `await supabase.from(...).select(...)`
// does against the real client.
function queryBuilder(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    order: jest.fn(() => builder),
    in: jest.fn(() => builder),
    update: jest.fn(() => builder),
    maybeSingle: jest.fn(() => Promise.resolve(result)),
    then: (resolve: (value: typeof result) => void) => resolve(result),
  };
  return builder;
}

// Backs Home's aircraft switcher and hero content (issue #35). Verifies the
// two-query shape documented in aircraftApi.ts: membership rows determine
// which aircraft ids and what order, the aircraft table supplies the
// display columns, and the final list preserves membership order (oldest
// first) rather than whatever order `.in()` happens to return.
describe('fetchOwnedAircraft', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns owned aircraft in membership order, not aircraft-table return order', async () => {
    const membershipsBuilder = queryBuilder({
      data: [{ aircraft_id: 'aircraft-2' }, { aircraft_id: 'aircraft-1' }],
      error: null,
    });
    // Table query intentionally returns rows in the opposite order to prove
    // the function reorders by membership, not by whatever `.in()` returns.
    const aircraftBuilder = queryBuilder({
      data: [
        { id: 'aircraft-1', registration: 'N111AA' },
        { id: 'aircraft-2', registration: 'N222BB' },
      ],
      error: null,
    });

    mockedFrom.mockImplementation((table: string) =>
      table === 'aircraft_memberships' ? membershipsBuilder : aircraftBuilder,
    );

    const result = await fetchOwnedAircraft('user-1');

    expect(result.map((a) => a.id)).toEqual(['aircraft-2', 'aircraft-1']);
    expect(membershipsBuilder.eq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('returns an empty array without querying the aircraft table when the user has no memberships', async () => {
    const membershipsBuilder = queryBuilder({ data: [], error: null });
    mockedFrom.mockImplementation((table: string) =>
      table === 'aircraft_memberships'
        ? membershipsBuilder
        : queryBuilder({ data: [], error: null }),
    );

    const result = await fetchOwnedAircraft('user-1');

    expect(result).toEqual([]);
    expect(mockedFrom).toHaveBeenCalledTimes(1);
  });

  it('drops any aircraft id with no matching row instead of throwing', async () => {
    const membershipsBuilder = queryBuilder({
      data: [{ aircraft_id: 'aircraft-missing' }, { aircraft_id: 'aircraft-1' }],
      error: null,
    });
    const aircraftBuilder = queryBuilder({
      data: [{ id: 'aircraft-1', registration: 'N111AA' }],
      error: null,
    });

    mockedFrom.mockImplementation((table: string) =>
      table === 'aircraft_memberships' ? membershipsBuilder : aircraftBuilder,
    );

    const result = await fetchOwnedAircraft('user-1');

    expect(result.map((a) => a.id)).toEqual(['aircraft-1']);
  });

  it('throws when the membership query errors', async () => {
    const membershipsBuilder = queryBuilder({ data: null, error: new Error('boom') });
    mockedFrom.mockImplementation(() => membershipsBuilder);

    await expect(fetchOwnedAircraft('user-1')).rejects.toThrow('boom');
  });
});

// Backs the optional-fields edit form (issue #37).
describe('fetchAircraftEditableFields', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('fetches the editable columns for one aircraft by id', async () => {
    const row = {
      id: 'aircraft-1',
      nickname: 'Bluebird',
      year: 1979,
      serial_number: '28-7405136',
      engine_information: 'Lycoming O-235-C1',
      home_airport: 'KJFK',
    };
    const builder = queryBuilder({ data: row, error: null });
    mockedFrom.mockReturnValue(builder);

    const result = await fetchAircraftEditableFields('aircraft-1');

    expect(mockedFrom).toHaveBeenCalledWith('aircraft');
    expect(builder.eq).toHaveBeenCalledWith('id', 'aircraft-1');
    expect(result).toEqual(row);
  });

  it('returns null when RLS hides the row (defensive — not an expected path)', async () => {
    const builder = queryBuilder({ data: null, error: null });
    mockedFrom.mockReturnValue(builder);

    const result = await fetchAircraftEditableFields('aircraft-1');

    expect(result).toBeNull();
  });

  it('throws on a query error', async () => {
    const builder = queryBuilder({ data: null, error: new Error('boom') });
    mockedFrom.mockReturnValue(builder);

    await expect(fetchAircraftEditableFields('aircraft-1')).rejects.toThrow('boom');
  });
});

describe('updateAircraftFields', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('updates only the given fields and returns the updated row', async () => {
    const updated = {
      id: 'aircraft-1',
      nickname: 'Skybird',
      year: 1979,
      serial_number: null,
      engine_information: null,
      home_airport: null,
    };
    const builder = queryBuilder({ data: updated, error: null });
    mockedFrom.mockReturnValue(builder);

    const result = await updateAircraftFields('aircraft-1', { nickname: 'Skybird' });

    expect(mockedFrom).toHaveBeenCalledWith('aircraft');
    expect(builder.update).toHaveBeenCalledWith({ nickname: 'Skybird' });
    expect(builder.eq).toHaveBeenCalledWith('id', 'aircraft-1');
    expect(result).toEqual(updated);
  });

  it('throws on a query error', async () => {
    const builder = queryBuilder({ data: null, error: new Error('boom') });
    mockedFrom.mockReturnValue(builder);

    await expect(updateAircraftFields('aircraft-1', { nickname: 'x' })).rejects.toThrow('boom');
  });

  it('throws when the update returns no row', async () => {
    const builder = queryBuilder({ data: null, error: null });
    mockedFrom.mockReturnValue(builder);

    await expect(updateAircraftFields('aircraft-1', { nickname: 'x' })).rejects.toThrow(
      'Aircraft update did not return a row.',
    );
  });
});
