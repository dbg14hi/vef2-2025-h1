import pluginJs from '@eslint/js';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    languageOptions: {
      parser: tsParser,  // Use the TypeScript parser
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
      },
    },
  },
  {
    ...pluginJs.configs.recommended,
    ignores: ['dist/**'], // Ignore the 'dist' folder
    rules: {
      'no-console': ['error', { allow: ['info', 'group', 'groupEnd', 'error'] }],
    },
  },
];
