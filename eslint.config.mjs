// ESLint flat config de la app (eslint-config-expo + reglas de calidad del curso).
import { defineConfig, globalIgnores } from 'eslint/config';
import expoConfig from 'eslint-config-expo/flat.js';

const calidad = {
  complexity: ['error', 10],
  'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
  'max-depth': ['error', 3],
  'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
  'no-console': 'error',
  eqeqeq: ['error', 'always'],
  'no-warning-comments': ['error', { terms: ['todo', 'fixme', 'xxx'] }],
};

export default defineConfig([
  expoConfig,
  { rules: calidad },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-ignore': true, 'ts-nocheck': true, 'ts-expect-error': true },
      ],
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['tests/**/*.ts', '**/*.test.mjs'],
    rules: { 'max-lines-per-function': 'off' },
  },
  globalIgnores(['dist/**', 'coverage/**', '.expo/**', 'android/**', 'ios/**', 'expo-env.d.ts']),
]);
