import { defineConfig } from 'vitest/config';

// Schema and server package tests intentionally use Node's built-in
// `node:test` runner. Vitest discovers files by the shared *.test.* naming
// convention, so without these exclusions it attempts to execute the Node
// suites as empty Vitest suites and reports "No test suite found". The root
// `npm test` command runs those files through their package-native runner
// before invoking this Vitest configuration for the React/launcher suites.
export default defineConfig({
  test: {
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'packages/schema/**/*.test.js',
      'packages/server/**/*.test.js',
    ],
  },
});
