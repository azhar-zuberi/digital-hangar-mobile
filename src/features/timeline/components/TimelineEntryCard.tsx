import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '../../../components/IconSymbol';
import { useDisplayImageUrl } from '../../../hooks/useDisplayImageUrl';
import { IMAGE_BUCKETS } from '../../../services/imageUpload';
import { colors, radii, spacing, typography } from '../../../utils/tokens';
import type { TimelineEntry } from '../timelineApi';

const THUMBNAIL_SIZE = 56;

/** Formats the 'YYYY-MM-DD' event_date string for display without going
 * through `new Date(...)` (see timelineApi.ts's TimelineEntry.event_date
 * comment on the UTC-parsing pitfall that would introduce). */
function formatEventDate(eventDate: string): string {
  const [year, month, day] = eventDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

/** First non-empty line of a description, for the card's secondary line
 * per IMPLEMENTATION_SPEC.md §2 ("first line of description if present"). */
function firstLine(description: string | null): string | null {
  if (!description) return null;
  const line = description.split('\n').find((candidate) => candidate.trim().length > 0);
  return line?.trim() ?? null;
}

function CardThumbnail({ storagePath }: { storagePath: string }) {
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
  entry: TimelineEntry;
  onPress: () => void;
};

/** One row of the Story list per IMPLEMENTATION_SPEC.md §2: title,
 * description's first line, event date, and a thumbnail of the first
 * photo (if any). */
export function TimelineEntryCard({ entry, onPress }: Props) {
  const description = firstLine(entry.description);
  const firstPhoto = entry.photos[0];

  return (
    <Pressable
      onPress={onPress}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={entry.title}
    >
      {entry.type === 'milestone' && (
        <View style={styles.milestoneBadge}>
          <IconSymbol name="star.fill" size={10} color={colors.brass} fallback="★" />
        </View>
      )}

      <View style={styles.textColumn}>
        <Text style={styles.title} numberOfLines={1}>
          {entry.title}
        </Text>
        {description && (
          <Text style={styles.description} numberOfLines={1}>
            {description}
          </Text>
        )}
        <Text style={styles.date}>{formatEventDate(entry.event_date)}</Text>
      </View>

      {firstPhoto ? (
        <CardThumbnail storagePath={firstPhoto.storage_path} />
      ) : (
        <View style={styles.thumbnailFallback}>
          <IconSymbol name="photo" size={20} color={colors.graphite60} fallback="🖼" />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  milestoneBadge: {
    position: 'absolute',
    left: spacing.sm,
    top: spacing.sm,
  },
  textColumn: {
    flex: 1,
  },
  title: {
    fontSize: typography.body.size,
    color: colors.graphite,
  },
  description: {
    marginTop: 2,
    fontSize: typography.caption.size,
    color: colors.graphite60,
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
    backgroundColor: colors.aluminum,
  },
  thumbnailFallback: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: radii.control,
    backgroundColor: colors.aluminum,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
