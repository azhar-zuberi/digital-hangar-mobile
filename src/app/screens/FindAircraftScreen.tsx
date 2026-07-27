import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAircraftSearch } from '../../features/aircraft/useAircraftSearch';
import { colors, radii, spacing, typography } from '../../utils/tokens';
import type { RootStackParamList } from '../navigation/types';

// "Find an Aircraft" per IMPLEMENTATION_SPEC.md §2 step 5: exact-match,
// case-insensitive search by registration (tail number) only — no fuzzy
// search, no partial-match listing (issue #26 AC). A match navigates to the
// read-only AircraftProfile screen; the "request to join as caretaker
// (future)" mentioned in that spec step is explicitly Phase 5 Community
// scope and is not built here — this screen is browse-only.
type Props = NativeStackScreenProps<RootStackParamList, 'FindAircraft'>;

export function FindAircraftScreen({ navigation }: Props) {
  const [registration, setRegistration] = useState('');
  const {
    mutate: search,
    data: result,
    isPending,
    isSuccess,
    isError,
    reset,
  } = useAircraftSearch();

  const handleChangeText = (text: string) => {
    setRegistration(text);
    // Clear a stale "not found"/error message as soon as the owner starts
    // editing the field again, rather than leaving it up until resubmit.
    if (isSuccess || isError) {
      reset();
    }
  };

  const trimmedRegistration = registration.trim();
  const canSearch = trimmedRegistration.length > 0 && !isPending;

  // Navigate on a match, then clear local state so returning to this screen
  // (native back from AircraftProfile) shows a fresh, empty search rather
  // than replaying the last result — search is stateless per the issue's
  // implementation notes (no results caching or favorites list). Handled as
  // a mutation onSuccess callback (not a useEffect keyed on `result`) so a
  // matched result never has to round-trip through a render before we act
  // on it.
  const handleSearch = () => {
    if (!canSearch) return;
    search(trimmedRegistration, {
      onSuccess: (aircraft) => {
        if (aircraft) {
          reset();
          setRegistration('');
          navigation.navigate('AircraftProfile', { aircraftId: aircraft.id });
        }
      },
    });
  };

  const showNotFound = isSuccess && !result;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Aircraft registration (tail number)</Text>
      <TextInput
        style={styles.input}
        value={registration}
        onChangeText={handleChangeText}
        onSubmitEditing={handleSearch}
        placeholder="N123AZ"
        placeholderTextColor={colors.graphite60}
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel="Aircraft registration (tail number)"
        accessibilityHint="Enter the tail number of the aircraft you're looking for, then search"
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Search"
        accessibilityState={{ disabled: !canSearch }}
        disabled={!canSearch}
        onPress={handleSearch}
        style={[styles.searchButton, !canSearch && styles.searchButtonDisabled]}
      >
        {isPending ? (
          <ActivityIndicator color={colors.ivory} />
        ) : (
          <Text style={styles.searchButtonText}>Search</Text>
        )}
      </Pressable>

      {showNotFound && (
        <Text style={styles.message} accessibilityLiveRegion="polite">
          No aircraft found with that registration.
        </Text>
      )}

      {isError && (
        <Text style={styles.errorMessage} accessibilityLiveRegion="polite">
          Something went wrong searching for that aircraft. Please try again.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ivory,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  label: {
    fontSize: typography.caption.size,
    color: colors.graphite60,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.aluminum,
    borderRadius: radii.control,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.body.size,
    color: colors.graphite,
    backgroundColor: colors.ivory,
  },
  searchButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.control,
    backgroundColor: colors.brass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonDisabled: {
    opacity: 0.5,
  },
  searchButtonText: {
    fontSize: typography.body.size,
    fontWeight: '600',
    color: colors.ivory,
  },
  message: {
    marginTop: spacing.xl,
    fontSize: typography.body.size,
    color: colors.graphite60,
    textAlign: 'center',
  },
  errorMessage: {
    marginTop: spacing.xl,
    fontSize: typography.body.size,
    color: colors.graphite,
    textAlign: 'center',
  },
});
