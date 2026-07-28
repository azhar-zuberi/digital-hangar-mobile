import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../../utils/tokens';
import { RECENT_ACTIVITY_LIMIT } from '../useRecentHangarActivity';
import { mergeHangarActivity, type HangarActivityItem } from '../hangarActivity';
import { formatRelativeEventDate } from '../relativeTime';
import { HangarActivityCard } from './HangarActivityCard';

type Props = {
  timelineItems: HangarActivityItem[];
  // TODO(Phase 3): pass the squawks slice here once useRecentSquawks()
  // exists — open (or open + recently resolved) squawks mapped to
  // HangarActivityItems with kind: 'squawk'. Leaving this prop populated
  // is the only change Phase 3 needs on this component; the merge, sort,
  // and rendering below already handle any kind.
  squawkItems?: HangarActivityItem[];
  // TODO(Phase 4): pass the flights slice here once useRecentFlights()
  // exists — see squawkItems' note above, same shape for kind: 'flight'.
  flightItems?: HangarActivityItem[];
  isLoading: boolean;
  isError: boolean;
  onPressItem: (item: HangarActivityItem) => void;
};

/**
 * Home screen's "Recent Hangar Activity" section
 * (IMPLEMENTATION_SPEC.md §2 item 4): a chronological feed of the aircraft's
 * latest timeline/squawks/flights, most recent first. Phase 2 (issue #38)
 * wires the timeline slice (memory/milestone) end to end; squawks (Phase 3)
 * and flights (Phase 4) are accepted as separate slice props so those
 * phases can merge their own data in without restructuring this component
 * — see mergeHangarActivity (hangarActivity.ts) for the shared sort/cap
 * logic every slice goes through.
 */
export function RecentHangarActivity({
  timelineItems,
  squawkItems = [],
  flightItems = [],
  isLoading,
  isError,
  onPressItem,
}: Props) {
  const items = mergeHangarActivity(
    { timelineItems, squawkItems, flightItems },
    RECENT_ACTIVITY_LIMIT,
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Recent Hangar Activity</Text>

      {isLoading ? (
        <ActivityIndicator color={colors.brass} style={styles.centered} />
      ) : isError ? (
        <Text style={styles.message}>Recent activity couldn&apos;t load just now.</Text>
      ) : items.length === 0 ? (
        <Text style={styles.message}>
          Your aircraft&apos;s story starts here. Add a memory or flight to get started.
        </Text>
      ) : (
        <View style={styles.list}>
          {items.map((item) => (
            <HangarActivityCard
              key={item.id}
              item={item}
              relativeTime={formatRelativeEventDate(item.eventDate)}
              onPress={() => onPressItem(item)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xl,
  },
  heading: {
    fontSize: typography.title2.size,
    fontWeight: typography.title2.weight,
    color: colors.graphite,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  list: {
    // No dividers/elevation per BRAND.md's "calm over complexity" —
    // spacing alone separates cards, matching TimelineEntryCard's list.
    gap: spacing.xs,
  },
  centered: {
    marginTop: spacing.md,
  },
  message: {
    marginHorizontal: spacing.lg,
    fontSize: typography.body.size,
    color: colors.graphite60,
  },
});
