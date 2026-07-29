import { supabase } from '../../../services/supabaseClient';
import { ensureUserProfile, type ClerkProfileSource } from '../ensureUserProfile';

jest.mock('../../../services/supabaseClient', () => ({
  supabase: { from: jest.fn() },
}));

const mockedFrom = supabase.from as jest.Mock;

function queryBuilder(result: { error: unknown }) {
  return {
    upsert: jest.fn(() => Promise.resolve(result)),
  };
}

function clerkUser(overrides: Partial<ClerkProfileSource> = {}): ClerkProfileSource {
  return {
    id: 'user_clerk_1',
    fullName: null,
    firstName: null,
    imageUrl: null,
    primaryEmailAddress: null,
    ...overrides,
  };
}

describe('ensureUserProfile', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('upserts on the users table, ignoring an existing row rather than overwriting it', async () => {
    const builder = queryBuilder({ error: null });
    mockedFrom.mockReturnValue(builder);

    await ensureUserProfile(clerkUser({ fullName: 'Alice Owner' }));

    expect(mockedFrom).toHaveBeenCalledWith('users');
    expect(builder.upsert).toHaveBeenCalledWith(
      { id: 'user_clerk_1', display_name: 'Alice Owner', profile_photo_url: null },
      { onConflict: 'id', ignoreDuplicates: true },
    );
  });

  it('falls back to firstName when fullName is unavailable', async () => {
    const builder = queryBuilder({ error: null });
    mockedFrom.mockReturnValue(builder);

    await ensureUserProfile(clerkUser({ fullName: null, firstName: 'Alice' }));

    expect(builder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ display_name: 'Alice' }),
      expect.anything(),
    );
  });

  it('falls back to the email local part when no name is available', async () => {
    const builder = queryBuilder({ error: null });
    mockedFrom.mockReturnValue(builder);

    await ensureUserProfile(
      clerkUser({ primaryEmailAddress: { emailAddress: 'bob.test@example.com' } }),
    );

    expect(builder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ display_name: 'bob.test' }),
      expect.anything(),
    );
  });

  it('falls back to a generic placeholder when nothing else is available', async () => {
    const builder = queryBuilder({ error: null });
    mockedFrom.mockReturnValue(builder);

    await ensureUserProfile(clerkUser());

    expect(builder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ display_name: 'New Member' }),
      expect.anything(),
    );
  });

  it('passes through the Clerk profile image url', async () => {
    const builder = queryBuilder({ error: null });
    mockedFrom.mockReturnValue(builder);

    await ensureUserProfile(clerkUser({ imageUrl: 'https://img.clerk.com/photo.jpg' }));

    expect(builder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ profile_photo_url: 'https://img.clerk.com/photo.jpg' }),
      expect.anything(),
    );
  });

  it('throws on a query error', async () => {
    const builder = queryBuilder({ error: new Error('boom') });
    mockedFrom.mockReturnValue(builder);

    await expect(ensureUserProfile(clerkUser())).rejects.toThrow('boom');
  });
});
