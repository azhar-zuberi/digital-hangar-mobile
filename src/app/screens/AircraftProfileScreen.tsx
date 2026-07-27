import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '../../components/IconSymbol';
import { useAircraftProfile } from '../../features/aircraft/useAircraftProfile';
import { colors, radii, spacing, typography } from '../../utils/tokens';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AircraftProfile'>;

function capitalize(value: string): string {
  return value.length > 0 ? value[0].toUpperCase() + value.slice(1) : value;
}

// Read-only Community/Public aircraft profile reached from a "Find an
// Aircraft" search match (issue #26). Deliberately view-only: no join,
// request-to-join, or messaging affordance here — that flow is explicit
// Phase 5 Community scope (IMPLEMENTATION_SPEC.md §2 step 5's "request to
// join as caretaker (future)"), not built in Phase 1. RLS's
// `can_view_aircraft()` policy already guarantees this screen never
// receives a Private aircraft's row — there's nothing to re-check
// client-side beyond handling "not visible/not found" gracefully.
export function AircraftProfileScreen({ route }: Props) {
  const { aircraftId } = route.params;
  const { data: aircraft, isLoading, isError } = useAircraftProfile(aircraftId);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.brass} />
      </View>
    );
  }

  if (isError || !aircraft) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>
          This aircraft&apos;s profile isn&apos;t available right now.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {aircraft.primary_photo_url ? (
        <Image
          source={{ uri: aircraft.primary_photo_url }}
          style={styles.photo}
          accessibilityLabel={`Photo of ${aircraft.registration}`}
        />
      ) : (
        <View style={[styles.photo, styles.photoFallback]}>
          <IconSymbol name="airplane" size={40} color={colors.graphite60} fallback="✈️" />
        </View>
      )}

      <View style={styles.identity}>
        <Text style={styles.registration} accessibilityRole="header">
          {aircraft.registration}
        </Text>
        <Text style={styles.makeModel}>
          {aircraft.manufacturer} {aircraft.model}
        </Text>
        {aircraft.nickname ? (
          <Text style={styles.nickname}>&quot;{aircraft.nickname}&quot;</Text>
        ) : null}

        <View style={styles.visibilityBadge}>
          <Text style={styles.visibilityBadgeText}>{capitalize(aircraft.visibility)}</Text>
        </View>
      </View>

      <Text style={styles.browsingNote}>
        You&apos;re browsing this aircraft&apos;s profile — it isn&apos;t a member view.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ivory,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.ivory,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  message: {
    fontSize: typography.body.size,
    color: colors.graphite60,
    textAlign: 'center',
  },
  photo: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderBottomLeftRadius: radii.hero,
    borderBottomRightRadius: radii.hero,
  },
  photoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.aluminum,
  },
  identity: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  registration: {
    fontSize: typography.title1.size,
    fontWeight: typography.title1.weight,
    color: colors.graphite,
  },
  makeModel: {
    marginTop: spacing.xs,
    fontSize: typography.body.size,
    color: colors.graphite60,
  },
  nickname: {
    marginTop: spacing.xs,
    fontSize: typography.body.size,
    fontStyle: 'italic',
    color: colors.graphite60,
  },
  visibilityBadge: {
    marginTop: spacing.lg,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.control,
    backgroundColor: colors.aluminum,
  },
  visibilityBadgeText: {
    fontSize: typography.caption.size,
    fontWeight: '600',
    color: colors.graphite,
  },
  browsingNote: {
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.xl,
    fontSize: typography.caption.size,
    color: colors.graphite60,
    textAlign: 'center',
  },
});
