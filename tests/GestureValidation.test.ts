import { describe, expect, it } from 'vitest';
import {
  commandFor,
  GestureValidation,
  recognizedGesture,
} from '../src/services/gestureValidation';

const palm = { name: 'Open_Palm', score: 0.95 };
const victory = { name: 'Victory', score: 0.95 };
const fist = { name: 'Closed_Fist', score: 0.95 };
const thumb = { name: 'Thumb_Up', score: 0.95 };

describe('validação de gestos', () => {
  it('reconhece apenas os quatro gestos e exige confiança mínima', () => {
    for (const gesture of [palm, victory, fist, thumb])
      expect(recognizedGesture(gesture)).toBe(gesture.name);
    expect(recognizedGesture({ name: 'Pointing_Up', score: 1 })).toBeNull();
    expect(recognizedGesture({ name: 'Victory', score: 0.79 })).toBeNull();
    expect(recognizedGesture({ name: 'Victory', score: Number.NaN })).toBeNull();
    expect(recognizedGesture(null)).toBeNull();
  });

  it('restringe comandos ao estado da cabine', () => {
    expect(commandFor('idle', 'Open_Palm')).toBe('start5');
    expect(commandFor('idle', 'Victory')).toBe('start10');
    expect(commandFor('countdown', 'Closed_Fist')).toBe('cancel');
    expect(commandFor('review', 'Thumb_Up')).toBe('confirm');
    expect(commandFor('capturing', 'Open_Palm')).toBeNull();
    expect(commandFor('confirmed', 'Thumb_Up')).toBeNull();
    expect(commandFor('idle', 'Closed_Fist')).toBeNull();
  });

  it('confirma após dois segundos reais e impede repetição enquanto o gesto permanece', () => {
    const validation = new GestureValidation();
    expect(validation.update(palm, 'idle', 100).command).toBeNull();
    for (let time = 200; time < 2100; time += 100)
      expect(validation.update(palm, 'idle', time).command).toBeNull();
    expect(validation.update(palm, 'idle', 2100).command).toBe('start5');
    for (let time = 2200; time < 6000; time += 100)
      expect(validation.update(palm, 'idle', time).command).toBeNull();
  });

  it('reinicia ao mudar, perder estabilidade ou trocar de fase', () => {
    const validation = new GestureValidation();
    validation.update(palm, 'idle', 0);
    validation.update(palm, 'idle', 100);
    expect(validation.update(victory, 'idle', 200).progress).toBe(0);
    expect(validation.update(null, 'idle', 500).progress).toBe(0);
    expect(validation.update(victory, 'idle', 600).progress).toBe(0);
    expect(validation.update(victory, 'countdown', 700).command).toBeNull();
  });

  it('aceita falha breve sem contabilizar intervalo ausente e aplica cooldown', () => {
    const validation = new GestureValidation();
    validation.update(palm, 'idle', 0);
    validation.update(palm, 'idle', 100);
    validation.update(null, 'idle', 150);
    expect(validation.update(palm, 'idle', 200).progress).toBe(0.05);
    for (let time = 300; time < 2100; time += 100) validation.update(palm, 'idle', time);
    expect(validation.update(palm, 'idle', 2100).command).toBe('start5');
    validation.update(null, 'idle', 2500);
    validation.update(victory, 'idle', 2600);
    for (let time = 2700; time < 4600; time += 100) validation.update(victory, 'idle', time);
    expect(validation.update(victory, 'idle', 4600).command).toBe('start10');
  });

  it('cancela e confirma apenas nos estados corretos', () => {
    const validation = new GestureValidation();
    validation.update(fist, 'countdown', 0);
    for (let time = 100; time < 2000; time += 100) validation.update(fist, 'countdown', time);
    expect(validation.update(fist, 'countdown', 2000).command).toBe('cancel');
    validation.update(null, 'review', 2300);
    validation.update(thumb, 'review', 2400);
    for (let time = 2500; time < 4400; time += 100) validation.update(thumb, 'review', time);
    expect(validation.update(thumb, 'review', 4400).command).toBe('confirm');
  });
});

it.each([100, 200])('confirma com amostras de %i ms e rejeita interrupções longas', (period) => {
  const validation = new GestureValidation();
  let result = validation.update(palm, 'idle', 0, period);
  for (let now = period; now <= 2000; now += period)
    result = validation.update(palm, 'idle', now, period);
  expect(result.command).toBe('start5');
  validation.reset();
  validation.update(palm, 'idle', 0, period);
  expect(validation.update(palm, 'idle', 2000, period).progress).toBe(0);
});

it('aceita variação de amostragem sem contar ausência de detecção', () => {
  const validation = new GestureValidation();
  let now = 0;
  validation.update(palm, 'idle', now, 200);
  for (const delta of [210, 230, 195, 240, 205, 220, 210, 200, 210, 220]) {
    now += delta;
    const result = validation.update(palm, 'idle', now, 200);
    if (now >= 2000) expect(result.command).toBe('start5');
  }
  validation.reset();
  validation.update(palm, 'idle', 0, 200);
  validation.update(null, 'idle', 200, 200);
  expect(validation.update(palm, 'idle', 400, 200).progress).toBe(0);
});
