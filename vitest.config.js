import { defineConfig } from 'vitest/config';

// Schema and server package tests intentionally use Node's built-in
// `node:test` runner. Vitest discovers files by the shared *.test.* naming
// convention, so without these exclusions it attempts to execute the Node
// suites as empty Vitest suites and reports "No test suite found". The root
// `npm test` command runs those files through their package-native runner
// before invoking this Vitest configuration for the React/launcher suites.
export default defineConfig({
  // Match the player Vite config's React transform when Vitest is launched
  // from the repository root. Automatic JSX runtime prevents component
  // modules that import named React hooks from needing a separate default
  // `React` binding solely because they contain JSX.
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  test: {
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'packages/schema/**/*.test.js',
      'packages/server/**/*.test.js',
    ],
  },
});
