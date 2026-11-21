function publicBase(value: string | undefined) {
  try {
    const url = new URL(value ?? '');
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !url.hostname.includes('.') ||
      url.hostname.replace(/\.$/, '').split('.').at(-1) === 'localhost' ||
      /^(?:0|10|127|169\.254|192\.168|172\.(?:1[6-9]|2\d|3[01]))\./.test(url.hostname)
    )
      return null;
    if (!url.pathname.endsWith('/')) url.pathname += '/';
    return url;
  } catch {
    return null;
  }
}

export function photoShareLink(secret: string, base = import.meta.env.VITE_PHOTO_SHARE_BASE_URL) {
  if (!/^[a-f0-9]{64}$/.test(secret)) return null;
  const url = publicBase(base);
  if (!url) return null;
  url.hash = `/foto/${secret}`;
  return url.href;
}

export const sharingConfigured = Boolean(publicBase(import.meta.env.VITE_PHOTO_SHARE_BASE_URL));
