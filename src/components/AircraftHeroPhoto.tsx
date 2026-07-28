import { Image, StyleSheet, View } from 'react-native';

import { colors, radii } from '../utils/tokens';
import { IconSymbol } from './IconSymbol';

type Props = {
  photoUrl: string | null;
  registration: string;
};

// Home screen's hero photo (issue #35), per IMPLEMENTATION_SPEC.md §2 item 1
// and §3 "Hero image treatment": full-bleed, 4:3 landscape, rounded top
// corners only (20pt — `radii.hero`), soft low-opacity shadow beneath,
// identity text placed below the image, never overlaid. Falls back to a
// graphite/aluminum placeholder — never blank — when the aircraft has no
// `primary_photo_url` yet; the real empty state guiding an owner to add a
// photo is onboarding's job (IMPLEMENTATION_SPEC.md §2 step 3), not this
// display component's, per the issue's acceptance criteria.
//
// The shadow lives on this outer wrapper (not the Image itself) with the
// same top-corner radius as the photo, so the soft shadow's silhouette
// follows the rounded shape rather than the image's full rectangular
// bounds — and deliberately no `overflow: hidden` here, since clipping
// would also clip the shadow it's meant to cast.
export function AircraftHeroPhoto({ photoUrl, registration }: Props) {
  return (
    <View style={styles.shadowWrapper}>
      {photoUrl ? (
        <Image
          source={{ uri: photoUrl }}
          style={styles.photo}
          accessibilityLabel={`Photo of ${registration}`}
        />
      ) : (
        <View
          style={[styles.photo, styles.placeholder]}
          accessibilityLabel={`No photo yet for ${registration}`}
        >
          <IconSymbol name="airplane" size={48} color={colors.graphite60} fallback="✈️" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrapper: {
    borderTopLeftRadius: radii.hero,
    borderTopRightRadius: radii.hero,
    backgroundColor: colors.ivory,
    // Minimal, low-opacity shadow per IMPLEMENTATION_SPEC.md §3
    // "Elevation" — soft, only on the hero card, no heavy drop shadows.
    shadowColor: colors.graphite,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  photo: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderTopLeftRadius: radii.hero,
    borderTopRightRadius: radii.hero,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.aluminum,
  },
});
