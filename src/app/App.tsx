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

function RootGate() {
  const { data: session, isLoading } = useSession();

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
