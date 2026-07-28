import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AircraftHeroPhoto } from '../../components/AircraftHeroPhoto';
import { AircraftIdentityBlock } from '../../components/AircraftIdentityBlock';
import { AircraftSwitcher } from '../../components/AircraftSwitcher';
import { useSelectedAircraft } from '../../features/aircraft/useSelectedAircraft';
import { signOut } from '../../features/auth/signOut';
import { colors, radii, spacing, typography } from '../../utils/tokens';
import type { RootStackParamList } from '../navigation/types';

// Home ("My Digital Hangar") — the entry point above the Story/Care/Fly tab
// navigator (IMPLEMENTATION_SPEC.md §2). Issue #35 builds the hero photo,
// identity block, and aircraft switcher described in §2 items 1, 2, and 5;
// Ownership Snapshot (Phase 4, needs the `aircraft_flight_stats` view) and
// Recent Hangar Activity (issue #38) are deliberately not built here yet —
// see #35's "Blocks" notes. The former placeholder copy ("Your aircraft's
// digital home is on its way") is gone now that there's real content.
//
// "Edit Profile" (issue #37) is this screen's UI entry point into the
// optional-fields progressive-disclosure edit form — #35 didn't build one,
// and #37's acceptance criteria left the choice of entry point to whoever
// implemented it. Placed as a plain, non-competing secondary action right
// under the identity block: reachable anytime, never forced, per the
// "progressive disclosure" / "don't force" principle in
// IMPLEMENTATION_SPEC.md §2 step 3.
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

  const handleSignOut = () => {
    // Best-effort: signOut() clears the local Supabase session either way,
    // so there's nothing actionable to surface if the network call fails.
    signOut().catch(() => {});
  };

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

      <Pressable
        onPress={() =>
          navigation.navigate('EditAircraftProfile', { aircraftId: selectedAircraft.id })
        }
        style={styles.editProfile}
        accessibilityRole="button"
        accessibilityLabel="Edit aircraft profile"
      >
        <Text style={styles.editProfileText}>Edit Profile</Text>
      </Pressable>

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
  editProfile: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.xl,
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  editProfileText: {
    fontSize: typography.caption.size,
    fontWeight: '600',
    color: colors.brass,
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
