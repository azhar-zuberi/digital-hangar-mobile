import { PlaceholderScreen } from '../../components/PlaceholderScreen';

// Stand-in for issue #8's "Add My Aircraft" form, which is being built
// concurrently in a separate branch/worktree. Registered under the
// `AddAircraft` route (src/app/navigation/types.ts) purely so #26's
// onboarding choice screen has a valid, typed destination to navigate to
// and this branch stays independently buildable/testable while #8 is in
// flight — it is not a substitute for #8's acceptance criteria.
//
// Whichever of #8/#26 merges into develop second will hit a merge conflict
// in RootNavigator.tsx / types.ts registering the same `AddAircraft` route;
// that resolution should drop this placeholder file and this registration
// in favor of #8's real form component. See #26's PR description.
export function AddAircraftPlaceholderScreen() {
  return (
    <PlaceholderScreen
      title="Add My Aircraft"
      message="The aircraft creation form will live here (issue #8)."
      symbol="airplane"
      symbolFallback="✈️"
    />
  );
}
