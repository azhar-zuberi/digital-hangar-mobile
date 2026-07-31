import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useDisplayImageUrl } from '../../../hooks/useDisplayImageUrl';
import { IMAGE_BUCKETS } from '../../../services/imageUpload';
import { colors, radii, spacing, typography } from '../../../utils/tokens';
import type { HangarActivityItem } from '../hangarActivity';

const THUMBNAIL_SIZE = 48;

function CardThumbnail({ storagePath }: { storagePath: string }) {
  // TODO(Phase 3/4): storagePath only ever comes from timeline_photos
  // (IMAGE_BUCKETS.timeline) today since HangarActivityItem.kind is always
  // 'timeline' in Phase 2 — once squawk/flight photo slices exist, branch
  // on the item's kind here to pick the matching bucket
  // (IMAGE_BUCKETS.flight, etc).
  const { data: url } = useDisplayImageUrl(IMAGE_BUCKETS.timeline, storagePath, {
    width: THUMBNAIL_SIZE * 2,
    height: THUMBNAIL_SIZE * 2,
    resize: 'cover',
  });

  if (!url) {
    return <View style={styles.thumbnailFallback} />;
  }

  return <Image source={{ uri: url }} style={styles.thumbnail} accessibilityIgnoresInvertColors />;
}

type Props = {
  item: HangarActivityItem;
  /** Pre-formatted relative time string (see relativeTime.ts) — computed by
   * the caller rather than in here so the card stays a pure render of
   * whatever it's given. */
  relativeTime: string;
  onPress: () => void;
};

/** One row of the Home screen's Recent Hangar Activity feed
 * (IMPLEMENTATION_SPEC.md §2 item 4): type badge, title, relative
 * timestamp, and a thumbnail of the item's first photo if present. Renders
 * any HangarActivityItem regardless of `kind` — nothing here is
 * timeline-specific, so Phase 3/4's squawk/flight items render through the
 * same card once RecentHangarActivity.tsx starts passing them in. */
export function HangarActivityCard({ item, relativeTime, onPress }: Props) {
  const isHighlighted = item.badgeVariant === 'highlight';

  return (
    <Pressable
      onPress={onPress}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={item.title}
    >
      <View style={[styles.badge, isHighlighted ? styles.badgeHighlight : styles.badgeDefault]}>
        <Text
          style={[
            styles.badgeText,
            isHighlighted ? styles.badgeTextHighlight : styles.badgeTextDefault,
          ]}
        >
          {item.badgeLabel}
        </Text>
      </View>

      <View style={styles.textColumn}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.date}>{relativeTime}</Text>
      </View>

      {item.thumbnailStoragePath ? (
        <CardThumbnail storagePath={item.thumbnailStoragePath} />
      ) : (
        <View style={styles.thumbnailFallback} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.control,
  },
  badgeDefault: {
    backgroundColor: colors.graphite12,
  },
  badgeHighlight: {
    backgroundColor: colors.skyBlue,
  },
  badgeText: {
    fontSize: typography.caption.size,
    fontWeight: '600',
  },
  badgeTextDefault: {
    color: colors.graphite,
  },
  badgeTextHighlight: {
    color: colors.cloudWhite,
  },
  textColumn: {
    flex: 1,
  },
  title: {
    fontSize: typography.body.size,
    color: colors.graphite,
  },
  date: {
    marginTop: 2,
    fontSize: typography.caption.size,
    color: colors.graphite60,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: radii.control,
    backgroundColor: colors.graphite12,
  },
  thumbnailFallback: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: radii.control,
    backgroundColor: colors.graphite12,
  },
});
