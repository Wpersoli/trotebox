import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
    }
  },
  {
    files: ['packages/**/*.{js,jsx,ts,tsx,mjs,cjs}'],
    rules: {
      '@next/next/no-html-link-for-pages': 'off',
      '@next/next/no-img-element': 'off'
    }
  },
  globalIgnores([
    '**/.next/**',
    '**/out/**',
    '**/dist/**',
    '**/coverage/**',
    '**/node_modules/**',
    '**/android/**',
    '**/ios/**',
    '**/next-env.d.ts'
  ])
]);
