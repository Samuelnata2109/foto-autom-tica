export type Admin = {
  rpc<T>(name: string, values?: Record<string, unknown>): Promise<T>;
  upload(path: string, data: Uint8Array<ArrayBuffer>): Promise<boolean>;
  download(path: string): Promise<Blob | null>;
  remove(path: string): Promise<boolean>;
};

export function supabaseBackend(url: string, secret: string) {
  const root = url.replace(/\/$/, '');
  const bucket = root + '/storage/v1/object';
  const keys = {
    apikey: secret,
    ...(secret.startsWith('sb_secret_') ? {} : { Authorization: `Bearer ${secret}` }),
  };
  const call = (target: string, options?: RequestInit, timeout = 10000) =>
    fetch(target, {
      ...options,
      signal: AbortSignal.timeout(timeout),
      headers: { ...keys, ...options?.headers },
    });
  const fileUrl = (path: string, authenticated = false) =>
    `${bucket}${authenticated ? '/authenticated' : ''}/booth-photos/${encodeURIComponent(path)}`;
  const admin: Admin = {
    async rpc<T>(name: string, values = {}) {
      const result = await call(root + '/rest/v1/rpc/' + name, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!result.ok) throw new Error('Database operation failed');
      return (result.status === 204 ? null : await result.json()) as T;
    },
    async upload(path, data) {
      const result = await call(
        fileUrl(path),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'image/jpeg',
            'x-upsert': 'false',
            'Cache-Control': 'no-store',
          },
          body: data,
        },
        25000,
      );
      return result.ok;
    },
    async download(path) {
      const result = await call(fileUrl(path, true));
      if (
        result.status === 404 ||
        (result.status === 400 &&
          (
            await result
              .clone()
              .json()
              .catch(() => ({}))
          ).statusCode === '404')
      )
        return null;
      if (!result.ok) throw new Error('Storage download failed');
      return result.blob();
    },
    async remove(path) {
      // The Storage API deletes metadata and the physical object together.
      const result = await call(bucket + '/booth-photos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefixes: [path] }),
      });
      return result.ok || result.status === 404;
    },
  };
  return {
    admin,
    async operator(authorization: string | null, allowed: ReadonlySet<string>) {
      if (!authorization?.startsWith('Bearer ')) return null;
      const result = await call(root + '/auth/v1/user', {
        headers: { Authorization: authorization },
      });
      if (!result.ok) return null;
      const user = (await result.json()) as { id?: string };
      return user.id && allowed.has(user.id) ? user.id : null;
    },
  };
}
