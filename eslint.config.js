import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['dist/', 'coverage/', 'public/mediapipe/wasm/']),
  js.configs.recommended,
  { files: ['**/*.{ts,tsx}'], extends: [tseslint.configs.recommended] },
]);
