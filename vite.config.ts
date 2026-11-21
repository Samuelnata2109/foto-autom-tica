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

const pagesBase = '/foto-autom-tica/';
const pagesUrl = `https://samuelnata2109.github.io${pagesBase}`;

function isHttpsOrigin(value: string | undefined) {
  if (!value || !URL.canParse(value)) return false;
  const url = new URL(value);
  return url.protocol === 'https:' && url.href === `${url.origin}/`;
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd());
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (key && !isPublicKey(key))
    throw new Error('Use somente a chave pública do Supabase na configuração VITE.');
  const pages = mode === 'github-pages';
  if (pages && command === 'build') {
    if (!isHttpsOrigin(env.VITE_SUPABASE_URL) || !key)
      throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY para o Pages.');
    if (env.VITE_PHOTO_SHARE_BASE_URL !== pagesUrl)
      throw new Error('Configure VITE_PHOTO_SHARE_BASE_URL com o endereço público do Pages.');
  }
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
