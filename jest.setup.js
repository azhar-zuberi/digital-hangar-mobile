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
