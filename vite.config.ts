import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import { Buffer } from 'node:buffer';
import process from 'node:process';

function isPublicKey(key: string) {
  if (key.startsWith('sb_publishable_')) return true;
  try {
    const parts = key.split('.');
    if (parts.length !== 3 || !parts[1]) return false;
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString()).role === 'anon';
  } catch {
    return false;
  }
}

export default defineConfig(({ mode }) => {
  const key = loadEnv(mode, process.cwd()).VITE_SUPABASE_PUBLISHABLE_KEY;
  if (key && !isPublicKey(key))
    throw new Error('Use somente a chave pública do Supabase na configuração VITE.');
  return {
    worker: { format: 'es' },
    plugins: [react(), tailwindcss()],
    test: {
      include: ['tests/**/*.test.{ts,tsx}'],
      // O fluxo de mídia monta várias telas no jsdom e pode exceder 5 s em máquinas lentas.
      testTimeout: 15_000,
    },
  };
});
