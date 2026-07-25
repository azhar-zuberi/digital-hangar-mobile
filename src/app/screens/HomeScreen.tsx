import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { signOut } from '../../features/auth/signOut';
import { colors, spacing, typography } from '../../utils/tokens';

// Placeholder screen for issue #1 (project scaffold). Real navigation
// (Story / Care / Fly tabs) and the "Add My Aircraft" gate land in later
// Phase 1 issues per ADDENDUM.md §C.
//
// The "Sign out" link here is a stand-in for issue #3/#4's sign-out
// requirement. Its real home is Profile/Settings (IMPLEMENTATION_SPEC.md
// §2), which doesn't exist yet — this is the smallest way to make sign-out
// reachable now without building that screen early.
export function HomeScreen() {
  const handleSignOut = () => {
    // Best-effort: signOut() clears the local Supabase session either way,
    // so there's nothing actionable to surface if the network call fails.
    signOut().catch(() => {});
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Digital Hangar</Text>
      <Text style={styles.subtitle}>Your aircraft&apos;s digital home is on its way.</Text>
      <Pressable onPress={handleSignOut} style={styles.signOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ivory,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: typography.title1.size,
    fontWeight: typography.title1.weight,
    color: colors.graphite,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: typography.body.size,
    color: colors.graphite60,
    textAlign: 'center',
  },
  signOut: {
    marginTop: spacing.xxl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  signOutText: {
    fontSize: typography.caption.size,
    color: colors.brass,
  },
});
