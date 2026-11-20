import { describe, expect, it } from 'vitest';
import { handGeometry } from '../src/services/handGeometry';
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
function infer(name: string, score: number, pose: GestureName) {
  const model = {
    recognizeForVideo: () => ({
      gestures: [[{ categoryName: name, score }]],
      worldLandmarks: [hand(pose)],
      landmarks: [hand(pose)],
    }),
  } as unknown as GestureRecognizer;
  return detectGesture(model, {} as ImageBitmap, 100);
}
describe('reconhecimento híbrido', () => {
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
