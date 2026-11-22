import { describe, expect, it } from 'vitest';
import { gestureConfig } from '../src/config/gestureConfig';
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
    expect(recognizedGesture({ name: 'Victory', score: 0.59 })).toBeNull();
    expect(recognizedGesture({ name: 'Victory', score: Number.NaN })).toBeNull();
    expect(recognizedGesture(null)).toBeNull();
  });

  it('confirma a palma com duas amostras consecutivas após 150 ms e progresso finito', () => {
    const validation = new GestureValidation();
    expect(validation.update(palm, 'idle', 0)).toMatchObject({ command: null, progress: 0 });
    expect(validation.update(palm, 'idle', 150)).toMatchObject({ command: 'start5', progress: 1 });
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

  it('confirma após a duração configurada e impede repetição enquanto o gesto permanece', () => {
    const validation = new GestureValidation();
    const deadline = 100 + gestureConfig.confirmationMs;
    expect(validation.update(palm, 'idle', 100).command).toBeNull();
    for (let time = 200; time < deadline; time += 100)
      expect(validation.update(palm, 'idle', time).command).toBeNull();
    expect(validation.update(palm, 'idle', deadline).command).toBe('start5');
    for (let time = deadline + 100; time < 6000; time += 100)
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
    expect(validation.update(palm, 'idle', 200).progress).toBe(100 / gestureConfig.confirmationMs);
    const deadline = 100 + gestureConfig.confirmationMs;
    for (let time = 300; time < deadline; time += 100) validation.update(palm, 'idle', time);
    expect(validation.update(palm, 'idle', deadline).command).toBe('start5');
    const nextStart = deadline + 200;
    const nextCommand = deadline + gestureConfig.commandCooldownMs;
    for (let time = nextStart; time < nextCommand; time += 100)
      expect(validation.update(victory, 'idle', time).command).toBeNull();
    expect(validation.update(victory, 'idle', nextCommand).command).toBe('start10');
  });

  it('cancela e confirma apenas nos estados corretos', () => {
    const validation = new GestureValidation();
    validation.update(fist, 'countdown', 0);
    for (let time = 100; time < 800; time += 100) validation.update(fist, 'countdown', time);
    expect(validation.update(fist, 'countdown', 800).command).toBe('cancel');
    validation.update(null, 'review', 2700);
    validation.update(thumb, 'review', 2800);
    const deadline = 2800 + gestureConfig.confirmationMs;
    for (let time = 2900; time < deadline; time += 100) validation.update(thumb, 'review', time);
    expect(validation.update(thumb, 'review', deadline).command).toBe('confirm');
  });
});

it('exige liberação observada antes de rearmar o mesmo gesto', () => {
  const validation = new GestureValidation();
  validation.update(palm, 'idle', 0);
  expect(validation.update(palm, 'idle', 150).command).toBe('start5');
  validation.update(null, 'capturing', 160, 100, true, true);
  validation.update(null, 'idle', 170, 100, true);
  for (let t = 1800; t < 4000; t += 100)
    expect(validation.update(palm, 'idle', t, 100, true).command).toBeNull();
  for (let t = 4000; t <= 4300; t += 100) validation.update(null, 'idle', t, 100, true);
  expect(validation.update(palm, 'idle', 4400, 100, true).command).toBeNull();
  expect(validation.update(palm, 'idle', 4550, 100, true).command).toBe('start5');
});

it('não combina movimentos breves intercalados com ausência da mão', () => {
  const validation = new GestureValidation();
  for (let t = 0; t <= 6000; t += 100) {
    const detection = t % 500 === 0 ? palm : t % 500 === 100 ? victory : null;
    expect(validation.update(detection, 'idle', t, 100, true).command).toBeNull();
  }
});

it('cancela com 800 ms mesmo durante o cooldown da captura, sem repetir', () => {
  const v = new GestureValidation();
  for (let t = 0; t < gestureConfig.confirmationMs; t += 100) v.update(palm, 'idle', t);
  expect(v.update(palm, 'idle', gestureConfig.confirmationMs).command).toBe('start5');
  for (let t = 250; t < 1050; t += 100) expect(v.update(fist, 'countdown', t).command).toBeNull();
  expect(v.update(fist, 'countdown', 1050).command).toBe('cancel');
  for (let t = 3000; t <= 5000; t += 100) expect(v.update(fist, 'countdown', t).command).toBeNull();
});

it.each([
  [fist, 'countdown', 'cancel'],
  [thumb, 'review', 'confirm'],
  [palm, 'idle', 'start5'],
  [victory, 'idle', 'start10'],
] as const)(
  'confirma $0.name com frequência real de aproximadamente 2,4 Hz',
  (d, phase, command) => {
    const v = new GestureValidation();
    const commands = [];
    let now = 0;
    for (const interval of [0, 417, 430, 390, 450, 410, 420, 400, 440]) {
      now += interval;
      const result = v.update(d, phase, now, 200, true);
      if (result.command) commands.push(result.command);
    }
    expect(commands).toEqual([command]);
  },
);

it('não conta perda de detecção ou pausas prolongadas na frequência reduzida', () => {
  const v = new GestureValidation();
  v.update(fist, 'countdown', 0, 200, true);
  v.update(fist, 'countdown', 417, 200, true);
  v.update(null, 'countdown', 834, 200, true);
  expect(v.update(fist, 'countdown', 1251, 200, true).progress).toBe(0);
  v.update(fist, 'countdown', 1668, 200, true);
  expect(v.update(fist, 'countdown', 3000, 200, true).progress).toBe(0);
});

it('preserva a confirmação diante de um quadro incerto com a mão visível a 2,4 Hz', () => {
  const validator = new GestureValidation();
  const update = (detection: typeof fist | null, time: number) =>
    validator.update(detection, 'countdown', time, 420, true, true);
  for (const time of [0, 420]) expect(update(fist, time).command).toBeNull();
  const expectedProgress = 420 / gestureConfig.cancelConfirmationMs;
  expect(update(null, 840)).toMatchObject({ command: null, progress: expectedProgress });
  expect(update(fist, 1260)).toMatchObject({ command: null, progress: expectedProgress });
  expect(update(fist, 1680).command).toBe('cancel');
  for (const time of [2100, 2520, 2940, 3360]) expect(update(fist, time).command).toBeNull();
});

it.each([
  ['mão ausente', [[1260, false]], 1680],
  [
    'dois quadros incertos',
    [
      [1260, true],
      [1680, true],
    ],
    2100,
  ],
  ['Worker interrompido', [[1260, true]], 2100],
] as const)('reinicia a confirmação com %s', (_reason, missing, resumeAt) => {
  const validator = new GestureValidation();
  for (const time of [0, 420, 840]) validator.update(palm, 'idle', time, 420, true);
  for (const [time, detected] of missing) validator.update(null, 'idle', time, 420, true, detected);
  expect(validator.update(palm, 'idle', resumeAt, 420, true)).toMatchObject({
    command: null,
    progress: 0,
  });
});

it.each([100, 200])('confirma com amostras de %i ms e rejeita interrupções longas', (period) => {
  const validation = new GestureValidation();
  validation.update(palm, 'idle', 0, period);
  const deadline = Math.ceil(gestureConfig.confirmationMs / period) * period;
  for (let now = period; now < deadline; now += period)
    expect(validation.update(palm, 'idle', now, period).command).toBeNull();
  expect(validation.update(palm, 'idle', deadline, period).command).toBe('start5');
  validation.reset();
  validation.update(palm, 'idle', 0, period);
  expect(validation.update(palm, 'idle', 2000, period).progress).toBe(0);
});

it('aceita variação de amostragem sem contar ausência de detecção', () => {
  const validation = new GestureValidation();
  let now = 0;
  const commands = [];
  validation.update(palm, 'idle', now, 200);
  for (const delta of [210, 230, 195, 240, 205, 220, 210, 200, 210, 220]) {
    now += delta;
    const result = validation.update(palm, 'idle', now, 200);
    if (result.command) commands.push(result.command);
  }
  expect(commands).toEqual(['start5']);
  validation.reset();
  validation.update(palm, 'idle', 0, 200);
  validation.update(null, 'idle', 200, 200);
  expect(validation.update(palm, 'idle', 400, 200).progress).toBe(0);
});
