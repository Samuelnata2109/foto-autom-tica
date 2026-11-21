import { expect, it, vi } from 'vitest';
import { consumePasswordLink, parsePasswordLink } from '../src/services/passwordLink';

it.each(['invite', 'recovery'])('reconhece os campos do Supabase para %s', (kind) => {
  expect(
    parsePasswordLink(
      new URL(`https://booth.test/base/#access_token=access&refresh_token=refresh&type=${kind}`),
    ),
  ).toEqual({ kind, credentials: { access_token: 'access', refresh_token: 'refresh' } });
  expect(
    parsePasswordLink(new URL(`https://booth.test/base/?token_hash=one-time&type=${kind}`)),
  ).toEqual({ kind, credentials: { token_hash: 'one-time' } });
});

it('preserva rotas normais e rejeita links vencidos, incompletos ou de outro tipo', () => {
  const parse = (suffix: string) => parsePasswordLink(new URL('https://booth.test/' + suffix));
  expect(parse('#/cabine')).toBeNull();
  for (const url of [
    '#error=access_denied&error_code=otp_expired',
    '#type=recovery',
    '#access_token=only&type=recovery',
    '#access_token=access&refresh_token=refresh&type=magiclink',
    '?auth=password&code=unexpected',
    '?auth=password',
  ])
    expect(parse(url)).toEqual({ kind: 'invalid' });
});

it('remove credenciais e descrições do provedor da barra de endereços, na mesma subpasta', () => {
  const replaceState = vi.fn();
  const history = { replaceState } as unknown as History;
  const location = {
    href: 'https://booth.test/project/?auth=password&token_hash=proof&type=recovery#fragment',
  } as Location;
  expect(consumePasswordLink({ history, location })).toEqual({
    kind: 'recovery',
    credentials: { token_hash: 'proof' },
  });
  expect(replaceState.mock.calls[0]?.[2].href).toBe('https://booth.test/project/?auth=password');
});
