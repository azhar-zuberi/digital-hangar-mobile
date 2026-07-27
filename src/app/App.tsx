import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useSession } from '../features/auth/session';
import { queryClient } from '../services/queryClient';
import { colors } from '../utils/tokens';
import { RootNavigator } from './navigation/RootNavigator';
import { SignInScreen } from './screens/SignInScreen';

// Root component. Wires up app-wide providers — TanStack Query for server
// state (IMPLEMENTATION_SPEC.md §4) and react-native-safe-area-context for
// the nav shell (issue #10) — and gates between the sign-in screen
// (issues #3/#4) and the Home / Story / Care / Fly nav shell based on
// whether a Supabase Auth session exists.
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <RootGate />
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

// Dev-only escape hatch so the post-sign-in app (nav shell, future screens)
// can be previewed on `expo start --web`, where Apple/Google sign-in have no
// web implementation (see google_signin_free_tier_limits memory). Gated on
// __DEV__ so it can never be true in a production build, regardless of env.
const SKIP_AUTH_FOR_DEV = __DEV__ && process.env.EXPO_PUBLIC_SKIP_AUTH === '1';

function RootGate() {
  const { data: session, isLoading } = useSession();

  if (SKIP_AUTH_FOR_DEV) {
    return <RootNavigator />;
  }

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.brass} />
      </View>
    );
  }

  return session ? <RootNavigator /> : <SignInScreen />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.ivory,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
