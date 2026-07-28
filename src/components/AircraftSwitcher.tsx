import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { colors, radii, spacing, typography } from '../utils/tokens';

export type AircraftSwitcherOption = {
  id: string;
  registration: string;
};

type Props = {
  options: AircraftSwitcherOption[];
  selectedId: string;
  onSelect: (aircraftId: string) => void;
};

// Lightweight hangar switcher (issue #35 / IMPLEMENTATION_SPEC.md §2 Home
// step 5): a horizontal row of tail-number pills, deliberately not a
// prominent nav element or fleet-management picker — per CLAUDE.md's
// "aircraft first" principle, switching aircraft stays secondary to the
// currently-shown aircraft's identity above it. HomeScreen only renders this
// when the owner has more than one aircraft; selecting a pill persists as
// the new last-used aircraft via useSelectedAircraft.ts.
export function AircraftSwitcher({ options, selectedId, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {options.map((option) => {
        const isSelected = option.id === selectedId;
        return (
          <Pressable
            key={option.id}
            onPress={() => onSelect(option.id)}
            accessibilityRole="button"
            accessibilityLabel={`Switch to ${option.registration}`}
            accessibilityState={{ selected: isSelected }}
            style={[styles.pill, isSelected && styles.pillSelected]}
          >
            <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
              {option.registration}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
  },
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.control,
    backgroundColor: colors.aluminum,
  },
  pillSelected: {
    backgroundColor: colors.brass,
  },
  pillText: {
    fontSize: typography.caption.size,
    fontWeight: '600',
    color: colors.graphite,
  },
  pillTextSelected: {
    color: colors.ivory,
  },
});
