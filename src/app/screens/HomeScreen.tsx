import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { signOut } from '../../features/auth/signOut';
import { colors, radii, spacing, typography } from '../../utils/tokens';
import type { RootStackParamList } from '../navigation/types';

// Placeholder for Home ("My Digital Hangar") — real content (hero photo,
// ownership snapshot, recent hangar activity per IMPLEMENTATION_SPEC.md §2)
// is out of scope for issue #10, which only needs Home reachable as the
// entry point above the Story/Care/Fly tab navigator. By the time a user
// reaches this screen, issue #11's gate (RootNavigator.tsx) has already
// confirmed they have at least one aircraft membership — a user with zero
// aircraft never lands here; they're routed to OnboardingChoice instead. The
// former "Add an aircraft" stand-in button that used to live here (added in
// #10 ahead of #11's real gate) has been removed as redundant now that the
// automatic redirect exists; "add another aircraft" for an existing owner is
// Profile/Settings scope (IMPLEMENTATION_SPEC.md §2), not Home's.
//
// The "Sign out" link here is a stand-in for issue #3/#4's sign-out
// requirement. Its real home is Profile/Settings (IMPLEMENTATION_SPEC.md
// §2), which doesn't exist yet — this is the smallest way to make sign-out
// reachable now without building that screen early.
type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const handleSignOut = () => {
    // Best-effort: signOut() clears the local Supabase session either way,
    // so there's nothing actionable to surface if the network call fails.
    signOut().catch(() => {});
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Digital Hangar</Text>
      <Text style={styles.subtitle}>Your aircraft&apos;s digital home is on its way.</Text>
      <Pressable onPress={() => navigation.navigate('Hangar')} style={styles.enter}>
        <Text style={styles.enterText}>Enter the Hangar</Text>
      </Pressable>
      <Pressable onPress={handleSignOut} style={styles.signOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
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
  enter: {
    marginTop: spacing.xxl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.control,
    backgroundColor: colors.brass,
  },
  enterText: {
    fontSize: typography.body.size,
    fontWeight: '600',
    color: colors.ivory,
  },
  signOut: {
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  signOutText: {
    fontSize: typography.caption.size,
    color: colors.brass,
  },
});
