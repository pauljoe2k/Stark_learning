import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  ...tseslint.configs.recommended,
  {
    files: ['**/*.tsx', '**/*.ts'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      ...reactHooks.configs.recommended.rules,
    },
  },
);
