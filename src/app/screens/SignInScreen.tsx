import { GoogleSigninButton } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useSocialSignIn } from '../../features/auth/useSocialSignIn';
import { useWebGoogleSignIn } from '../../features/auth/useWebGoogleSignIn';
import { colors, radii, spacing, typography } from '../../utils/tokens';

const BUTTON_WIDTH = 312;
const BUTTON_HEIGHT = 48;

// Dev/test-only: `@react-native-google-signin/google-signin`'s button has no
// real web implementation (see google_signin_free_tier_limits memory), so
// `expo start --web` gets a browser-OAuth stand-in instead (useWebGoogleSignIn.ts)
// purely for exercising the real auth pipeline during development — never
// true in a production build, regardless of platform.
const IS_DEV_WEB_TEST_ENVIRONMENT = __DEV__ && Platform.OS === 'web';

// Onboarding step 1 per IMPLEMENTATION_SPEC.md §2: "Launch → Sign in with
// Apple / Google." Identity is provided by Clerk (see
// docs/clerk-migration-plan.md); Supabase remains the database/storage/RLS
// layer. The choice screen ("Add My Aircraft" / "Find an Aircraft") that
// follows a first sign-in is a separate, later Phase 1 issue — this screen's
// only job is producing a Clerk session.
export function SignInScreen() {
  const { signIn, isSigningIn, pendingProvider, errorMessage } = useSocialSignIn();
  const webSignIn = useWebGoogleSignIn();

  const isSigningInAny = isSigningIn || webSignIn.isSigningIn;
  const combinedErrorMessage = errorMessage ?? webSignIn.errorMessage;

  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <Text style={styles.title}>Digital Hangar</Text>
        <Text style={styles.subtitle}>Your aircraft&apos;s digital home is waiting.</Text>
      </View>

      <View style={styles.buttons}>
        {Platform.OS === 'ios' && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={radii.control}
            style={styles.button}
            onPress={() => signIn('apple')}
          />
        )}

        {IS_DEV_WEB_TEST_ENVIRONMENT ? (
          <Pressable
            style={styles.webTestButton}
            disabled={webSignIn.isSigningIn}
            onPress={() => webSignIn.signIn()}
          >
            <Text style={styles.webTestButtonText}>Continue with Google (browser test)</Text>
          </Pressable>
        ) : (
          <GoogleSigninButton
            size={GoogleSigninButton.Size.Wide}
            color={GoogleSigninButton.Color.Light}
            style={styles.button}
            disabled={isSigningIn}
            onPress={() => signIn('google')}
          />
        )}

        {isSigningInAny && (
          <View style={styles.progressRow}>
            <ActivityIndicator color={colors.brass} />
            <Text style={styles.progressText}>
              {pendingProvider === 'apple' ? 'Signing in with Apple…' : 'Signing in with Google…'}
            </Text>
          </View>
        )}

        {combinedErrorMessage && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{combinedErrorMessage}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ivory,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.huge,
    paddingBottom: spacing.xxl,
  },
  heading: {
    alignItems: 'center',
    marginTop: spacing.xxxl,
  },
  title: {
    fontSize: typography.hero.size,
    fontWeight: typography.hero.weight,
    color: colors.graphite,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.body.size,
    color: colors.graphite60,
    textAlign: 'center',
  },
  buttons: {
    alignItems: 'center',
    gap: spacing.md,
  },
  button: {
    width: BUTTON_WIDTH,
    height: BUTTON_HEIGHT,
  },
  webTestButton: {
    width: BUTTON_WIDTH,
    height: BUTTON_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.control,
    backgroundColor: colors.graphite,
  },
  webTestButtonText: {
    fontSize: typography.body.size,
    color: colors.ivory,
    fontWeight: '600',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  progressText: {
    fontSize: typography.caption.size,
    color: colors.graphite60,
  },
  errorBanner: {
    width: BUTTON_WIDTH,
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.card,
    backgroundColor: colors.aluminum,
  },
  errorText: {
    fontSize: typography.caption.size,
    color: colors.graphite,
    textAlign: 'center',
  },
});
