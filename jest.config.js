// Jest + React Native Testing Library, per issue #12 (CI/CD + test framework
// setup). `jest-expo` supplies the RN/Expo-flavored preset — native module
// mocks, asset transforms, `transformIgnorePatterns`, and Babel via
// `expo/internal/babel-preset` — so we only layer discovery/coverage config
// on top rather than re-declaring anything the preset already handles.
//
// Detox (on-device E2E) is deliberately NOT wired up here — see README
// "Testing" section for the reasoning and revisit criteria.
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)', '**/?(*.)+(test).[jt]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/.expo/'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/models/database.types.ts'],
  // See jest.setup.js — mocks @react-native-async-storage/async-storage,
  // which isn't covered by jest-expo's preset. Added here (issue #36) once
  // a Story-tab test first exercised the src/services/supabaseClient.ts
  // import chain that pulls it in.
  setupFiles: ['<rootDir>/jest.setup.js'],
};
