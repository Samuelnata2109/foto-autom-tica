import type { GestureDetection } from '../types/gesture';
import { gestureConfig as cfg } from '../config/gestureConfig';
import { recognizedGesture } from './gestureValidation';
export class GestureVote {
  private samples: { time: number; name: string; weight: number }[] = [];
  reset() {
    this.samples = [];
  }
  accept(d: GestureDetection, time: number): GestureDetection {
    this.samples = this.samples.filter((s) => time - s.time <= cfg.voteWindowMs);
    if (!d || !recognizedGesture(d)) return null;
    this.samples.push({ time, name: d.name, weight: d.score });
    let matching = 0,
      total = 0;
    for (const sample of this.samples) {
      total += sample.weight;
      if (sample.name === d.name) matching += sample.weight;
    }
    return matching >= total * cfg.voteShare ? d : null;
  }
}
