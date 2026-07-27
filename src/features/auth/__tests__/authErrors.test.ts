import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';

import { AUTH_ERROR_COPY, classifyAuthError } from '../authErrors';

// Covers the sign-in error classification used by useSocialSignIn.ts to pick
// calm, non-alarming copy per docs/BRAND.md §17. This is the kind of small,
// high-value piece of Phase 1 logic issue #12 asks for as the example unit
// test: pure, no native module dependency, and worth protecting from
// regressions since a wrong classification means the wrong (or no) message
// on a real sign-in failure.
describe('classifyAuthError', () => {
  it('recognizes the Apple "user cancelled" code as a cancellation, not an error', () => {
    expect(classifyAuthError({ code: 'ERR_REQUEST_CANCELED' })).toBe('cancelled');
  });

  it('does not treat an unrelated error code as a cancellation', () => {
    expect(classifyAuthError({ code: 'ERR_SOMETHING_ELSE' })).toBe('provider');
  });

  it('classifies a retryable Supabase fetch error as a network error', () => {
    const error = new AuthRetryableFetchError('Failed to fetch', 0);
    expect(classifyAuthError(error)).toBe('network');
  });

  it('classifies a generic error whose message mentions the network as a network error', () => {
    expect(classifyAuthError(new Error('Network request failed'))).toBe('network');
    expect(classifyAuthError(new Error('fetch failed'))).toBe('network');
    expect(classifyAuthError(new Error('device appears to be offline'))).toBe('network');
  });

  it('classifies a Supabase auth API error as a provider error', () => {
    const error = new AuthApiError('invalid_grant', 400, 'invalid_grant');
    expect(classifyAuthError(error)).toBe('provider');
  });

  it('falls back to a provider error for anything unrecognized', () => {
    expect(classifyAuthError(undefined)).toBe('provider');
    expect(classifyAuthError('a plain string')).toBe('provider');
    expect(classifyAuthError(new Error('unrelated failure'))).toBe('provider');
  });

  it('has calm, non-alarming copy for every non-cancellation reason (no "Error:", no exclamation marks)', () => {
    for (const message of Object.values(AUTH_ERROR_COPY)) {
      expect(message).not.toMatch(/error:/i);
      expect(message).not.toContain('!');
    }
  });
});
