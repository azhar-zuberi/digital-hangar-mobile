import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useRef, useState } from 'react';
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

import { DateWheelPicker } from '../../features/timeline/components/DateWheelPicker';
import { TimelinePhotoPicker } from '../../features/timeline/components/TimelinePhotoPicker';
import { TimelineTypePicker } from '../../features/timeline/components/TimelineTypePicker';
import { useAddTimelineEntry } from '../../features/timeline/useAddTimelineEntry';
import {
  firstInvalidField,
  validateTimelineEntryForm,
  type TimelineEntryFormErrors,
  type TimelineEntryFormValues,
} from '../../features/timeline/timelineValidation';
import { colors, radii, spacing, typography } from '../../utils/tokens';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AddTimelineEntry'>;

const initialValues: TimelineEntryFormValues = {
  type: 'memory',
  title: '',
  description: '',
  eventDate: new Date(),
  photoUris: [],
};

// Story tab's add flow (issue #36): type picker, title, description, event
// date (defaults to today, cannot be future), photos. Reached from
// StoryScreen's header/empty-state button via
// `navigation.getParent()?.navigate('AddTimelineEntry', { aircraftId })`.
//
// The date field is a custom, dependency-free three-column scrollable
// picker (DateWheelPicker) rather than a native date-picker library —
// @react-native-community/datetimepicker (the standard RN choice) isn't
// already a project dependency, and pulling it in would need native-module
// jest mocking and has inconsistent `expo start --web` support, which would
// make this screen one of the few in the app not verifiable in a browser.
// The custom picker satisfies the "scrollable date picker" AC while staying
// fully web-verifiable and jest-testable — flagged here as a deliberate
// implementation choice, not an oversight.
export function AddTimelineEntryScreen({ navigation, route }: Props) {
  const { aircraftId } = route.params;
  const [values, setValues] = useState<TimelineEntryFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<TimelineEntryFormErrors>({});

  const titleRef = useRef<TextInput>(null);

  const { submit, isSubmitting, bannerError, reset } = useAddTimelineEntry(aircraftId);

  function setField<K extends keyof TimelineEntryFormValues>(
    field: K,
    value: TimelineEntryFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    reset();
  }

  function handleSubmit() {
    const errors = validateTimelineEntryForm(values);
    setFieldErrors(errors);

    const invalidField = firstInvalidField(errors);
    if (invalidField) {
      const fieldLabel: Record<string, string> = {
        title: 'Title',
        eventDate: 'Date',
      };
      AccessibilityInfo.announceForAccessibility(
        `${fieldLabel[invalidField]}: ${errors[invalidField]}`,
      );
      if (invalidField === 'title') titleRef.current?.focus();
      return;
    }

    submit(
      {
        aircraftId,
        type: values.type,
        title: values.title,
        description: values.description,
        eventDate: values.eventDate,
        photoUris: values.photoUris,
      },
      {
        onSuccess: (entry) => {
          // Pops back to the Story tab (already on the stack below this
          // screen) and hands it the new entry's id so it can scroll to it
          // — see StoryScreen.tsx's `scrollToEntryId` handling.
          navigation.navigate('Hangar', {
            screen: 'Story',
            params: { scrollToEntryId: entry.id },
          });
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
        <View style={styles.field}>
          <Text style={styles.label}>Type</Text>
          <TimelineTypePicker value={values.type} onChange={(type) => setField('type', type)} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label} nativeID="title-label">
            Title
          </Text>
          <TextInput
            ref={titleRef}
            style={[styles.input, fieldErrors.title && styles.inputError]}
            value={values.title}
            onChangeText={(text) => setField('title', text)}
            placeholder="First cross-country flight"
            placeholderTextColor={colors.graphite60}
            returnKeyType="next"
            accessibilityLabel="Title"
            accessibilityLabelledBy="title-label"
          />
          {fieldErrors.title && (
            <Text style={styles.errorText} accessibilityRole="alert">
              {fieldErrors.title}
            </Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label} nativeID="description-label">
            Description
          </Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={values.description}
            onChangeText={(text) => setField('description', text)}
            placeholder="What happened, and why it mattered"
            placeholderTextColor={colors.graphite60}
            multiline
            textAlignVertical="top"
            accessibilityLabel="Description, optional"
            accessibilityLabelledBy="description-label"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Date</Text>
          <DateWheelPicker
            value={values.eventDate}
            onChange={(date) => setField('eventDate', date)}
          />
          {fieldErrors.eventDate && (
            <Text style={styles.errorText} accessibilityRole="alert">
              {fieldErrors.eventDate}
            </Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Photos</Text>
          <TimelinePhotoPicker
            photoUris={values.photoUris}
            onChange={(photoUris) => setField('photoUris', photoUris)}
          />
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
          accessibilityLabel="Save entry"
          accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.ivory} />
          ) : (
            <Text style={styles.submitButtonText}>Save Entry</Text>
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
