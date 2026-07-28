import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useSession } from '../auth/session';
import { resolveSelectedAircraftId } from './selectedAircraft';
import { useOwnedAircraft } from './useOwnedAircraft';

function lastUsedAircraftStorageKey(userId: string): string {
  return `digital-hangar:lastUsedAircraftId:${userId}`;
}

// AsyncStorage's read for the current `userId` hasn't resolved yet (or there
// is no signed-in user). Kept as its own state instead of a `null` value so
// "not hydrated yet" is distinguishable from "hydrated, nothing persisted" —
// see `isStorageHydrated` below.
const PENDING = 'pending' as const;
type Hydration = typeof PENDING | { userId: string | null; value: string | null };

/**
 * Home screen's data source (issue #35): the signed-in user's owned
 * aircraft, which one is currently selected, and a setter to switch between
 * them. "Selected" persists to AsyncStorage per user (BRAND.md §8's
 * "defaults to the last-used aircraft, no asset picker on open") via
 * resolveSelectedAircraftId's pure fallback rule, so a returning owner with
 * one aircraft never sees a picker and an owner with several reopens on
 * whichever one they last viewed.
 *
 * `isLoading` stays true until both the owned-aircraft query and the
 * AsyncStorage read for the current user have settled, so HomeScreen never
 * briefly renders the "wrong" default aircraft before the persisted choice
 * loads. Hydration state is derived (`hydration.userId === userId`) rather
 * than reset with a synchronous `setState` at the top of the effect, so
 * every state update here happens from an async callback, not the effect
 * body itself (react-hooks/set-state-in-effect).
 */
export function useSelectedAircraft() {
  const { data: session } = useSession();
  const userId = session?.user.id ?? null;

  const ownedAircraftQuery = useOwnedAircraft();
  const ownedAircraft = ownedAircraftQuery.data ?? [];

  const [hydration, setHydration] = useState<Hydration>(PENDING);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      let value: string | null = null;
      if (userId) {
        try {
          value = await AsyncStorage.getItem(lastUsedAircraftStorageKey(userId));
        } catch {
          value = null;
        }
      }
      if (!cancelled) {
        setHydration({ userId, value });
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const isStorageHydrated = hydration !== PENDING && hydration.userId === userId;
  const lastUsedId = hydration !== PENDING ? hydration.value : null;

  const selectedAircraftId = resolveSelectedAircraftId({
    ownedAircraftIds: ownedAircraft.map((aircraft) => aircraft.id),
    lastUsedId,
  });
  const selectedAircraft =
    ownedAircraft.find((aircraft) => aircraft.id === selectedAircraftId) ?? null;

  function selectAircraft(aircraftId: string) {
    setHydration({ userId, value: aircraftId });
    if (userId) {
      AsyncStorage.setItem(lastUsedAircraftStorageKey(userId), aircraftId).catch(() => {});
    }
  }

  return {
    ownedAircraft,
    selectedAircraft,
    selectAircraft,
    isLoading: ownedAircraftQuery.isLoading || !isStorageHydrated,
    isError: ownedAircraftQuery.isError,
  };
}
