import { QueryClient } from '@tanstack/react-query';

// Single shared TanStack Query client for all server state (aircraft, timeline,
// squawks, reminders, flights). Per IMPLEMENTATION_SPEC.md §4 and CLAUDE.md,
// this replaces Redux for server state; local UI state stays in React state/Context.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 30,
    },
  },
});
