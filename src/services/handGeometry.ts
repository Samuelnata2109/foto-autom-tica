import type { HandPoint, GestureName } from '../types/gesture';
import { gestureConfig as cfg } from '../config/gestureConfig';
import type { ThumbMetrics } from '../types/gesture';

const distance = (a: HandPoint, b: HandPoint) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
function straightness(a: HandPoint, b: HandPoint, c: HandPoint) {
  const length = distance(a, b) + distance(b, c);
  return length > 1e-6 ? distance(a, c) / length : NaN;
}

const fingerBases = [5, 9, 13, 17];
function fingerMetrics(points: HandPoint[]) {
  return fingerBases.map((base) => {
    const joint = points[base + 1]!;
    const tip = points[base + 3]!;
    return {
      straightness: straightness(points[base]!, joint, tip),
      reach: distance(tip, points[0]!) / distance(joint, points[0]!),
    };
  });
}

type FingerMetrics = ReturnType<typeof fingerMetrics>[number];
const extendsFinger = (finger: FingerMetrics, minimum: number) =>
  finger.straightness >= minimum && finger.reach >= cfg.extendedReach;
const foldsFinger = (finger: FingerMetrics) =>
  finger.straightness <= cfg.foldedFingerStraightness && finger.reach <= cfg.foldedReach;
const validPoints = (points: HandPoint[]) =>
  points.length === 21 &&
  points.every(({ x, y, z }) => Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z));

// Ratios in world coordinates are independent of hand position, rotation, reflection and scale.
export function handGeometry(p: HandPoint[]): GestureName | null {
  if (!validPoints(p)) return null;
  const span = distance(p[5]!, p[17]!);
  if (span < 1e-6) return null;
  const fingers = fingerMetrics(p);
  if (fingers.every((finger) => extendsFinger(finger, cfg.palmFingerStraightness)))
    return 'Open_Palm';
  const palmSize = (span + distance(p[0]!, p[9]!)) / 2;
  if (
    fingers.slice(0, 2).every((finger) => extendsFinger(finger, cfg.victoryFingerStraightness)) &&
    fingers.slice(2).every(foldsFinger) &&
    distance(p[8]!, p[12]!) / palmSize >= cfg.victorySpread
  )
    return 'Victory';
  if (!fingers.every(foldsFinger)) return null;
  const thumb = distance(p[4]!, p[5]!) / span;
  if (
    straightness(p[2]!, p[3]!, p[4]!) >= cfg.thumbStraightRatio &&
    thumb > cfg.thumbExtended &&
    distance(p[4]!, p[17]!) / span > cfg.thumbAcrossPalm
  )
    return 'Thumb_Up';
  return thumb < cfg.thumbTucked ? 'Closed_Fist' : null;
}

// Only complements an official Thumb_Up. A thumb lying across a fist is insufficient.
export function thumbMetrics(p: HandPoint[]): ThumbMetrics | null {
  if (!validPoints(p)) return null;
  const palm = {
    x: (p[5]!.x + p[17]!.x) / 2,
    y: (p[5]!.y + p[17]!.y) / 2,
    z: (p[5]!.z + p[17]!.z) / 2,
  };
  const length = distance(p[2]!, p[3]!) + distance(p[3]!, p[4]!);
  const baseDistance = distance(p[3]!, palm);
  if (length < 1e-6 || baseDistance < 1e-6) return null;
  const fingers = fingerMetrics(p);
  return {
    straightRatio: distance(p[2]!, p[4]!) / length,
    outwardRatio: distance(p[4]!, palm) / baseDistance,
    foldedFingers: fingers.filter(foldsFinger).length,
    extendedFingers: fingers.filter((finger) => extendsFinger(finger, cfg.palmFingerStraightness))
      .length,
  };
}

export function supportsThumb(metrics: ThumbMetrics | null) {
  return (
    metrics !== null &&
    metrics.foldedFingers >= 3 &&
    metrics.extendedFingers === 0 &&
    metrics.straightRatio >= cfg.thumbStraightRatio &&
    metrics.outwardRatio >= cfg.thumbOutwardRatio
  );
}
