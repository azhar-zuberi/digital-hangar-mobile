import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../../utils/tokens';
import type { TimelineEntryType } from '../timelineApi';

const OPTIONS: { value: TimelineEntryType; label: string }[] = [
  { value: 'memory', label: 'Memory' },
  { value: 'milestone', label: 'Milestone' },
];

type Props = {
  value: TimelineEntryType;
  onChange: (value: TimelineEntryType) => void;
};

/** Two-option segmented control for the add-entry form's type field —
 * "radio button, segmented control, or a simple dropdown" are all
 * explicitly acceptable per issue #36's implementation notes; a segmented
 * control reads calmest for a binary choice. */
export function TimelineTypePicker({ value, onChange }: Props) {
  return (
    <View style={styles.container} accessibilityRole="radiogroup">
      {OPTIONS.map((option) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.option, isSelected && styles.optionSelected]}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected, checked: isSelected }}
            accessibilityLabel={option.label}
          >
            <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.graphite12,
    overflow: 'hidden',
  },
  option: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cloudWhite,
  },
  optionSelected: {
    backgroundColor: colors.skyBlue,
  },
  optionText: {
    fontSize: typography.body.size,
    fontWeight: '600',
    color: colors.graphite,
  },
  optionTextSelected: {
    color: colors.cloudWhite,
  },
});
