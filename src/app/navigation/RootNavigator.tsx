import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { colors, typography } from '../../utils/tokens';
import { AddAircraftScreen } from '../screens/AddAircraftScreen';
import { AircraftProfileScreen } from '../screens/AircraftProfileScreen';
import { FindAircraftScreen } from '../screens/FindAircraftScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { OnboardingChoiceScreen } from '../screens/OnboardingChoiceScreen';
import { HangarTabs } from './HangarTabs';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Shared header look for the onboarding/search screens below — same ivory
// background + graphite title treatment as HangarTabs' tab header, so a
// pushed screen with a native back button/gesture (issue #26's "back →
// choice screen" flow) doesn't look like a different app.
const subScreenHeaderOptions = {
  headerShown: true,
  headerStyle: { backgroundColor: colors.ivory },
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
// Rendered once a Supabase Auth session exists (see App.tsx) — the
// "no aircraft yet → onboarding" gate is separate, later scope (#11); the
// OnboardingChoice/AddAircraft/FindAircraft/AircraftProfile screens below
// (issue #26, and #8's form) are registered so they're reachable and
// testable ahead of that gate landing, not because the gate is wired here.
//
export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
