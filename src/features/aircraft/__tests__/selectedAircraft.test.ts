import { resolveSelectedAircraftId } from '../selectedAircraft';

// Covers Home's "which aircraft to show by default" decision (issue #35 /
// BRAND.md §8) in isolation from useSelectedAircraft.ts's AsyncStorage and
// query wiring — same rationale as homeGate.test.ts for decideHomeGate.
describe('resolveSelectedAircraftId', () => {
  it('uses the persisted last-used id when it is still one of the owned aircraft', () => {
    expect(
      resolveSelectedAircraftId({
        ownedAircraftIds: ['a', 'b', 'c'],
        lastUsedId: 'b',
      }),
    ).toBe('b');
  });

  it('falls back to the first owned aircraft when nothing is persisted yet', () => {
    expect(
      resolveSelectedAircraftId({
        ownedAircraftIds: ['a', 'b'],
        lastUsedId: null,
      }),
    ).toBe('a');
  });

  it('falls back to the first owned aircraft when the persisted id is no longer owned', () => {
    expect(
      resolveSelectedAircraftId({
        ownedAircraftIds: ['a', 'b'],
        lastUsedId: 'stale-id-from-a-removed-aircraft',
      }),
    ).toBe('a');
  });

  it('returns null when the user owns no aircraft at all', () => {
    expect(
      resolveSelectedAircraftId({
        ownedAircraftIds: [],
        lastUsedId: 'anything',
      }),
    ).toBeNull();
  });
});
