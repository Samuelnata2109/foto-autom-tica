import type { HandPoint, GestureName } from '../types/gesture';
import { gestureConfig as cfg } from '../config/gestureConfig';

const distance = (a: HandPoint, b: HandPoint) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
function bend(a: HandPoint, b: HandPoint, c: HandPoint) {
  const ab = distance(a, b),
    bc = distance(b, c);
  return (ab * ab + bc * bc - distance(a, c) ** 2) / (2 * ab * bc);
}

// World landmarks are in metres. Angles and ratios survive rotation, reflection and uniform scale.
export function handGeometry(p: HandPoint[]): GestureName | null {
  if (p.length !== 21 || p.some((q) => ![q.x, q.y, q.z].every(Number.isFinite))) return null;
  const span = distance(p[5]!, p[17]!);
  if (span < 1e-6) return null;
  const states = [5, 9, 13, 17]
    .map((i) => {
      const angle = bend(p[i]!, p[i + 1]!, p[i + 3]!);
      const reach = distance(p[i + 3]!, p[0]!) / distance(p[i + 1]!, p[0]!);
      if (angle < cfg.straightCos && reach > cfg.extendedReach) return 'E';
      if (angle > cfg.foldedCos && reach < cfg.foldedReach) return 'F';
      return '?';
    })
    .join('');
  if (states === 'EEEE') return 'Open_Palm';
  if (states === 'EEFF' && distance(p[8]!, p[12]!) / span > cfg.victorySpread) return 'Victory';
  if (states !== 'FFFF') return null;
  const thumb = distance(p[4]!, p[5]!) / span;
  if (
    bend(p[2]!, p[3]!, p[4]!) < cfg.straightCos &&
    thumb > cfg.thumbExtended &&
    distance(p[4]!, p[17]!) / span > cfg.thumbAcrossPalm
  )
    return 'Thumb_Up';
  return thumb < cfg.thumbTucked ? 'Closed_Fist' : null;
}
