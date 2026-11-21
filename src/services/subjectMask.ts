export function softenSubjectMask(confidence: Float32Array, alpha: Uint8ClampedArray) {
  let foreground = 0;
  for (let i = 0; i < confidence.length; i++) {
    const score = confidence[i]!;
    if (score >= 0.75) foreground++;
    const edge = Math.max(0, Math.min(1, (score - 0.25) / 0.6));
    alpha[i * 4 + 3] = 255 * edge * edge * (3 - 2 * edge);
  }
  return foreground >= Math.max(1, confidence.length * 0.005);
}
