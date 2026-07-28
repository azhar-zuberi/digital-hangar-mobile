import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AircraftHeroPhoto } from '../../components/AircraftHeroPhoto';
import { AircraftIdentityBlock } from '../../components/AircraftIdentityBlock';
import { AircraftSwitcher } from '../../components/AircraftSwitcher';
import { useSelectedAircraft } from '../../features/aircraft/useSelectedAircraft';
import { signOut } from '../../features/auth/signOut';
import { RecentHangarActivity } from '../../features/home/components/RecentHangarActivity';
import type { HangarActivityItem } from '../../features/home/hangarActivity';
import { useRecentHangarActivity } from '../../features/home/useRecentHangarActivity';
import { colors, radii, spacing, typography } from '../../utils/tokens';
import type { RootStackParamList } from '../navigation/types';

// Home ("My Digital Hangar") — the entry point above the Story/Care/Fly tab
// navigator (IMPLEMENTATION_SPEC.md §2). Issue #35 builds the hero photo,
// identity block, and aircraft switcher described in §2 items 1, 2, and 5;
// issue #38 adds Recent Hangar Activity (item 4, timeline slice only —
// squawks/flights are Phase 3/4). Ownership Snapshot (Phase 4, needs the
// `aircraft_flight_stats` view) is still deliberately not built here — see
// #35's "Blocks" notes. The former placeholder copy ("Your aircraft's
// digital home is on its way") is gone now that there's real content.
//
// By the time this screen mounts, issue #11's gate (RootNavigator.tsx) has
// already confirmed the signed-in user has at least one aircraft
// membership, so the "no aircraft" fallback below is defensive (a race with
// a membership being removed elsewhere, a query error, etc.), not an
// expected path.
type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { ownedAircraft, selectedAircraft, selectAircraft, isLoading, isError } =
    useSelectedAircraft();

  const {
    timelineItems,
    isLoading: isLoadingActivity,
    isError: isActivityError,
  } = useRecentHangarActivity(selectedAircraft?.id);

  const handleSignOut = () => {
    // Best-effort: signOut() clears the local Supabase session either way,
    // so there's nothing actionable to surface if the network call fails.
    signOut().catch(() => {});
  };

  // Only `kind: 'timeline'` items exist in Phase 2 — see
  // useRecentHangarActivity.ts's TODOs for the Phase 3/4 squawk/flight
  // slices this will grow branches for.
  function handlePressActivityItem(item: HangarActivityItem) {
    if (item.kind === 'timeline') {
      navigation.navigate('TimelineEntryDetail', { entryId: item.id });
    }
    // TODO(Phase 3): item.kind === 'squawk' -> navigate to the Care tab's
    // squawk detail view.
    // TODO(Phase 4): item.kind === 'flight' -> navigate to the Fly tab's
    // flight detail view.
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.brass} />
      </View>
    );
  }

  if (isError || !selectedAircraft) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>
          Your hangar isn&apos;t available right now. Check your connection and try again.
        </Text>
        <Pressable onPress={handleSignOut} style={styles.signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AircraftHeroPhoto
        photoUrl={selectedAircraft.primary_photo_url}
        registration={selectedAircraft.registration}
      />
      <AircraftIdentityBlock
        registration={selectedAircraft.registration}
        manufacturer={selectedAircraft.manufacturer}
        model={selectedAircraft.model}
        nickname={selectedAircraft.nickname}
      />

      <RecentHangarActivity
        timelineItems={timelineItems}
        isLoading={isLoadingActivity}
        isError={isActivityError}
        onPressItem={handlePressActivityItem}
      />

      {ownedAircraft.length > 1 ? (
        <AircraftSwitcher
          options={ownedAircraft.map((aircraft) => ({
            id: aircraft.id,
            registration: aircraft.registration,
          }))}
          selectedId={selectedAircraft.id}
          onSelect={selectAircraft}
        />
      ) : null}

      <Pressable onPress={() => navigation.navigate('Hangar')} style={styles.enter}>
        <Text style={styles.enterText}>Enter the Hangar</Text>
      </Pressable>
      <Pressable onPress={handleSignOut} style={styles.signOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ivory,
  },
  content: {
    paddingBottom: spacing.xxl,
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
  enter: {
    marginTop: spacing.xxl,
    marginHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.control,
    backgroundColor: colors.brass,
    alignItems: 'center',
  },
  enterText: {
    fontSize: typography.body.size,
    fontWeight: '600',
    color: colors.ivory,
  },
  signOut: {
    marginTop: spacing.xl,
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  signOutText: {
    fontSize: typography.caption.size,
    color: colors.brass,
  },
});
