import { photoHandler } from '../_shared/photoHandler.ts';
import { supabaseBackend } from '../_shared/storage.ts';

const values = (name: string) =>
  new Set(
    (Deno.env.get(name) ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );
const backend = supabaseBackend(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('BOOTH_SERVER_SECRET') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);
const operators = values('BOOTH_OPERATOR_IDS');
Deno.serve(
  photoHandler(
    backend.admin,
    (token) => backend.operator(token, operators),
    values('BOOTH_ALLOWED_ORIGINS'),
  ),
);
