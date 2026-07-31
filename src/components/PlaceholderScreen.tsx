import type { SFSymbol } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../utils/tokens';
import { IconSymbol } from './IconSymbol';

type Props = {
  title: string;
  message: string;
  symbol: SFSymbol;
  symbolFallback: string;
};

// Shared shell for the Story/Care/Fly placeholder screens (issue #10).
// Deliberately just an icon + title + one line of copy — no dashboard
// widgets, cards, or gamification, per CLAUDE.md's "calm over complexity"
// principle. Real per-tab content replaces this in Phases 2-4; copy here is
// a placeholder, not the final copy deck (IMPLEMENTATION_SPEC.md §5).
export function PlaceholderScreen({ title, message, symbol, symbolFallback }: Props) {
  return (
    <View style={styles.container}>
      <IconSymbol name={symbol} size={40} color={colors.graphite60} fallback={symbolFallback} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cloudWhite,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  title: {
    fontSize: typography.title2.size,
    fontWeight: typography.title2.weight,
    color: colors.graphite,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  message: {
    fontSize: typography.body.size,
    color: colors.graphite60,
    textAlign: 'center',
  },
});
