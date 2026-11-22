import type { SessionPhoto } from '../types/photo';
import { createAuthClient, supabaseConfig } from './supabaseAuth';

export const storageConfigured = Boolean(supabaseConfig);

export type PhotoAccess = { id: string; session: string; proof: string };

export function createPhotoSecret() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

export function createPhotoAccess(): PhotoAccess {
  return {
    id: crypto.randomUUID(),
    session: crypto.randomUUID(),
    proof: createPhotoSecret(),
  };
}

export class PhotoStorageError extends Error {
  constructor(public readonly status: number) {
    super('Operação de armazenamento indisponível.');
  }
}

function credentials() {
  if (!supabaseConfig) throw new PhotoStorageError(503);
  return supabaseConfig;
}

export type OperatorSession = { token: string; expiresAt: number };

export async function signInOperator(
  email: string,
  password: string,
  signal: AbortSignal,
): Promise<OperatorSession> {
  const auth = await createAuthClient(signal);
  const { data, error } = await auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new PhotoStorageError(error?.status ?? 401);
  const { access_token: token, expires_at, expires_in } = data.session;
  const expiresAt = (expires_at ?? Math.floor(Date.now() / 1000) + expires_in) * 1000;
  await callStorage(token, 'operator', {}, signal);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) throw new PhotoStorageError(401);
  return { token, expiresAt };
}

export async function callStorage(
  token: string | null,
  action: string,
  extra: Record<string, string>,
  signal: AbortSignal,
  body?: Blob | string,
) {
  const config = credentials();
  const result = await fetch(config.root + '/functions/v1/booth-photos', {
    method: 'POST',
    headers: {
      apikey: config.publishable,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'X-Booth-Action': action,
      ...extra,
    },
    body,
    cache: 'no-store',
    referrerPolicy: 'no-referrer',
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

export async function shareStoredPhoto(
  token: string,
  access: PhotoAccess,
  secret: string,
  signal: AbortSignal,
) {
  const response = await callStorage(
    token,
    'share-create',
    { ...sessionHeaders(access), 'Content-Type': 'text/plain', 'X-Booth-Consent': 'qr-v1' },
    signal,
    secret,
  );
  const { expiresAt } = (await response.json()) as { expiresAt?: string };
  if (!expiresAt || !Number.isFinite(Date.parse(expiresAt))) throw new PhotoStorageError(503);
  return expiresAt;
}

export async function revokePhotoShare(token: string, access: PhotoAccess, signal: AbortSignal) {
  await callStorage(token, 'share-revoke', sessionHeaders(access), signal);
}

export async function readSharedPhoto(secret: string, signal: AbortSignal) {
  if (!/^[a-f0-9]{64}$/.test(secret)) throw new PhotoStorageError(404);
  const startedAt = performance.now();
  const response = await callStorage(
    null,
    'share-read',
    { 'Content-Type': 'text/plain' },
    signal,
    secret,
  );
  return readPhotoResponse(response, startedAt);
}

export async function readPhotoResponse(response: Response, startedAt: number) {
  const remainingMs = Number(response.headers.get('X-Booth-Remaining-Ms'));
  const expiresAt = response.headers.get('X-Booth-Expires') ?? '';
  if (
    response.headers.get('Content-Type') !== 'image/jpeg' ||
    !Number.isFinite(remainingMs) ||
    remainingMs <= 0 ||
    remainingMs > 86_400_000 ||
    !Number.isFinite(Date.parse(expiresAt))
  )
    throw new PhotoStorageError(404);
  // Include the request time in the local timer to account for delivery latency.
  const deadline = startedAt + remainingMs;
  return { image: await response.blob(), expiresAt, deadline };
}
