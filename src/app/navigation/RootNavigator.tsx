import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useHasAircraftMembership } from '../../features/aircraft/useHasAircraftMembership';
import { colors, typography } from '../../utils/tokens';
import { AddAircraftScreen } from '../screens/AddAircraftScreen';
import { AddTimelineEntryScreen } from '../screens/AddTimelineEntryScreen';
import { AircraftProfileScreen } from '../screens/AircraftProfileScreen';
import { EditAircraftProfileScreen } from '../screens/EditAircraftProfileScreen';
import { FindAircraftScreen } from '../screens/FindAircraftScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { OnboardingChoiceScreen } from '../screens/OnboardingChoiceScreen';
import { TimelineEntryDetailScreen } from '../screens/TimelineEntryDetailScreen';
import { HangarTabs } from './HangarTabs';
import { decideHomeGate } from './homeGate';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Shared header look for the onboarding/search screens below — same
// Cloud White background + graphite title treatment as HangarTabs' tab header, so a
// pushed screen with a native back button/gesture (issue #26's "back →
// choice screen" flow) doesn't look like a different app.
const subScreenHeaderOptions = {
  headerShown: true,
  headerStyle: { backgroundColor: colors.cloudWhite },
  headerShadowVisible: false,
  headerTintColor: colors.graphite,
  headerTitleStyle: {
    color: colors.graphite,
    fontSize: typography.title2.size,
    fontWeight: typography.title2.weight,
  },
} as const;

// Home ("My Digital Hangar") is the entry point above the Story/Care/Fly
// tab navigator (IMPLEMENTATION_SPEC.md §2): it's the initial stack screen,
// with the Hangar tab navigator pushed on top once the owner enters it.
// Rendered once a Supabase Auth session exists (see App.tsx).
//
// The "no aircraft yet -> onboarding" gate (issue #11) decides the stack's
// *initial* route via useHasAircraftMembership + decideHomeGate — a signed-in
// user with zero `aircraft_memberships` rows lands on OnboardingChoice
// instead of Home. `initialRouteName` is only read on first mount, so the
// gate resolves before NavigationContainer ever mounts (the `loading` branch
// below holds a neutral screen until then) rather than rendering Home and
// redirecting, per CLAUDE.md's "calm over complexity" — no flash either way.
//
// Both onboarding screens (OnboardingChoice, AddAircraft, FindAircraft) and
// Home remain registered stack routes regardless of the gate's decision, so
// a route like AddAircraft's onSuccess handler can still explicitly
// `navigation.navigate('Home')` once an aircraft is created — see
// AddAircraftScreen.tsx and useCreateAircraft.ts's membership-query
// invalidation for how that transition stays correct without needing this
// component to remount.
export function RootNavigator() {
  const { data: hasAircraft, isLoading } = useHasAircraftMembership();
  const gate = decideHomeGate({ isLoading, hasAircraft });

  if (gate === 'loading') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.skyBlue} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={gate === 'home' ? 'Home' : 'OnboardingChoice'}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Hangar" component={HangarTabs} />
        <Stack.Screen name="OnboardingChoice" component={OnboardingChoiceScreen} />
        <Stack.Screen
          name="AddAircraft"
          component={AddAircraftScreen}
          options={{ ...subScreenHeaderOptions, headerTitle: 'Add My Aircraft' }}
        />
        <Stack.Screen
          name="FindAircraft"
          component={FindAircraftScreen}
          options={{ ...subScreenHeaderOptions, headerTitle: 'Find an Aircraft' }}
        />
        <Stack.Screen
          name="AircraftProfile"
          component={AircraftProfileScreen}
          options={{ ...subScreenHeaderOptions, headerTitle: 'Aircraft Profile' }}
        />
        <Stack.Screen
          name="EditAircraftProfile"
          component={EditAircraftProfileScreen}
          options={{ ...subScreenHeaderOptions, headerTitle: 'Edit Aircraft Profile' }}
        />
        <Stack.Screen
          name="TimelineEntryDetail"
          component={TimelineEntryDetailScreen}
          options={{ ...subScreenHeaderOptions, headerTitle: 'Story' }}
        />
        <Stack.Screen
          name="AddTimelineEntry"
          component={AddTimelineEntryScreen}
          options={{ ...subScreenHeaderOptions, headerTitle: 'Add Entry' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  // Matches App.tsx's session-loading screen so the handoff from "checking
  // session" to "checking aircraft membership" doesn't look like two
  // different loading states stitched together.
  loading: {
    flex: 1,
    backgroundColor: colors.cloudWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
