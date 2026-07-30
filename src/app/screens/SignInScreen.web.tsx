import { SignIn } from '@clerk/expo/web';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '../../utils/tokens';

// Web counterpart to SignInScreen.tsx, picked automatically by Metro's
// platform-extension resolution (`expo start --web`). Clerk's <SignIn />
// (routing="virtual" by default) handles both sign-in and sign-up in one
// component — same "signInOrUp" shape as the native AuthView, and matches
// this app's single unified sign-in screen (no separate sign-up route
// exists to mirror with <SignUp />). This is a dev-only experiment surface
// per clerk-vs-cognito-comparison.md, not a shipped web app: no styling
// beyond Clerk's own defaults.
export function SignInScreen() {
  return (
    <View style={styles.container}>
      <SignIn />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ivory,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
});
