import { QueryClientProvider } from '@tanstack/react-query';

import { queryClient } from '../services/queryClient';
import { HomeScreen } from './screens/HomeScreen';

// Root component. Navigation (Story / Care / Fly tabs) is added in a later
// Phase 1 issue — this scaffold wires up the app-wide providers (TanStack
// Query for server state, per IMPLEMENTATION_SPEC.md §4) and a single
// placeholder screen so the project builds and runs end to end.
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HomeScreen />
    </QueryClientProvider>
  );
}
