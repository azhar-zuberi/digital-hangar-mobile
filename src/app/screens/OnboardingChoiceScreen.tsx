import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../utils/tokens';
import type { RootStackParamList } from '../navigation/types';

// Onboarding step 2 per IMPLEMENTATION_SPEC.md §2: after a first sign-in
// with no aircraft yet, the owner chooses between adding their own aircraft
// (issue #8's form, reached here via the `AddAircraft` route) or finding an
// existing one to browse (issue #26, this feature's search flow). Copy
// pulls the onboarding empty-state lines verbatim from
// IMPLEMENTATION_SPEC.md §2 / docs/BRAND.md §17 voice guidance, rather than
// inventing new copy for this screen.
//
// Showing this screen automatically when the signed-in user has zero
// aircraft is issue #11's explicit scope ("Home gating: redirect to
// onboarding when user has no aircraft") — not wired up here, same as how
// issue #10 left Home reachable without building that gate. See
// RootNavigator.tsx.
type Props = NativeStackScreenProps<RootStackParamList, 'OnboardingChoice'>;

export function OnboardingChoiceScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <Text style={styles.title} accessibilityRole="header">
          This is where your airplane lives.
        </Text>
        <Text style={styles.subtitle}>Your first flight together is waiting.</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add My Aircraft"
          onPress={() => navigation.navigate('AddAircraft')}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Add My Aircraft</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Find an Aircraft"
          onPress={() => navigation.navigate('FindAircraft')}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>Find an Aircraft</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cloudWhite,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  heading: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  title: {
    fontSize: typography.title1.size,
    fontWeight: typography.title1.weight,
    color: colors.graphite,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.body.size,
    color: colors.graphite60,
    textAlign: 'center',
  },
  actions: {
    gap: spacing.md,
  },
  primaryButton: {
    paddingVertical: spacing.md,
    borderRadius: radii.control,
    backgroundColor: colors.aviationBlue,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: typography.body.size,
    fontWeight: '600',
    color: colors.cloudWhite,
  },
  secondaryButton: {
    paddingVertical: spacing.md,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.aviationBlue,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: typography.body.size,
    fontWeight: '600',
    color: colors.aviationBlue,
  },
});
