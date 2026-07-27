import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Image,
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
  firstInvalidField,
  validateAircraftForm,
  type AircraftFormErrors,
  type AircraftFormValues,
} from '../../features/aircraft/aircraftValidation';
import { useCreateAircraft } from '../../features/aircraft/useCreateAircraft';
import { colors, radii, spacing, typography } from '../../utils/tokens';
import type { RootStackParamList } from '../navigation/types';

// The "Add My Aircraft" form (issue #8): required fields only, per
// IMPLEMENTATION_SPEC.md §2 step 3 — registration, manufacturer, model,
// primary photo. Optional fields (nickname, year, serial number, engine
// info, home airport, purchase date, ownership story) are deliberately
// absent here; they're a progressive-disclosure edit flow after creation,
// which is separate, later scope.
//
// Submit wires into #9's real create_aircraft_with_owner RPC via
// useCreateAircraft (src/features/aircraft/useCreateAircraft.ts), which also
// sequences the photo upload after the aircraft + owner membership exist —
// see that file for why the upload can't happen before creation.
type Props = NativeStackScreenProps<RootStackParamList, 'AddAircraft'>;

const initialValues: AircraftFormValues = {
  registration: '',
  manufacturer: '',
  model: '',
  primaryPhotoUri: null,
};

export function AddAircraftScreen({ navigation }: Props) {
  const [values, setValues] = useState<AircraftFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<AircraftFormErrors>({});
  const [photoPickerError, setPhotoPickerError] = useState<string | null>(null);

  const registrationRef = useRef<TextInput>(null);
  const manufacturerRef = useRef<TextInput>(null);
  const modelRef = useRef<TextInput>(null);

  const {
    submit,
    isSubmitting,
    registrationError: submitRegistrationError,
    bannerError,
    reset,
  } = useCreateAircraft();

  const registrationError = fieldErrors.registration ?? submitRegistrationError ?? undefined;

  function setField<K extends keyof AircraftFormValues>(field: K, value: AircraftFormValues[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    // A fresh edit invalidates whatever the last submit attempt complained
    // about (e.g. "already taken") — don't leave a stale error on screen.
    reset();
  }

  async function pickFromLibrary() {
    setPhotoPickerError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPhotoPickerError('Digital Hangar needs access to your photos to add one here.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      setField('primaryPhotoUri', result.assets[0].uri);
    }
  }

  async function takePhoto() {
    setPhotoPickerError(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setPhotoPickerError('Digital Hangar needs camera access to take a picture of your aircraft.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      setField('primaryPhotoUri', result.assets[0].uri);
    }
  }

  function handleSubmit() {
    const errors = validateAircraftForm(values);
    setFieldErrors(errors);

    const invalidField = firstInvalidField(errors);
    if (invalidField) {
      const fieldLabel: Record<string, string> = {
        registration: 'Registration',
        manufacturer: 'Manufacturer',
        model: 'Model',
        primaryPhotoUri: 'Photo',
      };
      AccessibilityInfo.announceForAccessibility(
        `${fieldLabel[invalidField]}: ${errors[invalidField as keyof AircraftFormErrors]}`,
      );

      if (invalidField === 'registration') registrationRef.current?.focus();
      else if (invalidField === 'manufacturer') manufacturerRef.current?.focus();
      else if (invalidField === 'model') modelRef.current?.focus();
      return;
    }

    submit(
      {
        registration: values.registration,
        manufacturer: values.manufacturer,
        model: values.model,
        primaryPhotoUri: values.primaryPhotoUri as string,
      },
      {
        onSuccess: () => {
          // The onboarding gate that would route a newly-created aircraft's
          // owner into Home with that aircraft active (#11) doesn't exist
          // yet, so this just returns to Home directly.
          navigation.navigate('Home');
        },
      },
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
            This is where your airplane lives.
          </Text>
          <Text style={styles.subtitle}>
            Just the essentials for now — you can add the rest once your hangar is open.
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label} nativeID="registration-label">
            Registration
          </Text>
          <TextInput
            ref={registrationRef}
            style={[styles.input, registrationError && styles.inputError]}
            value={values.registration}
            onChangeText={(text) => setField('registration', text)}
            placeholder="N123AZ"
            placeholderTextColor={colors.graphite60}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            returnKeyType="next"
            onSubmitEditing={() => manufacturerRef.current?.focus()}
            accessibilityLabel="Registration, tail number"
            accessibilityLabelledBy="registration-label"
            accessibilityHint="For example, N123AZ"
          />
          {registrationError && (
            <Text style={styles.errorText} accessibilityRole="alert">
              {registrationError}
            </Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label} nativeID="manufacturer-label">
            Manufacturer
          </Text>
          <TextInput
            ref={manufacturerRef}
            style={[styles.input, fieldErrors.manufacturer && styles.inputError]}
            value={values.manufacturer}
            onChangeText={(text) => setField('manufacturer', text)}
            placeholder="Piper"
            placeholderTextColor={colors.graphite60}
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => modelRef.current?.focus()}
            accessibilityLabel="Manufacturer"
            accessibilityLabelledBy="manufacturer-label"
          />
          {fieldErrors.manufacturer && (
            <Text style={styles.errorText} accessibilityRole="alert">
              {fieldErrors.manufacturer}
            </Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label} nativeID="model-label">
            Model
          </Text>
          <TextInput
            ref={modelRef}
            style={[styles.input, fieldErrors.model && styles.inputError]}
            value={values.model}
            onChangeText={(text) => setField('model', text)}
            placeholder="PA-28"
            placeholderTextColor={colors.graphite60}
            autoCorrect={false}
            returnKeyType="done"
            accessibilityLabel="Model"
            accessibilityLabelledBy="model-label"
          />
          {fieldErrors.model && (
            <Text style={styles.errorText} accessibilityRole="alert">
              {fieldErrors.model}
            </Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Photo</Text>
          <Text style={styles.helperText}>
            A real photo of your aircraft — not a stock photo or a listing photo.
          </Text>

          {values.primaryPhotoUri && (
            <Image
              source={{ uri: values.primaryPhotoUri }}
              style={styles.photoPreview}
              accessible
              accessibilityLabel="Selected aircraft photo"
            />
          )}

          <View style={styles.photoButtons}>
            {Platform.OS !== 'web' && (
              <Pressable
                onPress={takePhoto}
                style={styles.secondaryButton}
                accessibilityRole="button"
                accessibilityLabel="Take photo"
              >
                <Text style={styles.secondaryButtonText}>Take Photo</Text>
              </Pressable>
            )}
            <Pressable
              onPress={pickFromLibrary}
              style={styles.secondaryButton}
              accessibilityRole="button"
              accessibilityLabel={values.primaryPhotoUri ? 'Change photo' : 'Choose from library'}
            >
              <Text style={styles.secondaryButtonText}>
                {values.primaryPhotoUri ? 'Change Photo' : 'Choose from Library'}
              </Text>
            </Pressable>
          </View>

          {(fieldErrors.primaryPhotoUri || photoPickerError) && (
            <Text style={styles.errorText} accessibilityRole="alert">
              {fieldErrors.primaryPhotoUri ?? photoPickerError}
            </Text>
          )}
        </View>

        {bannerError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText} accessibilityRole="alert">
              {bannerError}
            </Text>
          </View>
        )}

        <Pressable
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Add this aircraft"
          accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.ivory} />
          ) : (
            <Text style={styles.submitButtonText}>Add This Aircraft</Text>
          )}
        </Pressable>
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
  helperText: {
    fontSize: typography.caption.size,
    color: colors.graphite60,
    marginBottom: spacing.sm,
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
  inputError: {
    borderColor: colors.brass,
  },
  errorText: {
    fontSize: typography.caption.size,
    color: colors.brass,
    marginTop: spacing.xs,
  },
  photoPreview: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radii.card,
    marginBottom: spacing.md,
    backgroundColor: colors.aluminum,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.aluminum,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: typography.body.size,
    color: colors.graphite,
    fontWeight: '600',
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
  submitButton: {
    backgroundColor: colors.brass,
    borderRadius: radii.control,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: typography.body.size,
    fontWeight: '600',
    color: colors.ivory,
  },
});
