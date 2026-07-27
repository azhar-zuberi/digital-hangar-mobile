import type { NavigatorScreenParams } from '@react-navigation/native';

// Story / Care / Fly per CLAUDE.md's Product Principles and
// BRAND.md §18 nav IA. Community is deliberately absent — its placement is
// TBD per IMPLEMENTATION_SPEC.md §2 and out of scope until Phase 5 (#16).
export type HangarTabParamList = {
  Story: undefined;
  Care: undefined;
  Fly: undefined;
};

// Home ("My Digital Hangar") sits above the Hangar tab navigator as the
// entry point (IMPLEMENTATION_SPEC.md §2). It's the initial stack route;
// the tab navigator is pushed on top of it.
//
// OnboardingChoice / AddAircraft / FindAircraft / AircraftProfile are issue
// #26's onboarding screens (IMPLEMENTATION_SPEC.md §2 steps 2 and 5). The
// gate that routes a signed-in user with zero aircraft to OnboardingChoice
// automatically is issue #11's separate scope, not wired up here — see
// RootNavigator.tsx.
//
// `AddAircraft` is the navigation contract shared with issue #8 (Add My
// Aircraft form), built concurrently in a separate branch: it's the route
// OnboardingChoice's "Add My Aircraft" button navigates to, no params.
// Until #8 merges, it points at a placeholder screen — see
// RootNavigator.tsx for details on the expected merge conflict there.
export type RootStackParamList = {
  Home: undefined;
  Hangar: NavigatorScreenParams<HangarTabParamList> | undefined;
  OnboardingChoice: undefined;
  AddAircraft: undefined;
  FindAircraft: undefined;
  AircraftProfile: { aircraftId: string };
};
