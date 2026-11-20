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
  minimumConfidence = gestureConfig.minimumConfidence,
): GestureName | null {
  if (!detection || !Number.isFinite(detection.score) || detection.score < minimumConfidence)
    return null;
  return detection.name in gestureLabels ? (detection.name as GestureName) : null;
}

export function commandFor(phase: GesturePhase, gesture: GestureName): GestureCommand | null {
  return commands[phase]?.[gesture] ?? null;
}

export class GestureValidation {
  private candidate: GestureName | null = null;
  private lastSeenAt = 0;
  private heldMs = 0;
  private missing = false;
  private latch: GestureName | null = null;
  private lastCommandAt = -Infinity;
  private phase: GesturePhase = 'idle';

  reset(keepLatch = false) {
    this.candidate = null;
    this.lastSeenAt = 0;
    this.heldMs = 0;
    this.missing = false;
    if (!keepLatch) this.latch = null;
  }

  update(detection: GestureDetection, phase: GesturePhase, now: number, samplePeriodMs = 100) {
    if (phase !== this.phase) {
      this.phase = phase;
      this.reset(true);
    }
    const gesture = recognizedGesture(detection);
    if (!gesture) {
      if ((this.candidate || this.latch) && now - this.lastSeenAt > gestureConfig.detectionGraceMs)
        this.reset();
      else this.missing = true;
      return {
        gesture: this.candidate,
        progress: this.candidate ? Math.min(1, this.heldMs / gestureConfig.confirmationMs) : 0,
        command: null,
      };
    }
    if (this.latch && gesture !== this.latch) this.latch = null;
    if (
      this.candidate !== gesture ||
      now - this.lastSeenAt > samplePeriodMs + gestureConfig.sampleJitterMs
    ) {
      this.candidate = gesture;
      this.heldMs = 0;
    } else {
      if (!this.missing) this.heldMs += now - this.lastSeenAt;
    }
    this.lastSeenAt = now;
    this.missing = false;
    const progress = Math.min(1, this.heldMs / gestureConfig.confirmationMs);
    const allowed = commandFor(phase, gesture);
    const command =
      progress >= 1 &&
      allowed &&
      this.latch !== gesture &&
      now - this.lastCommandAt >= gestureConfig.commandCooldownMs
        ? allowed
        : null;
    if (command) {
      this.lastCommandAt = now;
      this.latch = gesture;
      this.reset(true);
    }
    return { gesture, progress, command };
  }
}
