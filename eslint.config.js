// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // 노드에서 도는 운영 스크립트
    files: ['ops/**/*.mjs', 'scripts/**/*.mjs'],
    languageOptions: { globals: { Buffer: 'readonly' } },
  },
  {
    ignores: ['dist/*', 'dist-*/*', '.expo/*', 'ios/*', 'android/*', 'public/*', 'assets/*'],
  },
]);
