import type { GestureDetection } from '../types/gesture';
import { gestureConfig as cfg } from '../config/gestureConfig';
import { recognizedGesture } from './gestureValidation';
import type { GestureName } from '../types/gesture';
export class GestureVote {
  private samples: { time: number; name: string; weight: number }[] = [];
  private accepted: { name: GestureName; time: number } | null = null;
  reset() {
    this.samples = [];
    this.accepted = null;
  }
  accept(d: GestureDetection, time: number, periodMs = 100): GestureDetection {
    const windowMs = Math.min(cfg.maximumSampleGapMs, Math.max(cfg.voteWindowMs, periodMs * 1.5));
    this.samples = this.samples.filter((s) => time - s.time <= windowMs);
    const continuing =
      this.accepted && time - this.accepted.time <= windowMs ? this.accepted.name : null;
    const name = recognizedGesture(d, continuing);
    if (!d || !name) return null;
    this.samples.push({ time, name: d.name, weight: d.score });
    let matching = 0,
      total = 0;
    for (const sample of this.samples) {
      total += sample.weight;
      if (sample.name === d.name) matching += sample.weight;
    }
    if (matching < total * cfg.voteShare) return null;
    this.accepted = { name, time };
    return d;
  }
}
