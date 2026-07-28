import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '../../components/IconSymbol';
import { groupTimelineEntriesByYear } from '../../features/timeline/timelineGrouping';
import { TimelineEntryCard } from '../../features/timeline/components/TimelineEntryCard';
import { useCurrentAircraftId } from '../../features/timeline/useCurrentAircraftId';
import { useTimelineEntries } from '../../features/timeline/useTimelineEntries';
import { colors, radii, spacing, typography } from '../../utils/tokens';
import type { HangarTabParamList, RootStackParamList } from '../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<HangarTabParamList, 'Story'>,
  NativeStackScreenProps<RootStackParamList>
>;

// Story tab (issue #36): timeline_entries where type in ('memory',
// 'milestone'), reverse chronological, grouped by year, per
// IMPLEMENTATION_SPEC.md §2. `type = 'maintenance'` rows never reach this
// screen — useTimelineEntries -> fetchTimelineEntries filters them out
// server-side, per CLAUDE.md's Care/Story split.
export function StoryScreen({ navigation, route }: Props) {
  const { data: aircraftId, isLoading: isLoadingAircraft } = useCurrentAircraftId();
  const {
    data: entries,
    isLoading: isLoadingEntries,
    isError,
    isRefetching,
    refetch,
  } = useTimelineEntries(aircraftId);

  const sections = groupTimelineEntriesByYear(entries ?? []);
  const listRef = useRef<SectionList>(null);

  // Add-flow success handoff (IMPLEMENTATION_SPEC.md §2 AC: "refresh list,
  // scroll to new entry") — AddTimelineEntryScreen hands the new entry's id
  // back via this param; once it shows up in the (now-refetched) grouped
  // sections, scroll it into view and clear the param so this doesn't
  // re-fire on a later unrelated navigation back to Story.
  const scrollToEntryId = route.params?.scrollToEntryId;
  useEffect(() => {
    if (!scrollToEntryId) return;

    for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
      const itemIndex = sections[sectionIndex].data.findIndex(
        (entry) => entry.id === scrollToEntryId,
      );
      if (itemIndex >= 0) {
        listRef.current?.scrollToLocation({
          sectionIndex,
          itemIndex,
          animated: true,
          viewOffset: 0,
        });
        navigation.setParams({ scrollToEntryId: undefined });
        return;
      }
    }
    // Entry not in the list yet (refetch still in flight) — leave the param
    // in place so the next render (once data lands) tries again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollToEntryId, sections]);

  function openAddEntry() {
    if (!aircraftId) return;
    navigation
      .getParent<NativeStackScreenProps<RootStackParamList>['navigation']>()
      ?.navigate('AddTimelineEntry', { aircraftId });
  }

  function openDetail(entryId: string) {
    navigation
      .getParent<NativeStackScreenProps<RootStackParamList>['navigation']>()
      ?.navigate('TimelineEntryDetail', { entryId });
  }

  if (isLoadingAircraft || (isLoadingEntries && !isRefetching)) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.brass} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>
          Your Story couldn&apos;t load just now. Pull down to try again.
        </Text>
      </View>
    );
  }

  if (!aircraftId || sections.length === 0) {
    return (
      <View style={styles.centered}>
        <IconSymbol name="book.closed" size={32} color={colors.graphite60} fallback="📖" />
        <Text style={styles.emptyTitle}>No memories yet. Start by adding one.</Text>
        {aircraftId && (
          <Pressable
            onPress={openAddEntry}
            style={styles.emptyButton}
            accessibilityRole="button"
            accessibilityLabel="Add Entry"
          >
            <Text style={styles.emptyButtonText}>Add Entry</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <SectionList
      ref={listRef}
      style={styles.list}
      sections={sections}
      keyExtractor={(entry) => entry.id}
      renderItem={({ item }) => (
        <TimelineEntryCard entry={item} onPress={() => openDetail(item.id)} />
      )}
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>{section.title}</Text>
        </View>
      )}
      onScrollToIndexFailed={() => {}}
      refreshing={isRefetching}
      onRefresh={refetch}
      stickySectionHeadersEnabled
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: colors.ivory,
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
  emptyTitle: {
    marginTop: spacing.md,
    fontSize: typography.body.size,
    color: colors.graphite60,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.control,
    backgroundColor: colors.brass,
  },
  emptyButtonText: {
    fontSize: typography.body.size,
    fontWeight: '600',
    color: colors.ivory,
  },
  sectionHeader: {
    backgroundColor: colors.ivory,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  sectionHeaderText: {
    fontSize: typography.title2.size,
    fontWeight: typography.title2.weight,
    color: colors.graphite,
  },
});
