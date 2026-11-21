import { describe, expect, it } from 'vitest';
import { handGeometry, supportsThumb, thumbMetrics } from '../src/services/handGeometry';
import { GestureVote } from '../src/services/gestureVote';
import { GestureValidation } from '../src/services/gestureValidation';
import { detectGesture } from '../src/services/gestureRecognizer';
import type { GestureRecognizer } from '@mediapipe/tasks-vision';
import type { GestureName, GesturePhase, HandPoint } from '../src/types/gesture';
function hand(name: GestureName) {
  const p: HandPoint[] = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }));
  for (const [n, i] of [5, 9, 13, 17].entries()) {
    const x = n - 1.5,
      open = name === 'Open_Palm' || (name === 'Victory' && n < 2);
    p[i] = { x, y: 2, z: 0 };
    p[i + 1] = { x, y: 3, z: 0 };
    p[i + 3] = { x: x + (open ? x * 0.5 : 0), y: open ? 5 : 2, z: open ? 0 : 0.3 };
  }
  p[2] = { x: -1, y: 1, z: 0 };
  p[3] = { x: -2, y: 2, z: 0 };
  p[4] = name === 'Thumb_Up' ? { x: -5, y: 5, z: 0 } : { x: -1, y: 2, z: 0 };
  return p;
}
function infer(name: string, score: number, pose: GestureName | HandPoint[]) {
  const points = typeof pose === 'string' ? hand(pose) : pose;
  const model = {
    recognizeForVideo: () => ({
      gestures: [[{ categoryName: name, score }]],
      worldLandmarks: [points],
      landmarks: [points],
    }),
  } as unknown as GestureRecognizer;
  return detectGesture(model, {} as ImageBitmap, 100);
}
describe('reconhecimento híbrido', () => {
  it.each([180, 240])(
    'confere o sinal de paz com proporção corrigida em vídeo de 320 × %i',
    (height) => {
      const peace = hand('Victory');
      peace[8] = { x: -1.33, y: 5, z: 0 };
      peace[12] = { x: -0.55, y: 5, z: 0 };
      const image = peace.map(({ x, y, z }) => ({
        x: 0.74 - x * 0.03,
        y: 0.3 + y * 0.03 * (320 / height),
        z: z * 0.03,
      }));
      const frame = { width: 320, height } as ImageBitmap;
      const detect = (score: number, worldLandmarks: HandPoint[][]) =>
        detectGesture(
          {
            recognizeForVideo: () => ({
              gestures: [[{ categoryName: 'Victory', score }]],
              landmarks: [image],
              worldLandmarks,
            }),
          } as unknown as GestureRecognizer,
          frame,
          0,
        );

      expect(handGeometry(image)).toBeNull();
      const supported = detect(0.76, []);
      expect(supported).toMatchObject({
        name: 'Victory',
        geometry: 'Victory',
        geometrySource: 'image',
      });
      expect(new GestureVote().accept(supported, 0)).toBe(supported);
      expect(new GestureVote().accept(detect(0.73, []), 0)).toBeNull();
      expect(detect(0.99, [hand('Open_Palm')])).toMatchObject({
        name: 'None',
        geometrySource: 'world',
      });
    },
  );
  it.each(['Open_Palm', 'Victory', 'Closed_Fist', 'Thumb_Up'] as const)(
    'aceita %s inclinado a 37 graus, deslocado e em escalas distintas com as duas mãos',
    (name) => {
      const angle = (37 * Math.PI) / 180;
      for (const size of [0.008, 0.06]) {
        for (const mirror of [1, -1]) {
          const points = hand(name).map(({ x, y, z }) => {
            const rolledY = x * Math.sin(angle) + y * Math.cos(angle);
            return {
              x: 0.19 + mirror * size * (x * Math.cos(angle) - y * Math.sin(angle)),
              y: -0.1 + size * (rolledY * Math.cos(angle) - z * Math.sin(angle)),
              z: 0.25 + size * (rolledY * Math.sin(angle) + z * Math.cos(angle)),
            };
          });
          const detection = infer(name, 0.72, points);
          expect(detection?.geometry).toBe(name);
          expect(new GestureVote().accept(detection, 0)?.name).toBe(name);
        }
      }
    },
  );

  it('aceita palma relaxada, paz estreita e polegar com um dedo impreciso', () => {
    const palm = hand('Open_Palm');
    palm[20] = { x: 1.5, y: 4, z: 1.4 };
    expect(handGeometry(palm)).toBe('Open_Palm');
    const peace = hand('Victory');
    peace[8] = { x: -1.33, y: 5, z: 0 };
    peace[12] = { x: -0.55, y: 5, z: 0 };
    expect(handGeometry(peace)).toBe('Victory');
    const thumb = hand('Thumb_Up');
    thumb[20] = { x: 1.5, y: 3.45, z: 1.2 };
    expect(infer('Thumb_Up', 0.66, thumb)?.geometry).toBe('Thumb_Up');
    expect(infer('Thumb_Up', 0.95, 'Closed_Fist')?.name).toBe('None');
  });

  it('aplica histerese somente após reconhecer a mesma classe com geometria compatível', () => {
    const vote = new GestureVote();
    const strong = infer('Victory', 0.72, 'Victory');
    const borderline = infer('Victory', 0.65, 'Victory');
    expect(vote.accept(borderline, 0)).toBeNull();
    expect(vote.accept(strong, 100)).toBe(strong);
    expect(vote.accept(borderline, 200)).toBe(borderline);
    expect(vote.accept(infer('Open_Palm', 0.65, 'Open_Palm'), 300)).toBeNull();
    expect(vote.accept(borderline, 1200)).toBeNull();
    expect(infer('Open_Palm', 1, [])).toBeNull();
  });
  it('apoia polegar curto estendido sem exigir distância fixa à largura da palma', () => {
    const points = hand('Thumb_Up');
    points[2] = { x: -1.5, y: 2, z: 0 };
    points[3] = { x: -2, y: 2.5, z: 0 };
    points[4] = { x: -2.5, y: 3, z: 0 };
    expect(handGeometry(points)).toBe('Closed_Fist');
    const model = {
      recognizeForVideo: () => ({
        gestures: [[{ categoryName: 'Thumb_Up', score: 0.7 }]],
        landmarks: [points],
        worldLandmarks: [points],
      }),
    } as unknown as GestureRecognizer;
    const detection = detectGesture(model, {} as ImageBitmap, 0);
    expect(detection?.geometry).toBe('Thumb_Up');
    expect(new GestureVote().accept(detection, 0)?.name).toBe('Thumb_Up');
    expect(
      supportsThumb(thumbMetrics(points.map((p) => ({ x: -p.y * 2, y: p.z * 2, z: p.x * 2 })))),
    ).toBe(true);
  });
  it('não apoia polegar recolhido, dedos abertos ou pontos inválidos', () => {
    expect(supportsThumb(thumbMetrics(hand('Closed_Fist')))).toBe(false);
    expect(supportsThumb(thumbMetrics(hand('Open_Palm')))).toBe(false);
    expect(supportsThumb(thumbMetrics([]))).toBe(false);
    expect(infer('Thumb_Up', 0.95, 'Open_Palm')?.name).toBe('None');
  });
  it.each(['Open_Palm', 'Victory', 'Closed_Fist', 'Thumb_Up'] as const)(
    'classifica %s com rotação, escala e reflexão',
    (name) => {
      expect(
        handGeometry(hand(name).map((p) => ({ x: 5 + p.y * 3, y: 7 + p.z * 3, z: -p.x * 3 }))),
      ).toBe(name);
    },
  );
  it('bloqueia paz em geometria de palma e rejeita confiança insuficiente', () => {
    expect(infer('Victory', 0.99, 'Open_Palm')?.name).toBe('None');
    expect(new GestureVote().accept(infer('Thumb_Up', 0.64, 'Thumb_Up'), 0)).toBeNull();
  });
  it.each([
    ['Open_Palm', 'idle', 'start5'],
    ['Victory', 'idle', 'start10'],
    ['Closed_Fist', 'countdown', 'cancel'],
    ['Thumb_Up', 'review', 'confirm'],
  ] as const)('mantém %s após uma amostra divergente', (name, phase, expected) => {
    const vote = new GestureVote(),
      v = new GestureValidation();
    const commands = [];
    for (let t = 0; t <= 3000; t += 200) {
      const d = t === 1200 ? infer('Open_Palm', 0.99, 'Closed_Fist') : infer(name, 0.7, name);
      const cmd = v.update(vote.accept(d, t), phase, t, 200, true).command;
      if (cmd) commands.push(cmd);
    }
    expect(commands).toEqual([expected]);
  });
  it('bloqueia polegar fora da revisão', () => {
    const v = new GestureValidation();
    for (let t = 0; t <= 3000; t += 100)
      expect(
        v.update(infer('Thumb_Up', 0.9, 'Thumb_Up'), 'idle' as GesturePhase, t).command,
      ).toBeNull();
  });
});
