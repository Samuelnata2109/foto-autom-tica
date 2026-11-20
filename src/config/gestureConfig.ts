export const gestureConfig = {
  minimumConfidence: 0.8,
  confirmationMs: 2000,
  detectionGraceMs: 180,
  sampleJitterMs: 150,
  workerInitializationTimeoutMs: 15000,
  workerInferenceTimeoutMs: 3000,
  fallbackInferenceHz: 5,
  commandCooldownMs: 2000,
  maximumInferenceHz: 10,
  maximumInputWidth: 320,
} as const;
