import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '../../utils/tokens';

// Placeholder screen for issue #1 (project scaffold). Real navigation
// (Story / Care / Fly tabs) and the "Add My Aircraft" gate land in later
// Phase 1 issues per ADDENDUM.md §C.
export function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Digital Hangar</Text>
      <Text style={styles.subtitle}>Your aircraft&apos;s digital home is on its way.</Text>
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ivory,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: typography.title1.size,
    fontWeight: typography.title1.weight,
    color: colors.graphite,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: typography.body.size,
    color: colors.graphite60,
    textAlign: 'center',
  },
});
