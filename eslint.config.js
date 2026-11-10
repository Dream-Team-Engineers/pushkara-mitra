import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const nodeGlobals = {
  process: 'readonly',
  console: 'readonly',
  fetch: 'readonly',
  URL: 'readonly',
  WebSocket: 'readonly',
  setTimeout: 'readonly',
};

export default tseslint.config(
  {
    ignores: [
      'node_modules/',
      'dist/',
      'coverage/',
      '.wrangler/',
      'public/sw.js',
      'web/build/sw.template.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: { allowDefaultProject: ['*.js', 'scripts/*.mjs'] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    files: ['**/*.mjs', '*.js'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      // These plain Node scripts already disable type-aware rules. Do not create
      // default TypeScript projects for them; TypeScript source stays checked.
      globals: nodeGlobals,
      parserOptions: { projectService: false, project: false },
    },
  },
  {
    files: ['public/assets/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      parserOptions: { project: false, projectService: false },
      globals: {
        document: 'readonly',
        window: 'readonly',
        navigator: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        fetch: 'readonly',
        AbortSignal: 'readonly',
        MessageChannel: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },
  },
);
