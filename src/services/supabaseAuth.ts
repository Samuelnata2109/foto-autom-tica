import { browserSupabaseConfig } from '../config/supabaseEnvironment';

export const supabaseConfig = browserSupabaseConfig(
  import.meta.env.MODE,
  {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  },
  globalThis.location?.origin,
);

export async function createAuthClient(signal?: AbortSignal) {
  if (!supabaseConfig) throw new Error('Supabase indisponível.');
  const { AuthClient } = await import('@supabase/auth-js');
  const { root, publishable } = supabaseConfig;
  return new AuthClient({
    url: `${root}/auth/v1`,
    headers: { apikey: publishable },
    detectSessionInUrl: false,
    persistSession: false,
    autoRefreshToken: false,
    fetch: async (input, options) => {
      try {
        return await globalThis.fetch(input, {
          ...options,
          cache: 'no-store',
          signal: AbortSignal.any([
            AbortSignal.timeout(15000),
            ...(signal ? [signal] : []),
            ...(options?.signal ? [options.signal] : []),
          ]),
        });
      } catch {
        return new Response('{}', { status: 503 });
      }
    },
  });
}
