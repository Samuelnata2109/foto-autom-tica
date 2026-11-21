const publishable = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

function serviceOrigin(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ||
      (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
      ? url.origin
      : null;
  } catch {
    return null;
  }
}

const root = serviceOrigin(import.meta.env.VITE_SUPABASE_URL);
export const supabaseConfig = root && publishable ? { root, publishable } : null;

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
