import { callStorage, PhotoStorageError, readPhotoResponse } from './privatePhotoStorage';

const statuses = ['pending', 'approved', 'rejected', 'published', 'unavailable'] as const;
export type StoryStatus = (typeof statuses)[number];
export type StoryEntry = { id: string; createdAt: string; available: boolean; status: StoryStatus };
export type StoryDecision = 'approve' | 'reject' | 'publish';
export const storyPageSize = 25;

export function storyTimeRemaining({
  deadline,
  wallDeadline,
}: {
  deadline: number;
  wallDeadline: number;
}) {
  return Math.min(deadline - performance.now(), wallDeadline - Date.now());
}

export async function submitOfficialStory(secret: string, consent: boolean, signal: AbortSignal) {
  if (!consent) throw new PhotoStorageError(400);
  if (!/^[a-f0-9]{64}$/.test(secret)) throw new PhotoStorageError(404);
  const response = await callStorage(
    null,
    'story-create',
    { 'Content-Type': 'text/plain', 'X-Booth-Consent': 'official-stories-v1' },
    signal,
    secret,
  );
  if (response.status !== 200 && response.status !== 201) throw new PhotoStorageError(503);
  return response.status === 200 ? 'duplicate' : 'received';
}

export async function listOfficialStories(token: string, offset: number, signal: AbortSignal) {
  const response = await callStorage(
    token,
    'story-list',
    { 'X-Booth-Offset': String(offset) },
    signal,
  );
  const entries = (await response.json()) as StoryEntry[];
  if (
    !Array.isArray(entries) ||
    entries.some(
      (entry) =>
        !entry ||
        typeof entry.id !== 'string' ||
        !Number.isFinite(Date.parse(entry.createdAt)) ||
        !statuses.includes(entry.status) ||
        typeof entry.available !== 'boolean',
    )
  )
    throw new PhotoStorageError(503);
  return { entries: entries.slice(0, storyPageSize), more: entries.length > storyPageSize };
}

export async function readOfficialStory(
  token: string,
  id: string,
  purpose: 'preview' | 'download',
  signal: AbortSignal,
) {
  const startedAt = performance.now();
  const wallStartedAt = Date.now();
  const response = await callStorage(
    token,
    'story-read',
    { 'X-Booth-Story': id, 'X-Booth-Purpose': purpose },
    signal,
  );
  const photo = await readPhotoResponse(response, startedAt);
  return { ...photo, wallDeadline: wallStartedAt + (photo.deadline - startedAt) };
}

export async function updateOfficialStory(
  token: string,
  id: string,
  decision: StoryDecision,
  signal: AbortSignal,
) {
  await callStorage(
    token,
    'story-update',
    { 'X-Booth-Story': id, 'X-Booth-Decision': decision },
    signal,
  );
}
