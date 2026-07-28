import type { NavigatorScreenParams } from '@react-navigation/native';

// Story / Care / Fly per CLAUDE.md's Product Principles and
// BRAND.md §18 nav IA. Community is deliberately absent — its placement is
// TBD per IMPLEMENTATION_SPEC.md §2 and out of scope until Phase 5 (#16).
//
// Story's optional `scrollToEntryId` param lets AddTimelineEntryScreen
// (issue #36) hand back which freshly-created entry the list should scroll
// to on success, per IMPLEMENTATION_SPEC.md §2's add-flow acceptance
// criteria ("refresh list, scroll to new entry") — see StoryScreen.tsx.
export type HangarTabParamList = {
  Story: { scrollToEntryId?: string } | undefined;
  Care: undefined;
  Fly: undefined;
};

// Home ("My Digital Hangar") sits above the Hangar tab navigator as the
// entry point (IMPLEMENTATION_SPEC.md §2). It's the initial stack route;
// the tab navigator is pushed on top of it.
//
// OnboardingChoice / AddAircraft / FindAircraft / AircraftProfile are the
// onboarding screens (IMPLEMENTATION_SPEC.md §2 steps 2, 3, and 5) from
// issues #26 (choice/search/profile) and #8 (the Add My Aircraft form
// itself). Issue #11 routes a signed-in user with zero `aircraft_memberships`
// rows to OnboardingChoice automatically as the stack's initial route — see
// RootNavigator.tsx's `decideHomeGate` usage. `AddAircraft` is also reachable
// from OnboardingChoice's "Add My Aircraft" button.
// TimelineEntryDetail / AddTimelineEntry (issue #36) back the Story tab's
// detail view and add flow. Both are registered on the root stack, not
// nested inside HangarTabs, so they get a native back button/gesture over
// the tab bar the same way AircraftProfile/AddAircraft do — reached from
// StoryScreen via `navigation.getParent()?.navigate(...)`, same pattern as
// HomeHeaderButton's `getParent()?.goBack()`.
export type RootStackParamList = {
  Home: undefined;
  Hangar: NavigatorScreenParams<HangarTabParamList> | undefined;
  OnboardingChoice: undefined;
  AddAircraft: undefined;
  FindAircraft: undefined;
  AircraftProfile: { aircraftId: string };
  TimelineEntryDetail: { entryId: string };
  AddTimelineEntry: { aircraftId: string };
};
