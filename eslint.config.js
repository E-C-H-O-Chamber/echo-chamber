import js from '@eslint/js';
import tsparser from '@typescript-eslint/parser';
import eslintConfigPrettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.wrangler/**',
      'worker-configuration.d.ts',
      '*.min.js',
      'coverage/**',
    ],
  },
  js.configs.recommended,
  eslintConfigPrettier,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node },
      parser: tsparser,
      parserOptions: { project: './tsconfig.json' },
    },
    extends: [
      tseslint.configs.eslintRecommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      importPlugin.flatConfigs.recommended,
      importPlugin.flatConfigs.typescript,
    ],
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'separate-type-imports',
        },
      ],
      '@typescript-eslint/method-signature-style': ['error', 'method'],
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/no-useless-empty-export': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',
      '@typescript-eslint/promise-function-async': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          varsIgnorePattern: '^_',
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],

      '@typescript-eslint/restrict-template-expressions': [
        'error',
        {
          allowNumber: true,
          allowBoolean: true,
          allowNever: true,
        },
      ],

      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-proto': 'error',
      'no-alert': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-template': 'error',
      'object-shorthand': 'error',
      'no-nested-ternary': 'warn',
      'prefer-object-spread': 'error',
      'no-constructor-return': 'error',
      'no-promise-executor-return': 'error',
      'no-unreachable-loop': 'error',
      'no-await-in-loop': 'error',

      // Workers-specific restrictions
      'no-restricted-globals': [
        'error',
        'window',
        'document',
        'localStorage',
        'sessionStorage',
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.name="setTimeout"]',
          message:
            'Use scheduled events or Durable Object alarms instead of setTimeout in Workers',
        },
        {
          selector: 'CallExpression[callee.name="setInterval"]',
          message:
            'Use scheduled events or Durable Object alarms instead of setInterval in Workers',
        },
      ],

      // Code complexity and maintainability
      complexity: ['warn', 10],
      'max-depth': ['error', 4],
      'max-lines-per-function': ['warn', { max: 120, skipComments: true }],
      'max-params': ['warn', 4],

      // Import/Export ordering and organization
      'import/order': [
        'error',
        {
          groups: [
            'builtin', // Node.js built-in modules (minimal in CF Workers)
            'external', // npm packages (hono, openai, etc.)
            'internal', // Internal modules (src/*)
            'parent', // Parent directories (../)
            'sibling', // Same directory (./)
            'index', // Index files (./index)
            'type', // Type-only imports
          ],
          'newlines-between': 'always',
          pathGroups: [
            {
              pattern: '@/**',
              group: 'internal',
              position: 'before',
            },
            {
              pattern: '~/**',
              group: 'internal',
              position: 'before',
            },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
          distinctGroup: false,
        },
      ],
      'import/first': 'error',
      'import/newline-after-import': 'error',
      'import/no-unresolved': 'off',
    },
  },
  {
    files: ['test/**/*.ts'],
    rules: {
      'max-lines-per-function': 'off',
    },
  }
);
