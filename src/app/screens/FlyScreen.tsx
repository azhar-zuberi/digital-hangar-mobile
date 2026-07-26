import { PlaceholderScreen } from '../../components/PlaceholderScreen';

// Fly tab: flights, hours, and routes (the `flights` table added per
// ADDENDUM.md §B) per IMPLEMENTATION_SPEC.md §2. Real list UI ships in
// Phase 4 (#15) — this is the placeholder landing spot.
export function FlyScreen() {
  return (
    <PlaceholderScreen
      title="Fly"
      message="Flights, hours, and routes will live here."
      symbol="airplane"
      symbolFallback="✈️"
    />
  );
}
