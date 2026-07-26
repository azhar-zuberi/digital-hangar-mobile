import { PlaceholderScreen } from '../../components/PlaceholderScreen';

// Care tab: maintenance history (timeline_entries where type = 'maintenance'
// — same table as Story, queried separately per CLAUDE.md's schema note),
// squawks, and reminders. Squawks and reminders are always member-only
// regardless of the aircraft's visibility setting (CLAUDE.md — this is a
// deliberate rule, not something to relax when Phase 3 (#14) builds real
// data fetching here). This screen is just the placeholder landing spot.
export function CareScreen() {
  return (
    <PlaceholderScreen
      title="Care"
      message="Maintenance, squawks, and reminders will live here."
      symbol="wrench.and.screwdriver"
      symbolFallback="🔧"
    />
  );
}
