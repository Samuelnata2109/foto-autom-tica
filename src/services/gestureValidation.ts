import { gestureConfig } from '../config/gestureConfig';
import type { GestureCommand, GestureDetection, GestureName, GesturePhase } from '../types/gesture';

export const gestureLabels: Record<GestureName, string> = {
  Open_Palm: 'Palma aberta',
  Victory: 'Sinal de paz',
  Closed_Fist: 'Punho fechado',
  Thumb_Up: 'Polegar para cima',
};

const commands: Partial<Record<GesturePhase, Partial<Record<GestureName, GestureCommand>>>> = {
  idle: { Open_Palm: 'start5', Victory: 'start10' },
  countdown: { Closed_Fist: 'cancel' },
  review: { Thumb_Up: 'confirm' },
};

export function recognizedGesture(
  detection: GestureDetection,
  continuing: GestureName | null = null,
): GestureName | null {
  if (
    !detection ||
    !Number.isFinite(detection.score) ||
    !Object.hasOwn(gestureLabels, detection.name)
  )
    return null;
  const name = detection.name as GestureName;
  if (detection.geometry && detection.geometry !== name) return null;
  const threshold =
    detection.geometry === name
      ? gestureConfig.supportedConfidence[name] -
        (name === continuing ? gestureConfig.confidenceHysteresis : 0)
      : gestureConfig.minimumConfidence;
  return detection.score >= threshold ? name : null;
}

export function commandFor(phase: GesturePhase, gesture: GestureName): GestureCommand | null {
  return commands[phase]?.[gesture] ?? null;
}

export const confirmationDuration = (gesture: GestureName | null) =>
  gesture === 'Closed_Fist' ? gestureConfig.cancelConfirmationMs : gestureConfig.confirmationMs;

export class GestureValidation {
  private candidate: GestureName | null = null;
  private lastSeenAt = 0;
  private heldMs = 0;
  private samples = 0;
  private missing = false;
  private latch: GestureName | null = null;
  private release: { gesture: GestureName | null; since: number } | null = null;
  private lastCommandAt = -Infinity;
  private phase: GesturePhase = 'idle';
  private lastSampleAt: number | null = null;
  private observedPeriod: number | null = null;

  reset(keepLatch = false) {
    this.candidate = null;
    this.lastSeenAt = 0;
    this.heldMs = 0;
    this.samples = 0;
    this.missing = false;
    this.lastSampleAt = null;
    this.observedPeriod = null;
    this.release = null;
    if (!keepLatch) this.latch = null;
  }

  update(
    detection: GestureDetection,
    phase: GesturePhase,
    now: number,
    samplePeriodMs = 100,
    smooth = false,
    handDetected = detection !== null,
  ) {
    if (phase !== this.phase) {
      this.phase = phase;
      this.reset(true);
    }
    const interval = this.lastSampleAt === null ? 0 : now - this.lastSampleAt;
    // Measure delivered samples, including misses; never learn a prolonged interruption.
    if (smooth && this.lastSampleAt !== null) {
      if (interval > 0 && interval <= gestureConfig.maximumSampleGapMs)
        this.observedPeriod =
          this.observedPeriod === null ? interval : (this.observedPeriod + interval) / 2;
    }
    this.lastSampleAt = now;
    if (smooth) samplePeriodMs = Math.max(samplePeriodMs, this.observedPeriod ?? samplePeriodMs);
    const gap = now - this.lastSeenAt;
    const tolerance = gestureConfig.detectionGraceMs + (smooth ? samplePeriodMs : 0);
    const interrupted =
      gap > gestureConfig.maximumSampleGapMs ||
      gap >
        samplePeriodMs +
          gestureConfig.sampleJitterMs +
          (smooth && this.missing ? samplePeriodMs : 0);
    const gesture = recognizedGesture(detection, interrupted ? null : this.candidate);
    const canRelease = this.latch && gesture !== this.latch && (gesture || !handDetected);
    if (!canRelease) this.release = null;
    else if (
      !this.release ||
      this.release.gesture !== gesture ||
      interval > gestureConfig.maximumSampleGapMs
    )
      this.release = { gesture, since: now };
    else if (now - this.release.since >= gestureConfig.releaseMs) {
      this.latch = null;
      this.release = null;
    }
    if (!gesture) {
      if (this.candidate && gap > tolerance) {
        this.candidate = null;
        this.heldMs = 0;
        this.samples = 0;
      }
      this.missing = true;
      return {
        reason: this.candidate ? 'Amostra incerta; tempo pausado' : 'Sem detecção estável',
        gesture: this.candidate,
        progress: this.candidate
          ? Math.min(1, this.heldMs / confirmationDuration(this.candidate))
          : 0,
        command: null,
      };
    }
    const changed = this.candidate !== gesture;
    if (changed || interrupted) {
      this.candidate = gesture;
      this.heldMs = 0;
      this.samples = 1;
    } else {
      if (!this.missing) this.heldMs += now - this.lastSeenAt;
      this.samples++;
    }
    this.lastSeenAt = now;
    this.missing = false;
    const progress = Math.min(1, this.heldMs / confirmationDuration(gesture));
    const allowed = commandFor(phase, gesture);
    const command =
      progress >= 1 &&
      this.samples >= gestureConfig.minimumConfirmationSamples &&
      allowed &&
      this.latch !== gesture &&
      (allowed === 'cancel' || now - this.lastCommandAt >= gestureConfig.commandCooldownMs)
        ? allowed
        : null;
    if (command) {
      this.lastCommandAt = now;
      this.latch = gesture;
      this.reset(true);
    }
    const reason = command
      ? 'Comando autorizado'
      : !allowed
        ? 'Gesto bloqueado nesta fase'
        : this.latch === gesture
          ? 'Aguardando liberação'
          : changed
            ? 'Novo gesto'
            : interrupted
              ? 'Intervalo prolongado'
              : progress < 1
                ? 'Confirmando estabilidade'
                : 'Intervalo de segurança';
    return { gesture, progress, command, reason };
  }
}
