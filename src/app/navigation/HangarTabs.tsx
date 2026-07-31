import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { IconSymbol } from '../../components/IconSymbol';
import { colors, typography } from '../../utils/tokens';
import { CareScreen } from '../screens/CareScreen';
import { FlyScreen } from '../screens/FlyScreen';
import { StoryScreen } from '../screens/StoryScreen';
import { AddTimelineEntryHeaderButton } from './AddTimelineEntryHeaderButton';
import { HomeHeaderButton } from './HomeHeaderButton';
import type { HangarTabParamList } from './types';

const Tab = createBottomTabNavigator<HangarTabParamList>();

// The three nav pillars, in this order, per CLAUDE.md / BRAND.md §18:
// Story (memories/milestones), Care (maintenance/squawks/reminders), Fly
// (flights/hours/routes). Community is deliberately not a fourth tab here —
// its placement is TBD per IMPLEMENTATION_SPEC.md §2, out of scope until
// Phase 5 (#16). Story has real content as of issue #36; Care and Fly
// remain placeholders until Phases 3-4.
export function HangarTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerLeft: () => <HomeHeaderButton />,
        headerStyle: { backgroundColor: colors.cloudWhite },
        headerShadowVisible: false,
        headerTitleStyle: {
          color: colors.graphite,
          fontSize: typography.title2.size,
          fontWeight: typography.title2.weight,
        },
        tabBarStyle: { backgroundColor: colors.cloudWhite, borderTopColor: colors.graphite12 },
        tabBarActiveTintColor: colors.aviationBlue,
        tabBarInactiveTintColor: colors.graphite60,
        tabBarLabelStyle: { fontSize: typography.caption.size },
      }}
    >
      <Tab.Screen
        name="Story"
        component={StoryScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <IconSymbol name="book.closed" size={size} color={color} fallback="📖" />
          ),
          headerRight: () => <AddTimelineEntryHeaderButton />,
        }}
      />
      <Tab.Screen
        name="Care"
        component={CareScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <IconSymbol name="wrench.and.screwdriver" size={size} color={color} fallback="🔧" />
          ),
        }}
      />
      <Tab.Screen
        name="Fly"
        component={FlyScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <IconSymbol name="airplane" size={size} color={color} fallback="✈️" />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
