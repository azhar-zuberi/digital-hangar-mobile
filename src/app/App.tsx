import { QueryClientProvider } from '@tanstack/react-query';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useSession } from '../features/auth/session';
import { queryClient } from '../services/queryClient';
import { colors } from '../utils/tokens';
import { HomeScreen } from './screens/HomeScreen';
import { SignInScreen } from './screens/SignInScreen';

// Root component. Real tab navigation (Story / Care / Fly) is added in a
// later Phase 1 issue — for now this wires up app-wide providers (TanStack
// Query for server state, per IMPLEMENTATION_SPEC.md §4) and gates between
// the sign-in screen (issues #3/#4) and the placeholder Home screen based on
// whether a Supabase Auth session exists.
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootGate />
    </QueryClientProvider>
  );
}

function RootGate() {
  const { data: session, isLoading } = useSession();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.brass} />
      </View>
    );
  }

  return session ? <HomeScreen /> : <SignInScreen />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.ivory,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
