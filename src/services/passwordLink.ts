type PasswordKind = 'invite' | 'recovery';
export type PasswordLink =
  | {
      kind: PasswordKind;
      credentials: { token_hash: string } | { access_token: string; refresh_token: string };
    }
  | { kind: 'invalid' };

function passwordKind(type: string | null): type is PasswordKind {
  return type === 'invite' || type === 'recovery';
}

export function parsePasswordLink(url: URL): PasswordLink | null {
  const query = url.searchParams;
  const fragment = new URLSearchParams(url.hash.slice(1));
  const authFragment = ['access_token', 'refresh_token', 'token_hash', 'error', 'error_code'].some(
    (key) => fragment.has(key),
  );
  const authQuery = [
    'access_token',
    'refresh_token',
    'token_hash',
    'code',
    'error',
    'error_code',
  ].some((key) => query.has(key));
  const type = fragment.get('type') ?? query.get('type');
  if (!authFragment && !authQuery && !passwordKind(type) && query.get('auth') !== 'password')
    return null;
  if (
    fragment.has('error') ||
    fragment.has('error_code') ||
    query.has('error') ||
    query.has('error_code')
  )
    return { kind: 'invalid' };

  if (!passwordKind(type)) return { kind: 'invalid' };
  const tokenHash = fragment.get('token_hash') ?? query.get('token_hash');
  if (tokenHash) return { kind: type, credentials: { token_hash: tokenHash } };
  const accessToken = fragment.get('access_token');
  const refreshToken = fragment.get('refresh_token');
  if (accessToken && refreshToken) {
    return { kind: type, credentials: { access_token: accessToken, refresh_token: refreshToken } };
  }
  return { kind: 'invalid' };
}

export function consumePasswordLink(browser: Pick<Window, 'location' | 'history'>) {
  const url = new URL(browser.location.href);
  const link = parsePasswordLink(url);
  if (link) {
    // Scrub provider fields before the router or any diagnostics can see them.
    url.search = '?auth=password';
    url.hash = '';
    browser.history.replaceState(null, '', url);
  }
  return link;
}
