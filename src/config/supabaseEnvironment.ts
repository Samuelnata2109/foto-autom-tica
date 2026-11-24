export const pagesBase = '/foto-autom-tica/';
const pagesOrigin = 'https://samuelnata2109.github.io';
export const pagesUrl = pagesOrigin + pagesBase;

const productionOrigin = 'https://zzckkrherwyspqtkhokm.supabase.co';
const stagingOrigin = 'https://sdcthjviahstkqlhrtrh.supabase.co';
const localOrigins = new Set([
  'http://127.0.0.1:54321',
  'http://localhost:54321',
  'http://[::1]:54321',
]);

type PublicEnv = {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_PHOTO_SHARE_BASE_URL?: string;
};

function parseOrigin(value: string | undefined) {
  const url = URL.parse(value ?? '');
  return url && url.href === url.origin + '/' ? url.origin : null;
}

function allowedOrigin(mode: string, origin: string) {
  if (mode === 'github-pages') return origin === productionOrigin;
  if (mode === 'homologacao') return origin === stagingOrigin;
  if (mode === 'development' || mode === 'production') {
    return origin === stagingOrigin || localOrigins.has(origin);
  }
  return false;
}

function isPublicKey(key: string) {
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return true;
  const parts = key.split('.');
  const payload = parts[1];
  if (parts.length !== 3 || !payload || !parts.every((part) => /^[\w-]+$/.test(part))) {
    return false;
  }
  try {
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))).role === 'anon';
  } catch {
    return false;
  }
}

export function validateSupabaseEnvironment(mode: string, env: PublicEnv) {
  const { VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: key } = env;
  if (key && !isPublicKey(key)) {
    throw new Error(
      `Modo ${mode}: use apenas uma chave publicável ou uma chave legada anon do Supabase.`,
    );
  }
  if (mode === 'test') return;

  if (!url || !key) {
    throw new Error(`Modo ${mode}: configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.`);
  }

  // Check production even when the input URL contains an unwanted path.
  if (mode !== 'github-pages' && URL.parse(url)?.origin === productionOrigin) {
    throw new Error(`Modo ${mode}: Supabase de produção bloqueado. Use um projeto de teste.`);
  }
  const origin = parseOrigin(url);
  if (!origin || !allowedOrigin(mode, origin)) {
    const expected =
      mode === 'github-pages'
        ? productionOrigin
        : mode === 'homologacao'
          ? stagingOrigin
          : 'a origem do Supabase de homologação ou Supabase local na porta 54321';
    throw new Error(
      `Modo ${mode}: VITE_SUPABASE_URL deve ser ${expected}, sem caminho ou parâmetros.`,
    );
  }
  const shareBase = env.VITE_PHOTO_SHARE_BASE_URL;
  if (mode === 'github-pages' && shareBase !== pagesUrl) {
    throw new Error('Configure VITE_PHOTO_SHARE_BASE_URL com o endereço público do GitHub Pages.');
  }
  if (mode !== 'github-pages' && URL.parse(shareBase ?? '')?.origin === pagesOrigin) {
    throw new Error(`Modo ${mode}: use uma URL pública do mesmo ambiente para o QR Code.`);
  }
}

export function browserSupabaseConfig(
  mode: string,
  env: PublicEnv,
  pageOrigin: string | undefined,
) {
  const root = parseOrigin(env.VITE_SUPABASE_URL);
  const publishable = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (
    !root ||
    !allowedOrigin(mode, root) ||
    !publishable ||
    !isPublicKey(publishable) ||
    (mode === 'github-pages' && pageOrigin !== pagesOrigin)
  ) {
    return null;
  }
  return { root, publishable };
}
