import { readFileSync } from 'node:fs';

// Files assigned to the native Node test runner (test/runners.json) are excluded
// from Jest so every test file belongs to exactly one runner during coexistence.
const nativeTests = JSON.parse(
  readFileSync(new URL('./test/runners.json', import.meta.url), 'utf8')
).native;
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.(js|ts)$": "$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true
      },
    ],
  },
  testMatch: ["**/*.test.ts"],
  testPathIgnorePatterns: [
    "/node_modules/",
    ...nativeTests.map((file) => `<rootDir>/${escapeRegex(file)}$`),
  ],
  // Staged native output carries its own package.json; keep Jest's haste map from
  // reporting a duplicate package name.
  modulePathIgnorePatterns: ["<rootDir>/.test-build/"],
  collectCoverage: true,
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts", "!test/**/*.ts"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
  setupFilesAfterEnv: ["./test/setup.js"],
  moduleDirectories: ["node_modules", "<rootDir>"]
};
