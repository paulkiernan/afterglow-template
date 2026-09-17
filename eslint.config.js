import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

// Node-side tooling: build/verify scripts and tool configuration files.
const toolingFiles = ['*.config.{js,mjs,cjs}', 'scripts/**/*.{js,mjs,cjs}'];

export default [
  {
    // Build output, generated declarations, and tool reports. Hand-written
    // TypeScript declarations (src/library.d.ts) are not matched by any
    // JavaScript file pattern below, so no TypeScript parser is needed.
    ignores: ['node_modules/', 'dist/', 'lib/', 'test-results/', 'playwright-report/'],
  },

  js.configs.recommended,

  {
    // Demo app, published library entry, theme/content modules: browser code.
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    settings: { react: { version: 'detect' } },
    rules: {
      // Core no-unused-vars has no JSX awareness, so the plugin's usage
      // marker keeps component imports that appear only in JSX from being
      // reported as unused. The rest of eslint-plugin-react stays off: the
      // published types describe the component API, so prop-types rules would
      // add noise without adding checks.
      'react/jsx-uses-vars': 'error',
      // New JSX runtime: React does not need to be in scope for JSX to work.
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',

      // The supported hooks rules only. The React Compiler diagnostics that
      // eslint-plugin-react-hooks v7 bundles into its recommended preset stay
      // off: this template's imperative WebGL component is outside what those
      // rules model, so enabling them would mean disabling them again.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  {
    // Fast refresh is a dev-server concern for the demo's JSX modules. The
    // library entry point is published to npm and exports LightField together
    // with its palettes, settings, and theme helpers by design, so it is out
    // of scope for a rule about Vite HMR boundaries.
    files: ['src/**/*.{js,jsx}'],
    ignores: ['src/library.js', 'src/library.jsx'],
    plugins: { 'react-refresh': reactRefresh },
    rules: {
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }],
    },
  },

  {
    // Vite, Playwright, and ESLint configuration plus repo scripts run in Node.
    files: toolingFiles,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
  },

  {
    // Playwright specs run in Node, but the callbacks passed to page.evaluate
    // are serialized into the browser, so both global sets are legitimate here.
    files: ['tests/**/*.{js,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser },
    },
  },
];
