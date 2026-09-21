import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import sveltePlugin from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';
import globals from 'globals';

export default [
  // Base configuration
  js.configs.recommended,

  // Global ignores
  {
    ignores: [
      'public/build/**',
      'node_modules/**',
      'dist/**',
      // Generated engine mirrors (tsup output + minified bundle), verified via scripts/gate-*.mjs
      'public/lib/**',
      'public/index.js',
      'public/index.d.ts',
      'public/webgpu.js',
      'public/chunk-*.js',
      'public/three-particles*.js',
      // Scratch artifacts (probes / one-shot dumps, regenerated on demand)
      'tmp/**',
      'tmp*',
      'out_*.js',
      't1.js',
      'vs.tmp.js',
      'bundle-dl.js',
      'served_bundle.js',
      'reg-editor*.json',
      'publish-*.log',
      'packages/*.log',
    ],
  },

  // JavaScript and TypeScript files
  {
    files: ['**/*.js', '**/*.mjs', '**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tsParser,
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
        // Analytics loader stub declared inline in public/examples.html
        gtag: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      'no-unused-vars': ['warn'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
    },
  },

  // Test files (Jest)
  {
    files: ['**/__tests__/**/*.js', '**/__tests__/**/*.ts', '**/*.test.js', '**/*.test.ts'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },

  // Svelte files
  ...sveltePlugin.configs['flat/recommended'],
  {
    files: ['**/*.svelte'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: svelteParser,
      parserOptions: {
        parser: tsParser,
      },
      globals: {
        ...globals.browser,
        gtag: 'readonly',
      },
    },
    plugins: {
      svelte: sveltePlugin,
    },
    rules: {
      'no-unused-vars': ['warn'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
];
