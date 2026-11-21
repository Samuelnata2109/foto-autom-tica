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
      Vary: 'Origin',
    });
    if (origin && permitted) headers.set('Access-Control-Allow-Origin', origin);
    const json = (status: number, code?: string) =>
      new Response(code ? JSON.stringify({ code }) : null, {
        status,
        headers: { ...Object.fromEntries(headers), 'Content-Type': 'application/json' },
      });
    const receipt = (expiresAt: string, status: number) =>
      new Response(JSON.stringify({ expiresAt }), {
        status,
        headers: { ...Object.fromEntries(headers), 'Content-Type': 'application/json' },
      });
    if (!permitted) return json(403, 'origin');
    if (request.method === 'OPTIONS') {
      headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      headers.set(
        'Access-Control-Allow-Headers',
        'apikey, authorization, content-type, x-booth-action, x-booth-consent, x-booth-photo, x-booth-session, x-booth-proof, x-booth-scenario',
      );
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== 'POST') return json(405, 'method');
    try {
      const operator = await authorize(request.headers.get('authorization'));
      if (!operator) return json(401, 'operator');
      const get = (name: string) => request.headers.get('x-booth-' + name) ?? '';
      if (get('action') === 'operator') return json(204);
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
      switch (get('action')) {
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
          if (held.state === 'ready') return receipt(held.expires_at, 200);
          if (held.state === 'limited') return json(429, 'limit');
          if (held.state === 'paused') return json(503, 'cleanup');
          if (held.state !== 'reserved') return json(409, 'pending');
          if (!(await admin.upload(held.path, bytes))) return json(503, 'upload');
          const expiresAt = await admin.rpc<string | null>('booth_finish_photo', {
            p_id: id,
            p_token: held.token,
          });
          return expiresAt ? receipt(expiresAt, 201) : json(503, 'upload');
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
