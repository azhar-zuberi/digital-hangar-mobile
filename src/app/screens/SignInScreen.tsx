import { AuthView } from '@clerk/expo/native';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../utils/tokens';

// Onboarding step 1 per IMPLEMENTATION_SPEC.md §2: "Launch → Sign in with
// Apple / Google." Two-part flow reconciling Clerk's prebuilt AuthView (see
// docs/clerk-migration-plan.md) with brand-design-direction.md v1.1 §22's
// Sign-In Experience direction:
//
// 1. SignInHero (below) — the full-bleed, brand-carrying "first handshake"
//    §22 calls for: Aviation Blue anchor, brand mark + tagline, pill CTAs,
//    and an equal-weight "New here?" line. This is a plain RN screen we own,
//    so it can match the brand direction exactly.
// 2. AuthView — Clerk's native, prebuilt auth UI (SwiftUI on iOS, Jetpack
//    Compose on Android). It only accepts a `logo`/`logoMaxHeight` override,
//    not layout, imagery, or button copy (see @clerk/expo's AuthView.types),
//    so it cannot itself be styled into §22's full-bleed hero — that's why
//    it's presented as a second step from the hero rather than styled
//    in place.
//
// Known gap: AuthView has no prop to preselect a provider, so both the
// "Continue with Apple" and "Continue with Google" pills below open the same
// AuthView, which then shows its own Apple/Google choice again. Flagged as a
// UX rough edge to revisit if Clerk adds provider preselection, not solved
// here by re-implementing OAuth by hand.
//
// Hero background is solid Aviation Blue rather than aircraft/hangar
// photography — no such photo asset exists in assets/ yet, and Brand doc §11
// requires real owner-provided photography, not stock imagery. v1.1 §14
// explicitly allows Aviation Blue as the anchor tone on its own, so this is
// the documented fallback, not a placeholder to "fix later" with a stock
// photo. Swap in a real hero photo (ImageBackground) once one exists.
//
// isDismissible on AuthView (not false, unlike the previous single-screen
// version): sign-in is still required before entering the app overall — the
// hero screen is the mandatory first step — but backing out of the native
// AuthView now just returns to the hero rather than needing to be
// impossible to leave.
export function SignInScreen() {
  const [showAuthView, setShowAuthView] = useState(false);

  if (showAuthView) {
    return <AuthView mode="signInOrUp" isDismissible onDismiss={() => setShowAuthView(false)} />;
  }

  return <SignInHero onContinue={() => setShowAuthView(true)} />;
}

function SignInHero({ onContinue }: { onContinue: () => void }) {
  return (
    <View style={styles.hero}>
      <View style={styles.brandBlock}>
        <Image
          source={require('../../../assets/icon.png')}
          style={styles.brandMark}
          accessibilityLabel="Digital Hangar"
        />
        <Text style={styles.tagline}>Your aircraft. Your story. Your home.</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={onContinue}
          style={styles.pillButton}
          accessibilityRole="button"
          accessibilityLabel="Continue with Apple"
        >
          <Text style={styles.pillButtonText}>Continue with Apple</Text>
        </Pressable>
        <Pressable
          onPress={onContinue}
          style={styles.pillButton}
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
        >
          <Text style={styles.pillButtonText}>Continue with Google</Text>
        </Pressable>

        <Pressable
          onPress={onContinue}
          style={styles.createHangar}
          accessibilityRole="button"
          accessibilityLabel="New here? Create your hangar"
        >
          <Text style={styles.createHangarText}>New here? Create your hangar.</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    flex: 1,
    backgroundColor: colors.aviationBlue,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.huge,
    paddingBottom: spacing.xxl,
  },
  brandBlock: {
    alignItems: 'center',
    marginTop: spacing.xxxl,
  },
  brandMark: {
    width: 72,
    height: 72,
    borderRadius: radii.card,
  },
  tagline: {
    marginTop: spacing.lg,
    fontSize: typography.title2.size,
    fontWeight: typography.title2.weight,
    color: colors.cloudWhite,
    textAlign: 'center',
  },
  actions: {
    gap: spacing.md,
  },
  pillButton: {
    paddingVertical: spacing.md,
    borderRadius: radii.hero,
    backgroundColor: colors.cloudWhite,
    alignItems: 'center',
  },
  pillButtonText: {
    fontSize: typography.body.size,
    fontWeight: '600',
    color: colors.aviationBlue,
  },
  createHangar: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  createHangarText: {
    fontSize: typography.body.size,
    fontWeight: '600',
    color: colors.cloudWhite,
  },
});
