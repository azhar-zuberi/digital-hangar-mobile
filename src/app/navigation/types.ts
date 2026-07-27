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
// AddAircraft is the "Add My Aircraft" form (issue #8, IMPLEMENTATION_SPEC.md
// §2 step 3 — required fields only: registration, manufacturer, model,
// primary photo). The onboarding choice screen that normally routes here
// ("Add My Aircraft" vs. "Find an Aircraft") is separate, concurrent scope
// (#26); until that and the no-aircraft-yet gate (#11) land, this route is
// reachable directly from Home as a temporary stand-in.
export type RootStackParamList = {
  Home: undefined;
  Hangar: NavigatorScreenParams<HangarTabParamList> | undefined;
  AddAircraft: undefined;
};
