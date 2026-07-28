import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, StyleSheet } from 'react-native';

import { IconSymbol } from '../../components/IconSymbol';
import { useCurrentAircraftId } from '../../features/timeline/useCurrentAircraftId';
import { colors, spacing } from '../../utils/tokens';
import type { RootStackParamList } from './types';

// Story tab's header-right "+" button (issue #36 AC: "Button on Story tab
// ... to launch add form"). Mirrors HomeHeaderButton.tsx's
// `getParent()`-to-root-stack pattern, since AddTimelineEntry is a root
// stack route, not a HangarTabs route — a plain `useNavigation()` here only
// knows the bottom-tab navigator's own routes.
//
// Renders nothing until a current aircraft id is resolved (same guard
// StoryScreen.tsx uses) — there's nothing to attribute a new entry to
// before then, and this hides the button rather than letting it navigate
// into a broken form.
export function AddTimelineEntryHeaderButton() {
  const navigation = useNavigation();
  const { data: aircraftId } = useCurrentAircraftId();

  if (!aircraftId) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add Entry"
      onPress={() =>
        navigation
          .getParent<NativeStackNavigationProp<RootStackParamList>>()
          ?.navigate('AddTimelineEntry', { aircraftId })
      }
      style={styles.button}
      hitSlop={8}
    >
      <IconSymbol name="plus" size={22} color={colors.graphite} fallback="+" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
