import { createAuthClient } from './supabaseAuth';
import type { PasswordLink } from './passwordLink';

type Verification = 'ready' | 'invalid' | 'unavailable';
type Update = 'saved' | 'invalid' | 'rejected';

export function createPasswordFlow(link: PasswordLink) {
  const kind = link.kind;
  let handoff: PasswordLink | undefined = link;
  let client: Awaited<ReturnType<typeof createAuthClient>> | undefined;
  let verification: Promise<Verification> | undefined;
  let saving = false;

  async function verify(): Promise<Verification> {
    const pending = handoff;
    handoff = undefined;
    if (!pending || pending.kind === 'invalid') return 'invalid';
    try {
      const auth = await createAuthClient();
      const credentials = pending.credentials;
      const response = await ('token_hash' in credentials
        ? auth.verifyOtp({ type: pending.kind, ...credentials })
        : auth.setSession(credentials));
      if (response.error || !response.data.session) {
        const status = response.error?.status ?? 0;
        return response.error?.name === 'AuthRetryableFetchError' || status === 429 || status >= 500
          ? 'unavailable'
          : 'invalid';
      }
      client = auth;
      return 'ready';
    } catch {
      return 'unavailable';
    }
  }

  return {
    kind,
    verify: () => (verification ??= verify()),
    async updatePassword(password: string): Promise<Update> {
      const auth = client;
      if (!auth || saving) return 'invalid';
      saving = true;
      try {
        const { error } = await auth.updateUser({ password });
        if (error) {
          if (
            error.status === 401 ||
            error.code === 'session_not_found' ||
            error.name === 'AuthSessionMissingError'
          ) {
            client = undefined;
            return 'invalid';
          }
          return 'rejected';
        }
        client = undefined;
        // Discard the short-lived password session without signing out other devices.
        await auth.signOut({ scope: 'local' }).catch(() => undefined);
        return 'saved';
      } catch {
        return 'rejected';
      } finally {
        saving = false;
      }
    },
  };
}
