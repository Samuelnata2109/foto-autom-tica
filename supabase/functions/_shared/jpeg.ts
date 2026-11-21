export const maximumPhotoBytes = 8 * 1024 * 1024;

export async function boundedPhoto(request: Request, maxBytes = maximumPhotoBytes) {
  const length = Number(request.headers.get('content-length'));
  if (length > maxBytes) return null;
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

// Validate the JPEG envelope and read dimensions from SOF, rather than trusting form values.
export function jpegDimensions(bytes: Uint8Array) {
  if (
    bytes.length < 16 ||
    bytes[0] !== 0xff ||
    bytes[1] !== 0xd8 ||
    bytes.at(-2) !== 0xff ||
    bytes.at(-1) !== 0xd9
  )
    return null;
  const size = (start: number) => bytes[start]! * 256 + bytes[start + 1]!;
  let dimensions: { width: number; height: number } | undefined;
  let cursor = 2;
  while (cursor + 4 < bytes.length) {
    if (bytes[cursor++] !== 0xff) return null;
    while (bytes[cursor] === 0xff) cursor++;
    const marker = bytes[cursor++];
    const length = size(cursor);
    if (length < 2 || cursor + length >= bytes.length - 2) return null;
    if (marker === 0xda) return length >= 6 ? (dimensions ?? null) : null;
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      if (length < 8 || dimensions) return null;
      const height = size(cursor + 3);
      const width = size(cursor + 5);
      if (!width || !height || width > 8192 || height > 8192 || width * height > 16_777_216)
        return null;
      dimensions = { width, height };
    }
    cursor += length;
  }
  return null;
}
