// ESLint v9+ flat config format with typescript-eslint v8+
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import js from '@eslint/js';

// Common Node.js globals
const nodeGlobals = {
  process: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
  module: 'readonly',
  require: 'readonly',
  console: 'readonly',
  Buffer: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  AbortController: 'readonly',
  URL: 'readonly',
  global: 'readonly',
};

export default [
  // Use ESLint's recommended rules as base
  js.configs.recommended,
  
  // Apply TS rules to TypeScript files
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: nodeGlobals,
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'indent': ['error', 2, { SwitchCase: 1 }],
      'quotes': ['error', 'single', { avoidEscape: true }],
      // TypeScript-specific rules
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        // Don't report unused enum values
        ignoreRestSiblings: true,
        destructuredArrayIgnorePattern: '^_',
      }],
      // Allow TypeScript enums to be unused
      'no-unused-vars': 'off',
    },
  },
  
  // Apply basic JS rules to JavaScript files
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: nodeGlobals,
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'indent': ['error', 2, { SwitchCase: 1 }],
      'quotes': ['error', 'single', { avoidEscape: true }],
    },
  },
  
  // Ignore build output and node_modules
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**']
  }
];
