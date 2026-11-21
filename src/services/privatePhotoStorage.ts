import type { SessionPhoto } from '../types/photo';

const publishable = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
function storageUrl(value: string | undefined) {
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
const root = storageUrl(import.meta.env.VITE_SUPABASE_URL);
export const storageConfigured = Boolean(root && publishable);

export type PhotoAccess = { id: string; session: string; proof: string };

export function createPhotoAccess(): PhotoAccess {
  return {
    id: crypto.randomUUID(),
    session: crypto.randomUUID(),
    proof: Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join(''),
  };
}

export class PhotoStorageError extends Error {
  constructor(public readonly status: number) {
    super('Operação de armazenamento indisponível.');
  }
}

function credentials() {
  if (!root || !publishable) throw new PhotoStorageError(503);
  return { root, publishable };
}

export async function signInOperator(email: string, password: string, signal: AbortSignal) {
  const config = credentials();
  const response = await fetch(config.root + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { apikey: config.publishable, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
  });
  if (!response.ok) throw new PhotoStorageError(response.status);
  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) throw new PhotoStorageError(401);
  await callStorage(data.access_token, 'operator', {}, signal);
  return data.access_token;
}

async function callStorage(
  token: string,
  action: string,
  extra: Record<string, string>,
  signal: AbortSignal,
  photo?: Blob,
) {
  const config = credentials();
  const result = await fetch(config.root + '/functions/v1/booth-photos', {
    method: 'POST',
    headers: {
      apikey: config.publishable,
      Authorization: `Bearer ${token}`,
      'X-Booth-Action': action,
      ...extra,
    },
    body: photo,
    signal: AbortSignal.any([signal, AbortSignal.timeout(55000)]),
  });
  if (!result.ok) throw new PhotoStorageError(result.status);
  return result;
}

function sessionHeaders(access: PhotoAccess) {
  return {
    'X-Booth-Photo': access.id,
    'X-Booth-Session': access.session,
    'X-Booth-Proof': access.proof,
  };
}

export async function storeConfirmedPhoto(
  token: string,
  access: PhotoAccess,
  photo: SessionPhoto,
  signal: AbortSignal,
) {
  const response = await callStorage(
    token,
    'upload',
    {
      ...sessionHeaders(access),
      'Content-Type': 'image/jpeg',
      'X-Booth-Consent': '24h-v1',
      'X-Booth-Scenario': photo.scenarioId ?? 'original',
    },
    signal,
    photo.blob,
  );
  const data = (await response.json()) as { expiresAt?: string };
  if (!data.expiresAt || !Number.isFinite(Date.parse(data.expiresAt)))
    throw new PhotoStorageError(503);
  return data.expiresAt;
}

export async function deleteStoredPhoto(token: string, access: PhotoAccess, signal: AbortSignal) {
  const response = await callStorage(token, 'delete', sessionHeaders(access), signal);
  return response.status === 204;
}
