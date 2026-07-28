import { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  View,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';

import { useDisplayImageUrl } from '../../../hooks/useDisplayImageUrl';
import { IMAGE_BUCKETS } from '../../../services/imageUpload';
import { colors, spacing } from '../../../utils/tokens';
import type { TimelinePhoto } from '../timelineApi';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function GalleryPhoto({ storagePath }: { storagePath: string }) {
  const { data: url, isLoading } = useDisplayImageUrl(IMAGE_BUCKETS.timeline, storagePath, {
    width: 1200,
  });

  return (
    <View style={[styles.photoContainer, { width: SCREEN_WIDTH }]}>
      {isLoading && !url && <ActivityIndicator color={colors.brass} />}
      {url && (
        <Image
          source={{ uri: url }}
          style={styles.photo}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      )}
    </View>
  );
}

type Props = {
  photos: TimelinePhoto[];
};

/** Full-width photo carousel for the entry detail view (issue #36 AC).
 * Pinch-zoom is explicitly optional in the acceptance criteria ("if native
 * view supports") and isn't built here — plain `<Image>` doesn't support it
 * without a dedicated gesture library, which is out of scope for this
 * issue. */
export function TimelinePhotoGallery({ photos }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (photos.length === 0) return null;

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(index);
  }

  return (
    <View>
      <FlatList
        data={photos}
        keyExtractor={(photo) => photo.id}
        renderItem={({ item }) => <GalleryPhoto storagePath={item.storage_path} />}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        accessibilityLabel="Photo gallery"
      />
      {photos.length > 1 && (
        <View style={styles.dots}>
          {photos.map((photo, index) => (
            <View key={photo.id} style={[styles.dot, index === activeIndex && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  photoContainer: {
    aspectRatio: 4 / 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.aluminum,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.aluminum,
  },
  dotActive: {
    backgroundColor: colors.brass,
  },
});
