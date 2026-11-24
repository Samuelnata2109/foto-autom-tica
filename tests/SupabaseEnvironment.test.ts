import { expect, it } from 'vitest';
import {
  browserSupabaseConfig,
  pagesUrl,
  validateSupabaseEnvironment,
} from '../src/config/supabaseEnvironment';

const production = 'https://zzckkrherwyspqtkhokm.supabase.co';
const staging = 'https://sdcthjviahstkqlhrtrh.supabase.co';
const local = 'http://127.0.0.1:54321';
const key = 'sb_publishable_test';

function env(url: string, publicKey = key) {
  return { VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: publicKey };
}

it.each(['development', 'homologacao', 'production'])(
  'bloqueia o projeto de produção no modo %s, mesmo se a URL tiver um caminho',
  (mode) => {
    for (const url of [production, production + '/rest/v1/']) {
      expect(() => validateSupabaseEnvironment(mode, env(url))).toThrow('produção bloqueado');
      expect(browserSupabaseConfig(mode, env(url), 'http://localhost:5173')).toBeNull();
    }
  },
);

it.each([
  ['development', staging],
  ['production', staging],
  ['development', local],
  ['homologacao', staging],
])('permite %s com a origem %s', (mode, url) => {
  expect(() => validateSupabaseEnvironment(mode, env(url))).not.toThrow();
  expect(browserSupabaseConfig(mode, env(url), 'http://localhost:5173')).toEqual({
    root: url,
    publishable: key,
  });
});

it('permite o build Pages com a origem de produção e a URL pública exata', () => {
  const config = { ...env(production), VITE_PHOTO_SHARE_BASE_URL: pagesUrl };
  expect(() => validateSupabaseEnvironment('github-pages', config)).not.toThrow();
  expect(browserSupabaseConfig('github-pages', config, new URL(pagesUrl).origin)?.root).toBe(
    production,
  );
  expect(browserSupabaseConfig('github-pages', config, 'http://localhost:4173')).toBeNull();
  expect(() => validateSupabaseEnvironment('github-pages', env(staging))).toThrow(
    'VITE_SUPABASE_URL',
  );
  expect(() => validateSupabaseEnvironment('github-pages', env(production))).toThrow(
    'VITE_PHOTO_SHARE_BASE_URL',
  );
});

it('exige origens exatas e bloqueia um QR de Pages na homologação', () => {
  for (const url of [local, staging + '.example.test', staging + '/rest/v1/']) {
    expect(() => validateSupabaseEnvironment('homologacao', env(url))).toThrow('VITE_SUPABASE_URL');
  }
  expect(() =>
    validateSupabaseEnvironment('homologacao', {
      ...env(staging),
      VITE_PHOTO_SHARE_BASE_URL: pagesUrl,
    }),
  ).toThrow('mesmo ambiente');
});

it('aceita somente chave publicável ou JWT legado com papel anon', () => {
  const legacy = (role: string) => `header.${btoa(JSON.stringify({ role }))}.signature`;
  const invalid = ['sb_secret_fixture', legacy('service_role')];
  for (const secret of invalid) {
    expect(() => validateSupabaseEnvironment('homologacao', env(staging, secret))).toThrow(
      'chave publicável',
    );
    expect(browserSupabaseConfig('homologacao', env(staging, secret), undefined)).toBeNull();
  }
  expect(() =>
    validateSupabaseEnvironment('homologacao', env(staging, legacy('anon'))),
  ).not.toThrow();
});

it.each(['development', 'homologacao', 'github-pages'])(
  'explica a ausência das variáveis obrigatórias em %s',
  (mode) => {
    expect(() => validateSupabaseEnvironment(mode, {})).toThrow(
      'configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY',
    );
  },
);

it('não habilita o cliente em test ou em modos não reconhecidos', () => {
  expect(browserSupabaseConfig('test', env(production), undefined)).toBeNull();
  expect(browserSupabaseConfig('outro', env(staging), undefined)).toBeNull();
  expect(() => validateSupabaseEnvironment('outro', env(staging))).toThrow('VITE_SUPABASE_URL');
});
