module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-unused-vars': 'error',
    'no-console': 'off', // Allow console for server logging
    'prefer-const': 'error',
    'no-var': 'error',
  },
  ignorePatterns: [
    'dist/',
    'node_modules/',
    '*.ts', // Skip TypeScript files for now
  ],
};