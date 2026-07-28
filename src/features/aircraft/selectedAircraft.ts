// Which aircraft Home should show by default (issue #35 / BRAND.md §8 —
// "Defaults to the last-used aircraft... no asset picker on open"),
// extracted as a pure function so the decision is testable without mocking
// AsyncStorage or a query client, same rationale as
// src/app/navigation/homeGate.ts's `decideHomeGate`.
//
// Rule: use the persisted last-used id if it's still one of the owner's
// aircraft (it may not be — the aircraft could have been removed, or this
// could be a different signed-in user whose storage key hasn't been read
// yet); otherwise fall back to the first owned aircraft in membership order
// (oldest membership first, per fetchOwnedAircraft's ordering). Returns null
// only when the user owns no aircraft at all.
export function resolveSelectedAircraftId(params: {
  ownedAircraftIds: string[];
  lastUsedId: string | null;
}): string | null {
  const { ownedAircraftIds, lastUsedId } = params;

  if (lastUsedId && ownedAircraftIds.includes(lastUsedId)) {
    return lastUsedId;
  }

  return ownedAircraftIds[0] ?? null;
}
