import { decideHomeGate } from '../homeGate';

// Covers the Home gating decision (issue #11) in isolation from
// RootNavigator's component tree — the pure piece of logic worth protecting
// from regressions, same rationale as authErrors.test.ts for sign-in error
// classification.
describe('decideHomeGate', () => {
  it('holds on loading while the membership check is in flight, regardless of the last known value', () => {
    expect(decideHomeGate({ isLoading: true, hasAircraft: undefined })).toBe('loading');
    expect(decideHomeGate({ isLoading: true, hasAircraft: false })).toBe('loading');
    expect(decideHomeGate({ isLoading: true, hasAircraft: true })).toBe('loading');
  });

  it('routes to onboarding once loaded with zero aircraft memberships', () => {
    expect(decideHomeGate({ isLoading: false, hasAircraft: false })).toBe('onboarding');
  });

  it('routes to onboarding if the membership flag is not yet known (defensive default)', () => {
    expect(decideHomeGate({ isLoading: false, hasAircraft: undefined })).toBe('onboarding');
  });

  it('routes to home once loaded with at least one aircraft membership', () => {
    expect(decideHomeGate({ isLoading: false, hasAircraft: true })).toBe('home');
  });
});
