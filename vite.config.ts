import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import process from 'node:process';
import { pagesBase, validateSupabaseEnvironment } from './src/config/supabaseEnvironment.ts';

export default defineConfig(({ command, isPreview, mode }) => {
  const env = loadEnv(mode, process.cwd());
  const pages = mode === 'github-pages';
  if (pages && command === 'serve' && !isPreview) {
    throw new Error(
      'O modo github-pages é reservado ao build publicado. Use development ou homologacao.',
    );
  }
  validateSupabaseEnvironment(mode, env);
  return {
    base: pages ? pagesBase : '/',
    worker: { format: 'es' },
    plugins: [react(), tailwindcss()],
    test: {
      include: ['tests/**/*.test.{ts,tsx}'],
      // O fluxo de mídia monta várias telas no jsdom e pode exceder 5 s em máquinas lentas.
      testTimeout: 15_000,
    },
  };
});
