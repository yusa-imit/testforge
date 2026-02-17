import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  // Ignore build outputs and node_modules
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/build/**',
      'packages/web/dist/**',
      'packages/server/dist/**',
    ],
  },

  // Base JS rules
  js.configs.recommended,

  // TypeScript rules for all TS/TSX files
  ...tseslint.configs.recommended,

  // Global config
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // Allow unused vars with underscore prefix
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      // Allow explicit any in some cases (useful for escape hatches)
      '@typescript-eslint/no-explicit-any': 'warn',
      // Turn off require-returns enforcement for simple functions
      '@typescript-eslint/no-empty-object-type': 'warn',
      // Allow const declarations inside switch cases (common in this codebase)
      'no-case-declarations': 'off',
      // Don't require cause chaining on re-thrown errors
      'preserve-caught-error': 'off',
    },
  },

  // React hooks rules for web package only
  {
    files: ['packages/web/src/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // Relax rules for test files
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
