import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';

const source =
  'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task';
const expected = '97952348cf6a6a4915c2ea1496b4b37ebabc50cbbf80571435643c455f2b0482';
const directory = join(process.cwd(), 'public', 'models');
const target = join(directory, 'gesture_recognizer.task');
const temporary = join(directory, 'gesture_recognizer.download');
const digest = (data) => createHash('sha256').update(data).digest('hex');

await mkdir(directory, { recursive: true });
try {
  if (digest(await readFile(target)) === expected) {
    globalThis.console.log('Modelo oficial já está instalado e verificado.');
    process.exit(0);
  }
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const response = await globalThis.fetch(source, {
  signal: globalThis.AbortSignal.timeout(120_000),
});
if (!response.ok) throw new Error(`Falha no download do modelo: HTTP ${response.status}`);
const data = Buffer.from(await response.arrayBuffer());
if (digest(data) !== expected)
  throw new Error('Hash do modelo diferente do esperado. Arquivo não instalado.');
try {
  await writeFile(temporary, data);
  await rm(target, { force: true });
  await rename(temporary, target);
  globalThis.console.log('Modelo oficial instalado e verificado em public/models/.');
} finally {
  await rm(temporary, { force: true });
}
