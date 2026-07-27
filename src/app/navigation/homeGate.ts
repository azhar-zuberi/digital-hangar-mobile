// The Home gating guard (issue #11): a signed-in user with zero
// `aircraft_memberships` rows is routed to OnboardingChoice instead of Home.
// Extracted as a pure function, separate from RootNavigator.tsx's component
// tree, so the decision is a single, testable place (per the issue's AC)
// rather than logic inlined/duplicated across screens.
//
// Deliberately three-valued, not a boolean: while the membership check is
// in flight, RootNavigator must not guess — rendering Home and then
// redirecting (or vice versa) would flash content per CLAUDE.md's "calm
// over complexity" principle. 'loading' tells the caller to hold a neutral
// screen until the real decision is known.
export type HomeGateDecision = 'loading' | 'home' | 'onboarding';

export function decideHomeGate(params: {
  isLoading: boolean;
  hasAircraft: boolean | undefined;
}): HomeGateDecision {
  if (params.isLoading) return 'loading';
  return params.hasAircraft ? 'home' : 'onboarding';
}
