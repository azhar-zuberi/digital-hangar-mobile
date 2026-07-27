import { useMutation } from '@tanstack/react-query';

import { searchAircraftByRegistration } from './aircraftApi';

// Backs the "Find an Aircraft" search screen (issue #26). A mutation, not a
// query: the search is an explicit, user-triggered action (tap Search / hit
// return on the registration field), not server state to keep subscribed in
// the background — same shape as useSocialSignIn's sign-in action. Per the
// issue's implementation notes, search is stateless: nothing here persists a
// results list or favorites across calls.
export function useAircraftSearch() {
  return useMutation({
    mutationFn: searchAircraftByRegistration,
  });
}
