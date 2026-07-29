import { ClerkProvider, useAuth, useUser } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useEnsureUserProfile } from '../features/auth/useEnsureUserProfile';
import { queryClient } from '../services/queryClient';
import { colors } from '../utils/tokens';
import { RootNavigator } from './navigation/RootNavigator';
import { SignInScreen } from './screens/SignInScreen';

// Values come from the environment, never hardcoded — see .env.example.
// Warn-not-throw on a missing key mirrors src/services/supabaseClient.ts's
// precedent, so `npm test`/CI (no .env, which is gitignored) and a bare
// `expo start --web` preview can still boot; a real sign-in attempt without
// a real key fails loudly from ClerkProvider/Clerk's API instead.
const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!clerkPublishableKey) {
  console.warn(
    'Clerk publishable key is not set. Copy .env.example to .env and fill in your Clerk project credentials.',
  );
}

// Root component. Wires up app-wide providers — Clerk for identity (see
// docs/clerk-migration-plan.md; Supabase remains the database/storage/RLS
// layer, see src/services/supabaseClient.ts), TanStack Query for server
// state (IMPLEMENTATION_SPEC.md §4), and react-native-safe-area-context for
// the nav shell (issue #10) — and gates between the sign-in screen
// (issues #3/#4) and the Home / Story / Care / Fly nav shell based on
// whether a Clerk session exists.
export default function App() {
  return (
    <ClerkProvider publishableKey={clerkPublishableKey ?? ''} tokenCache={tokenCache}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <RootGate />
          <StatusBar style="dark" />
        </SafeAreaProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

// Dev-only escape hatch so the post-sign-in app (nav shell, future screens)
// can be previewed on `expo start --web`, where Apple/Google sign-in have no
// web implementation (see google_signin_free_tier_limits memory). Gated on
// __DEV__ so it can never be true in a production build, regardless of env.
const SKIP_AUTH_FOR_DEV = __DEV__ && process.env.EXPO_PUBLIC_SKIP_AUTH === '1';

function RootGate() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  // Only enabled once signed in, so this never fires for a signed-out user.
  const ensureProfile = useEnsureUserProfile(isSignedIn ? user : null);

  if (SKIP_AUTH_FOR_DEV) {
    return <RootNavigator />;
  }

  if (!isLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.brass} />
      </View>
    );
  }

  if (!isSignedIn) {
    return <SignInScreen />;
  }

  // Screens behind this assume a public.users row exists for the current
  // user (see ensureUserProfile.ts) — wait for it before rendering them.
  // Fail open on error rather than trap the user on an infinite spinner if
  // the upsert can't complete (e.g. no network on first launch); most of
  // the app still works without a profile row, only aircraft/timeline
  // creation would fail loudly on their own foreign-key check.
  if (ensureProfile.isPending) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.brass} />
      </View>
    );
  }

  return <RootNavigator />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.ivory,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
