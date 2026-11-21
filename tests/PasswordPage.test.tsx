// @vitest-environment jsdom
import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PasswordPage } from '../src/pages/PasswordPage';
import { createPasswordFlow } from '../src/services/passwordFlow';
import { createAuthClient } from '../src/services/supabaseAuth';

vi.mock('../src/services/supabaseAuth', () => ({ createAuthClient: vi.fn() }));

const valid = { data: { session: { access_token: 'session' } }, error: null };
const auth = {
  verifyOtp: vi.fn(),
  setSession: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
};
let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.mocked(createAuthClient).mockResolvedValue(
    auth as unknown as Awaited<ReturnType<typeof createAuthClient>>,
  );
  auth.verifyOtp.mockResolvedValue(valid);
  auth.setSession.mockResolvedValue(valid);
  auth.updateUser.mockResolvedValue({ error: null });
  auth.signOut.mockResolvedValue({ error: null });
  host = document.createElement('div');
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

function open(flow: ReturnType<typeof createPasswordFlow>) {
  return act(async () =>
    root.render(
      <StrictMode>
        <PasswordPage flow={flow} />
      </StrictMode>,
    ),
  );
}

function submit(password: string, confirmation: string) {
  return act(async () => {
    host.querySelector<HTMLInputElement>('[name=password]')!.value = password;
    host.querySelector<HTMLInputElement>('[name=confirmation]')!.value = confirmation;
    host
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
}

it('ativa convite e valida confirmação antes de salvar a senha', async () => {
  await open(createPasswordFlow({ kind: 'invite', credentials: { token_hash: 'invite-proof' } }));
  expect(auth.verifyOtp).toHaveBeenCalledExactlyOnceWith({
    type: 'invite',
    token_hash: 'invite-proof',
  });
  await submit('short', 'short');
  expect(host.textContent).toContain('oito caracteres');
  await submit('longer-secret', 'different');
  expect(host.textContent).toContain('precisam ser iguais');
  expect(auth.updateUser).not.toHaveBeenCalled();
  await submit('longer-secret', 'longer-secret');
  expect(auth.updateUser).toHaveBeenCalledExactlyOnceWith({ password: 'longer-secret' });
  expect(auth.signOut).toHaveBeenCalledExactlyOnceWith({ scope: 'local' });
  expect(host.textContent).toContain('Senha salva');
});

it('usa a sessão validada quando recuperação chega por fragmento', async () => {
  const credentials = { access_token: 'jwt', refresh_token: 'refresh' };
  await open(createPasswordFlow({ kind: 'recovery', credentials }));
  expect(host.textContent).toContain('Redefinir senha');
  expect(auth.setSession).toHaveBeenCalledExactlyOnceWith(credentials);
  await submit('another-secret', 'another-secret');
  expect(auth.updateUser).toHaveBeenCalledOnce();
});

it('bloqueia formulário e atualização quando o Supabase rejeita o link vencido', async () => {
  auth.verifyOtp.mockResolvedValueOnce({
    data: { session: null },
    error: { status: 403, code: 'otp_expired', message: 'raw-secret' },
  });
  const flow = createPasswordFlow({ kind: 'recovery', credentials: { token_hash: 'expired' } });
  await open(flow);
  expect(host.textContent).toContain('expirou');
  expect(host.textContent).not.toContain('raw-secret');
  expect(host.querySelector('form')).toBeNull();
  await expect(flow.updatePassword('anything')).resolves.toBe('invalid');
  expect(auth.updateUser).not.toHaveBeenCalled();
});

it('trata falha do servidor e permite nova tentativa de senha sem exibir os detalhes', async () => {
  auth.updateUser.mockResolvedValueOnce({ error: { status: 422, message: 'raw-sensitive' } });
  await open(createPasswordFlow({ kind: 'invite', credentials: { token_hash: 'invite-proof' } }));
  await submit('first-secret', 'first-secret');
  expect(host.textContent).toContain('Não foi possível salvar');
  expect(host.textContent).not.toContain('raw-sensitive');
  await submit('stronger-secret', 'stronger-secret');
  expect(host.textContent).toContain('Senha salva');
});
