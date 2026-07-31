import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { TimelinePhotoGallery } from '../../features/timeline/components/TimelinePhotoGallery';
import { useTimelineEntry } from '../../features/timeline/useTimelineEntry';
import { colors, spacing, typography } from '../../utils/tokens';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'TimelineEntryDetail'>;

function formatEventDate(eventDate: string): string {
  const [year, month, day] = eventDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

// Story entry detail (issue #36 AC): title, event date, full description,
// photo gallery. Edit/delete are explicitly optional for MVP per the
// issue's notes and are not built here. Back navigation is the native
// stack's default back button/gesture (this screen is a root-stack push,
// same as AircraftProfile), so there's no bespoke header button.
export function TimelineEntryDetailScreen({ route }: Props) {
  const { entryId } = route.params;
  const { data: entry, isLoading, isError } = useTimelineEntry(entryId);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.skyBlue} />
      </View>
    );
  }

  if (isError || !entry) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>This entry isn&apos;t available right now.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TimelinePhotoGallery photos={entry.photos} />

      <View style={styles.body}>
        {entry.type === 'milestone' && <Text style={styles.badge}>Milestone</Text>}
        <Text style={styles.title} accessibilityRole="header">
          {entry.title}
        </Text>
        <Text style={styles.date}>{formatEventDate(entry.event_date)}</Text>
        {entry.description && <Text style={styles.description}>{entry.description}</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cloudWhite,
  },
  content: {
    paddingBottom: spacing.xxxl,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.cloudWhite,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  message: {
    fontSize: typography.body.size,
    color: colors.graphite60,
    textAlign: 'center',
  },
  body: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  badge: {
    alignSelf: 'flex-start',
    fontSize: typography.caption.size,
    fontWeight: '600',
    color: colors.skyBlue,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: typography.title1.size,
    fontWeight: typography.title1.weight,
    color: colors.graphite,
  },
  date: {
    marginTop: spacing.xs,
    fontSize: typography.caption.size,
    color: colors.graphite60,
  },
  description: {
    marginTop: spacing.lg,
    fontSize: typography.body.size,
    color: colors.graphite,
    lineHeight: typography.body.size * 1.4,
  },
});
