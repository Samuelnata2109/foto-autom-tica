import { purgeRequestedPhoto } from './cleanup.ts';
import { boundedPhoto, jpegDimensions } from './jpeg.ts';
import type { Admin } from './storage.ts';

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const proof = /^[a-f0-9]{64}$/;
const scenarios = new Set(['original', 'ai-lab', 'data-center', 'neural-networks', 'robotics']);

export async function hashProof(value: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash), (part) => part.toString(16).padStart(2, '0')).join('');
}

type Reservation =
  | { state: 'ready'; expires_at: string }
  | { state: 'reserved'; path: string; token: string }
  | { state: 'limited' | 'unavailable' | 'paused' };

type PhotoDelivery = { state: 'ready'; path: string; expires_at: string; remaining_ms: number };
type SharedPhoto = PhotoDelivery | { state: 'limited' };

async function shareHash(request: Request) {
  if (request.headers.get('content-type') !== 'text/plain') return null;
  const bytes = await boundedPhoto(request, 64);
  if (bytes?.byteLength !== 64) return null;
  const token = new TextDecoder().decode(bytes);
  return proof.test(token) ? hashProof(token) : null;
}

export function photoHandler(
  admin: Admin,
  authorize: (authorization: string | null) => Promise<string | null>,
  origins: ReadonlySet<string>,
) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('origin');
    const permitted = !origin || origins.has(origin);
    const headers = new Headers({
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      Vary: 'Origin',
    });
    if (origin && permitted) headers.set('Access-Control-Allow-Origin', origin);
    const json = (status: number, data?: string | object) =>
      new Response(data ? JSON.stringify(typeof data === 'string' ? { code: data } : data) : null, {
        status,
        headers: { ...Object.fromEntries(headers), 'Content-Type': 'application/json' },
      });
    const photoResponse = (image: Blob, verified: PhotoDelivery) => {
      headers.set('Content-Type', 'image/jpeg');
      headers.set('X-Booth-Expires', verified.expires_at);
      headers.set('X-Booth-Remaining-Ms', String(verified.remaining_ms));
      headers.set('Access-Control-Expose-Headers', 'X-Booth-Expires, X-Booth-Remaining-Ms');
      return new Response(image, { headers });
    };
    const limited = () => {
      headers.set('Retry-After', '60');
      return json(429, 'limit');
    };
    if (!permitted) return json(403, 'origin');
    if (request.method === 'OPTIONS') {
      headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      headers.set(
        'Access-Control-Allow-Headers',
        'apikey, authorization, content-type, x-booth-action, x-booth-consent, x-booth-photo, x-booth-session, x-booth-proof, x-booth-scenario, x-booth-story, x-booth-offset, x-booth-decision, x-booth-purpose',
      );
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== 'POST') return json(405, 'method');
    try {
      const get = (name: string) => request.headers.get('x-booth-' + name) ?? '';
      const action = get('action');
      if (action === 'story-create') {
        const consent = get('consent');
        if (consent !== 'official-stories-v1') return json(400, 'consent');
        const hash = await shareHash(request);
        if (!hash) return json(404, 'unavailable');
        const result = await admin.rpc<string>('booth_create_story', {
          p_hash: hash,
          p_consent: consent,
        });
        if (result === 'limited') return limited();
        if (result === 'created') return json(201, { duplicate: false });
        if (result === 'exists') return json(200, { duplicate: true });
        return json(404, 'unavailable');
      }
      if (action === 'share-read') {
        const hash = await shareHash(request);
        if (!hash) return json(404, 'unavailable');
        const lookup = (consume: boolean) =>
          admin.rpc<SharedPhoto | null>('booth_shared_photo', { p_hash: hash, p_consume: consume });
        const share = await lookup(true);
        if (share?.state === 'limited') return limited();
        if (!share || share.remaining_ms <= 0) return json(404, 'unavailable');
        const image = await admin.download(share.path);
        const verified = image && (await lookup(false));
        if (
          !image ||
          verified?.state !== 'ready' ||
          verified.path !== share.path ||
          verified.remaining_ms <= 0
        )
          return json(404, 'unavailable');
        return photoResponse(image, verified);
      }
      const operator = await authorize(request.headers.get('authorization'));
      if (!operator) return json(401, 'operator');
      if (action === 'operator') return json(204);
      if (action === 'story-list' || action === 'story-read' || action === 'story-update') {
        if (!(await admin.rpc<boolean>('booth_story_operator_limit', { p_operator: operator })))
          return limited();
        if (action === 'story-list') {
          const offset = get('offset');
          if (!/^\d{1,5}$/.test(offset)) return json(400, 'offset');
          const entries = await admin.rpc<unknown[]>('booth_list_stories', {
            p_offset: Number(offset),
          });
          return json(200, entries);
        }
        const story = get('story');
        if (!uuid.test(story)) return json(404, 'unavailable');
        if (action === 'story-update') {
          const decision = get('decision');
          if (!['approve', 'reject', 'publish'].includes(decision)) return json(400, 'decision');
          const result = await admin.rpc<string>('booth_update_story', {
            p_id: story,
            p_operator: operator,
            p_decision: decision,
          });
          if (result === 'updated') return json(204);
          if (result === 'conflict') return json(409, 'state');
          return json(404, 'unavailable');
        }
        const purpose = get('purpose');
        if (purpose !== 'preview' && purpose !== 'download') return json(400, 'purpose');
        const lookup = () =>
          admin.rpc<PhotoDelivery | null>('booth_story_photo', {
            p_id: story,
            p_download: purpose === 'download',
          });
        const entry = await lookup();
        if (!entry || entry.remaining_ms <= 0) return json(404, 'unavailable');
        const image = await admin.download(entry.path);
        const verified = image && (await lookup());
        if (!image || !verified || verified.path !== entry.path || verified.remaining_ms <= 0)
          return json(404, 'unavailable');
        return photoResponse(image, verified);
      }
      const id = get('photo');
      const session = get('session');
      const secret = get('proof');
      if (!uuid.test(id) || !uuid.test(session) || !proof.test(secret)) return json(400, 'session');
      const scope = {
        p_id: id,
        p_session: session,
        p_operator: operator,
        p_proof: await hashProof(secret),
      };
      switch (action) {
        case 'share-create': {
          if (get('consent') !== 'qr-v1') return json(400, 'consent');
          const hash = await shareHash(request);
          if (!hash) return json(400, 'share');
          const expiresAt = await admin.rpc<string | null>('booth_create_share', {
            ...scope,
            p_hash: hash,
          });
          return expiresAt ? json(201, { expiresAt }) : json(404, 'unavailable');
        }
        case 'share-revoke':
          return (await admin.rpc<boolean>('booth_revoke_share', scope))
            ? json(204)
            : json(404, 'unavailable');
        case 'upload': {
          if (get('consent') !== '24h-v1') return json(400, 'consent');
          if (request.headers.get('content-type') !== 'image/jpeg') return json(415, 'type');
          const scenario = get('scenario');
          if (!scenarios.has(scenario)) return json(400, 'scenario');
          const bytes = await boundedPhoto(request);
          if (!bytes) return json(413, 'size');
          const dimensions = jpegDimensions(bytes);
          if (!dimensions) return json(422, 'jpeg');
          const held = await admin.rpc<Reservation>('booth_reserve_photo', {
            ...scope,
            p_scenario: scenario,
            p_width: dimensions.width,
            p_height: dimensions.height,
            p_consent: '24h-v1',
          });
          if (held.state === 'ready') return json(200, { expiresAt: held.expires_at });
          if (held.state === 'limited') return json(429, 'limit');
          if (held.state === 'paused') return json(503, 'cleanup');
          if (held.state !== 'reserved') return json(409, 'pending');
          if (!(await admin.upload(held.path, bytes))) return json(503, 'upload');
          const expiresAt = await admin.rpc<string | null>('booth_finish_photo', {
            p_id: id,
            p_token: held.token,
          });
          return expiresAt ? json(201, { expiresAt }) : json(503, 'upload');
        }
        case 'read': {
          const path = await admin.rpc<string | null>('booth_read_path', scope);
          if (!path) return json(404, 'unavailable');
          const image = await admin.download(path);
          // Recheck after fetching the object so an expiry or delete during fetch cannot authorize delivery.
          if (!image || (await admin.rpc<string | null>('booth_read_path', scope)) !== path)
            return json(404, 'unavailable');
          headers.set('Content-Type', 'image/jpeg');
          return new Response(image, { headers });
        }
        case 'delete': {
          const decision = await admin.rpc<'requested' | 'unavailable' | 'gone'>(
            'booth_request_delete',
            scope,
          );
          if (decision === 'gone') return json(204);
          if (decision !== 'requested') return json(404, 'unavailable');
          return (await purgeRequestedPhoto(admin, id)) ? json(204) : json(202, 'deleting');
        }
        default:
          return json(400, 'action');
      }
    } catch {
      return json(503, 'temporary');
    }
  };
}
