import { AuthView } from '@clerk/expo/native';

// Onboarding step 1 per IMPLEMENTATION_SPEC.md §2: "Launch → Sign in with
// Apple / Google." AuthView (Clerk's prebuilt native auth UI — SwiftUI on
// iOS, Jetpack Compose on Android; see docs/clerk-migration-plan.md and
// clerk-vs-cognito-comparison.md) replaces the hand-built Apple/Google
// button screen. Session state still flows through the JS SDK, so App.tsx's
// RootGate (useAuth) unmounts this screen the moment sign-in completes —
// no manual navigation needed here.
//
// isDismissible={false}: per the TDD, sign-in is required before entering
// the app (open app → choose provider → OAuth → create profile), not an
// optional/dismissible step, so no dismiss affordance should appear.
export function SignInScreen() {
  return <AuthView mode="signInOrUp" isDismissible={false} />;
}
