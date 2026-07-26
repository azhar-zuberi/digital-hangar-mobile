import { PlaceholderScreen } from '../../components/PlaceholderScreen';

// Story tab: memories and milestones (timeline_entries where
// type in ('memory','milestone')) per IMPLEMENTATION_SPEC.md §2. Real list
// UI ships in Phase 2 (#13) — this is the placeholder landing spot.
export function StoryScreen() {
  return (
    <PlaceholderScreen
      title="Story"
      message="Memories and milestones will live here."
      symbol="book.closed"
      symbolFallback="📖"
    />
  );
}
