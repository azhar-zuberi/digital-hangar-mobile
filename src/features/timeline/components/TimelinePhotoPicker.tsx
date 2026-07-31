import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '../../../components/IconSymbol';
import { colors, radii, spacing, typography } from '../../../utils/tokens';

type Props = {
  photoUris: string[];
  onChange: (photoUris: string[]) => void;
};

/** Add-entry form's multi-photo picker (issue #36 AC): launches the photo
 * library or camera, previews everything picked so far, and lets the owner
 * remove or reorder a selection before submitting. Mirrors
 * AddAircraftScreen.tsx's permission-request/error-copy pattern for a
 * single photo, extended to a list. */
export function TimelinePhotoPicker({ photoUris, onChange }: Props) {
  const [pickerError, setPickerError] = useState<string | null>(null);

  async function pickFromLibrary() {
    setPickerError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPickerError('Digital Hangar needs access to your photos to add some here.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
      allowsMultipleSelection: true,
    });

    if (!result.canceled && result.assets.length > 0) {
      onChange([...photoUris, ...result.assets.map((asset) => asset.uri)]);
    }
  }

  async function takePhoto() {
    setPickerError(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setPickerError('Digital Hangar needs camera access to take a picture here.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      onChange([...photoUris, result.assets[0].uri]);
    }
  }

  function removeAt(index: number) {
    onChange(photoUris.filter((_, i) => i !== index));
  }

  function moveBy(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= photoUris.length) return;
    const next = [...photoUris];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <View>
      {photoUris.length > 0 && (
        <View style={styles.previewGrid}>
          {photoUris.map((uri, index) => (
            <View key={uri} style={styles.previewItem}>
              <Image
                source={{ uri }}
                style={styles.previewImage}
                accessibilityLabel={`Selected photo ${index + 1}`}
              />
              <View style={styles.previewControls}>
                <Pressable
                  onPress={() => moveBy(index, -1)}
                  disabled={index === 0}
                  style={[styles.previewButton, index === 0 && styles.previewButtonDisabled]}
                  accessibilityRole="button"
                  accessibilityLabel={`Move photo ${index + 1} earlier`}
                >
                  <IconSymbol name="chevron.left" size={14} color={colors.cloudWhite} fallback="‹" />
                </Pressable>
                <Pressable
                  onPress={() => removeAt(index)}
                  style={styles.previewButton}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove photo ${index + 1}`}
                >
                  <IconSymbol name="xmark" size={14} color={colors.cloudWhite} fallback="✕" />
                </Pressable>
                <Pressable
                  onPress={() => moveBy(index, 1)}
                  disabled={index === photoUris.length - 1}
                  style={[
                    styles.previewButton,
                    index === photoUris.length - 1 && styles.previewButtonDisabled,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Move photo ${index + 1} later`}
                >
                  <IconSymbol name="chevron.right" size={14} color={colors.cloudWhite} fallback="›" />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.buttons}>
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
          accessibilityLabel="Add photos from library"
        >
          <Text style={styles.secondaryButtonText}>Add Photos</Text>
        </Pressable>
      </View>

      {pickerError && (
        <Text style={styles.errorText} accessibilityRole="alert">
          {pickerError}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  previewItem: {
    width: 96,
  },
  previewImage: {
    width: 96,
    height: 96,
    borderRadius: radii.control,
    backgroundColor: colors.graphite12,
  },
  previewControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  previewButton: {
    width: 26,
    height: 26,
    borderRadius: radii.control,
    backgroundColor: colors.graphite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewButtonDisabled: {
    opacity: 0.3,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.graphite12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: typography.body.size,
    color: colors.graphite,
    fontWeight: '600',
  },
  errorText: {
    fontSize: typography.caption.size,
    color: colors.error,
    marginTop: spacing.sm,
  },
});
