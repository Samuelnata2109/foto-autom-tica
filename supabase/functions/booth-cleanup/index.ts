import { sweepPhotos } from '../_shared/cleanup.ts';
import { hashProof } from '../_shared/photoHandler.ts';
import { supabaseBackend } from '../_shared/storage.ts';

const token = Deno.env.get('BOOTH_CLEANUP_TOKEN') ?? '';
const { admin } = supabaseBackend(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('BOOTH_SERVER_SECRET') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response(null, { status: 405 });
  const supplied = request.headers.get('x-booth-cleanup') ?? '';
  if (!/^[a-f0-9]{64}$/.test(token) || !/^[a-f0-9]{64}$/.test(supplied))
    return new Response(null, { status: 401 });
  const [expected, actual] = await Promise.all([hashProof(token), hashProof(supplied)]);
  let difference = 0;
  for (let i = 0; i < expected.length; i++)
    difference |= expected.charCodeAt(i) ^ actual.charCodeAt(i);
  if (difference) return new Response(null, { status: 401 });
  try {
    const result = await sweepPhotos(admin);
    if (!result.busy) {
      if (result.failed || result.expiredBacklog === null) console.warn('Booth cleanup', result);
      else console.info('Booth cleanup', result);
    }
    return Response.json(result, { status: result.failed ? 503 : 200 });
  } catch {
    console.error('Booth cleanup execution failed');
    return new Response(null, { status: 503 });
  }
});
