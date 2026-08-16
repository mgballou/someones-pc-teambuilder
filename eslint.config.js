import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/coverage/**',
      'packages/dex/data/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      // A leading underscore is the codebase's way of saying "destructured to
      // discard it" — most often to omit immutable columns from an update.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      'no-restricted-syntax': [
        'error',
        {
          selector: "TSTypeReference[typeName.name='Function']",
          message: 'Name the signature instead of using Function.',
        },
      ],
    },
  },
  {
    // The domain core is pure: no clock, no ambient randomness, no I/O.
    files: ['packages/core/src/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'Date', message: 'core is pure. Pass time in as an argument.' },
        { name: 'fetch', message: 'core is pure. I/O belongs in @spc/dex or the web app.' },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'core is pure. Pass a seed in.' },
        { object: 'Date', property: 'now', message: 'core is pure. Pass time in.' },
      ],
    },
  },
)
