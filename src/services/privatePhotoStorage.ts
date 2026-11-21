import type { SessionPhoto } from '../types/photo';
import { createAuthClient, supabaseConfig } from './supabaseAuth';

export const storageConfigured = Boolean(supabaseConfig);

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
  if (!supabaseConfig) throw new PhotoStorageError(503);
  return supabaseConfig;
}

export async function signInOperator(email: string, password: string, signal: AbortSignal) {
  const auth = await createAuthClient(signal);
  const { data, error } = await auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new PhotoStorageError(error?.status ?? 401);
  const token = data.session.access_token;
  await callStorage(token, 'operator', {}, signal);
  return token;
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
