import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const nodeGlobals = {
  process: 'readonly',
  console: 'readonly',
};

export default tseslint.config(
  { ignores: ['node_modules/', 'dist/', 'coverage/', '.wrangler/', 'public/sw.js'] },
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
);
