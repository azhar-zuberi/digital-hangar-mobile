import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AddAircraftScreen } from '../screens/AddAircraftScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { colors, typography } from '../../utils/tokens';
import { HangarTabs } from './HangarTabs';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Home ("My Digital Hangar") is the entry point above the Story/Care/Fly
// tab navigator (IMPLEMENTATION_SPEC.md §2): it's the initial stack screen,
// with the Hangar tab navigator pushed on top once the owner enters it.
// Rendered once a Supabase Auth session exists (see App.tsx) — the
// "no aircraft yet → onboarding" gate is separate, later scope (#11).
export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Hangar" component={HangarTabs} />
        <Stack.Screen
          name="AddAircraft"
          component={AddAircraftScreen}
          options={{
            headerShown: true,
            title: 'Add My Aircraft',
            headerStyle: { backgroundColor: colors.ivory },
            headerShadowVisible: false,
            headerTitleStyle: {
              color: colors.graphite,
              fontSize: typography.title2.size,
              fontWeight: typography.title2.weight,
            },
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
