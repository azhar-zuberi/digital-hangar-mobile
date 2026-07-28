// Global Jest setup, wired in via jest.config.js's `setupFiles`.
//
// @react-native-async-storage/async-storage ships a native module that
// isn't mocked by jest-expo's preset (that preset only covers expo-*
// packages) — without this, any test that transitively imports
// src/services/supabaseClient.ts (which imports AsyncStorage directly, for
// Supabase Auth's session storage) crashes with "NativeModule: AsyncStorage
// is null" before a single test runs. This is the package's own documented
// mock:
// https://react-native-async-storage.github.io/async-storage/docs/advanced/jest
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// @supabase/realtime-js requires a native `WebSocket` global (stable from
// Node 22 onward) and throws at client-construction time without one — CI
// runs on Node 20 (.github/workflows/ci.yml), so any test that transitively
// imports src/services/supabaseClient.ts crashes before a single assertion
// runs. `ws` provides a spec-compatible constructor for Node versions that
// don't have a native one.
if (typeof global.WebSocket === 'undefined') {
  global.WebSocket = require('ws');
}
