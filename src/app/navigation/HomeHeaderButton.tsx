import { useNavigation } from '@react-navigation/native';
import { Pressable, StyleSheet } from 'react-native';

import { IconSymbol } from '../../components/IconSymbol';
import { colors, spacing } from '../../utils/tokens';

// Lets any Story/Care/Fly tab screen reach back to Home ("My Digital
// Hangar"), the entry point that sits above the tab navigator per
// IMPLEMENTATION_SPEC.md §2 ("reachable as the entry point above/alongside
// the tabs"). Deliberately targets the parent (root stack) navigator rather
// than calling a plain goBack() here: the bottom-tab navigator keeps its
// own visited-tab history, so an unqualified goBack() pops that history
// (e.g. Fly → Story) instead of leaving the tab navigator — confirmed via
// expo start --web while verifying this screen.
export function HomeHeaderButton() {
  const navigation = useNavigation();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back to My Digital Hangar"
      onPress={() => navigation.getParent()?.goBack()}
      style={styles.button}
      hitSlop={8}
    >
      <IconSymbol name="house" size={22} color={colors.graphite} fallback="⌂" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
