import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  NICKNAME_MAX_LENGTH,
  diffEditableValues,
  firstInvalidField,
  toEditableValues,
  toFormValues,
  validateAircraftEditForm,
  type AircraftEditFormErrors,
  type AircraftEditFormValues,
} from '../../features/aircraft/aircraftEditValidation';
import { useAircraftEditableFields } from '../../features/aircraft/useAircraftEditableFields';
import { useUpdateAircraftProfile } from '../../features/aircraft/useUpdateAircraftProfile';
import { colors, radii, spacing, typography } from '../../utils/tokens';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'EditAircraftProfile'>;

const emptyValues: AircraftEditFormValues = {
  nickname: '',
  year: '',
  serialNumber: '',
  engineInformation: '',
  homeAirport: '',
};

const FIELD_LABELS: Record<keyof AircraftEditFormValues, string> = {
  nickname: 'Nickname',
  year: 'Year',
  serialNumber: 'Serial number',
  engineInformation: 'Engine information',
  homeAirport: 'Home airport',
};

// Issue #37's progressive-disclosure edit form: the five optional `aircraft`
// columns deferred out of the required "Add My Aircraft" form (issue #8) —
// nickname, year, serial_number, engine_information, home_airport. Reached
// via Home's "Edit Profile" button (this issue's UI entry point decision;
// see HomeScreen.tsx), not nested under the read-only community
// AircraftProfileScreen, which is a different, view-only screen for browsing
// someone else's Community/Public aircraft (issue #26) and has no editing
// concern at all.
//
// `purchase_date`/`ownership_story` from PRD §10 are deliberately absent —
// those columns don't exist in the `aircraft` table (see
// aircraftEditValidation.ts's header comment) and issue #37's current body
// scopes them out explicitly.
export function EditAircraftProfileScreen({ navigation, route }: Props) {
  const { aircraftId } = route.params;

  const { data: current, isLoading, isError } = useAircraftEditableFields(aircraftId);
  const { submit, isSubmitting, bannerError, reset } = useUpdateAircraftProfile(aircraftId);

  const [values, setValues] = useState<AircraftEditFormValues>(emptyValues);
  const [fieldErrors, setFieldErrors] = useState<AircraftEditFormErrors>({});
  // Guards against re-initializing the form from a background refetch
  // (e.g. after a successful save invalidates this query) and clobbering
  // whatever the person has since typed.
  const initializedRef = useRef(false);

  const nicknameRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);
  const serialNumberRef = useRef<TextInput>(null);
  const engineInformationRef = useRef<TextInput>(null);
  const homeAirportRef = useRef<TextInput>(null);
  const fieldRefs = {
    nickname: nicknameRef,
    year: yearRef,
    serialNumber: serialNumberRef,
    engineInformation: engineInformationRef,
    homeAirport: homeAirportRef,
  } as const;

  useEffect(() => {
    if (current && !initializedRef.current) {
      setValues(toFormValues(current));
      initializedRef.current = true;
    }
  }, [current]);

  function setField<K extends keyof AircraftEditFormValues>(
    field: K,
    value: AircraftEditFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    reset();
  }

  function handleCancel() {
    // Returns to Home (the "aircraft profile" this screen was reached from)
    // without saving — no unsaved-changes prompt, per the acceptance
    // criteria's plain "Cancel button returns to aircraft profile without
    // saving."
    navigation.goBack();
  }

  function handleSave() {
    if (!current) return;

    const errors = validateAircraftEditForm(values);
    setFieldErrors(errors);

    const invalidField = firstInvalidField(errors);
    if (invalidField) {
      AccessibilityInfo.announceForAccessibility(
        `${FIELD_LABELS[invalidField]}: ${errors[invalidField]}`,
      );
      fieldRefs[invalidField].current?.focus();
      return;
    }

    const initial = toEditableValues(toFormValues(current));
    const next = toEditableValues(values);
    const diff = diffEditableValues(initial, next);

    if (Object.keys(diff).length === 0) {
      // Nothing changed — there's no reason to round-trip a no-op update.
      navigation.goBack();
      return;
    }

    submit(diff, {
      onSuccess: () => {
        // No toast/snackbar system exists in this codebase (see
        // AddAircraftScreen/AddTimelineEntryScreen — both just navigate on
        // success). An accessibility announcement gives every user a real,
        // if brief, confirmation without inventing one; the identity
        // block's own refresh (via useUpdateAircraftProfile's query
        // invalidation) is the visible "refresh aircraft profile display"
        // called out in the acceptance criteria.
        AccessibilityInfo.announceForAccessibility('Saved. Your aircraft profile is up to date.');
        navigation.goBack();
      },
    });
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.brass} />
      </View>
    );
  }

  if (isError || !current) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>
          This aircraft&apos;s profile isn&apos;t available right now. Check your connection and try
          again.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heading}>
          <Text style={styles.title} accessibilityRole="header">
            Add a few more details
          </Text>
          <Text style={styles.subtitle}>
            All optional — skip anything and add it whenever you&apos;re ready.
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label} nativeID="nickname-label">
            Nickname
          </Text>
          <TextInput
            ref={nicknameRef}
            style={[styles.input, fieldErrors.nickname && styles.inputError]}
            value={values.nickname}
            onChangeText={(text) => setField('nickname', text)}
            placeholder="Bluebird"
            placeholderTextColor={colors.graphite60}
            maxLength={NICKNAME_MAX_LENGTH}
            returnKeyType="next"
            onSubmitEditing={() => yearRef.current?.focus()}
            accessibilityLabel="Nickname, optional"
            accessibilityLabelledBy="nickname-label"
          />
          {fieldErrors.nickname && (
            <Text style={styles.errorText} accessibilityRole="alert">
              {fieldErrors.nickname}
            </Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label} nativeID="year-label">
            Year
          </Text>
          <TextInput
            ref={yearRef}
            style={[styles.input, fieldErrors.year && styles.inputError]}
            value={values.year}
            onChangeText={(text) => setField('year', text.replace(/[^0-9]/g, '').slice(0, 4))}
            placeholder="1979"
            placeholderTextColor={colors.graphite60}
            keyboardType="number-pad"
            maxLength={4}
            returnKeyType="next"
            onSubmitEditing={() => serialNumberRef.current?.focus()}
            accessibilityLabel="Year, optional"
            accessibilityLabelledBy="year-label"
          />
          {fieldErrors.year && (
            <Text style={styles.errorText} accessibilityRole="alert">
              {fieldErrors.year}
            </Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label} nativeID="serial-number-label">
            Serial number
          </Text>
          <TextInput
            ref={serialNumberRef}
            style={styles.input}
            value={values.serialNumber}
            onChangeText={(text) => setField('serialNumber', text)}
            placeholder="28-7405136"
            placeholderTextColor={colors.graphite60}
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => engineInformationRef.current?.focus()}
            accessibilityLabel="Serial number, optional"
            accessibilityLabelledBy="serial-number-label"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label} nativeID="engine-information-label">
            Engine information
          </Text>
          <TextInput
            ref={engineInformationRef}
            style={[styles.input, styles.multilineInput]}
            value={values.engineInformation}
            onChangeText={(text) => setField('engineInformation', text)}
            placeholder="Lycoming O-235-C1"
            placeholderTextColor={colors.graphite60}
            multiline
            textAlignVertical="top"
            returnKeyType="next"
            accessibilityLabel="Engine information, optional"
            accessibilityLabelledBy="engine-information-label"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label} nativeID="home-airport-label">
            Home airport
          </Text>
          <TextInput
            ref={homeAirportRef}
            style={styles.input}
            value={values.homeAirport}
            onChangeText={(text) => setField('homeAirport', text)}
            placeholder="KJFK"
            placeholderTextColor={colors.graphite60}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleSave}
            accessibilityLabel="Home airport, optional"
            accessibilityLabelledBy="home-airport-label"
          />
        </View>

        {bannerError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText} accessibilityRole="alert">
              {bannerError}
            </Text>
          </View>
        )}

        <View style={styles.actions}>
          <Pressable
            onPress={handleCancel}
            disabled={isSubmitting}
            style={styles.cancelButton}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleSave}
            disabled={isSubmitting}
            style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Save changes"
            accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.ivory} />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.ivory,
  },
  container: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
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
  heading: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.title1.size,
    fontWeight: typography.title1.weight,
    color: colors.graphite,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.body.size,
    color: colors.graphite60,
  },
  field: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: typography.caption.size,
    fontWeight: '600',
    color: colors.graphite,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.aluminum,
    borderRadius: radii.control,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.body.size,
    color: colors.graphite,
    backgroundColor: colors.ivory,
  },
  multilineInput: {
    minHeight: 96,
  },
  inputError: {
    borderColor: colors.brass,
  },
  errorText: {
    fontSize: typography.caption.size,
    color: colors.brass,
    marginTop: spacing.xs,
  },
  errorBanner: {
    marginBottom: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.card,
    backgroundColor: colors.aluminum,
  },
  errorBannerText: {
    fontSize: typography.caption.size,
    color: colors.graphite,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.aluminum,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  cancelButtonText: {
    fontSize: typography.body.size,
    fontWeight: '600',
    color: colors.graphite,
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.brass,
    borderRadius: radii.control,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: typography.body.size,
    fontWeight: '600',
    color: colors.ivory,
  },
});
