import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  worker: { format: 'es' },
  plugins: [react(), tailwindcss()],
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    // O fluxo de mídia monta várias telas no jsdom e pode exceder 5 s em máquinas lentas.
    testTimeout: 15_000,
  },
});
