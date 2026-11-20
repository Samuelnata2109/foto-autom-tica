export type GestureName = 'Open_Palm' | 'Victory' | 'Closed_Fist' | 'Thumb_Up';
export type GesturePhase = 'idle' | 'countdown' | 'capturing' | 'review' | 'confirmed';
export type HandPoint = { x: number; y: number; z: number };
export type ThumbMetrics = { straightRatio: number; outwardRatio: number; foldedFingers: number };
export type GestureDetection = {
  name: string;
  score: number;
  raw?: string;
  rawScore?: number;
  geometry?: GestureName | null;
  points?: HandPoint[];
  thumbMetrics?: ThumbMetrics | null;
} | null;
export type GestureCommand = 'start5' | 'start10' | 'cancel' | 'confirm';

export type GestureWorkerRequest =
  | { type: 'init'; wasmRoot: string; modelUrl: string }
  | { type: 'frame'; overlay?: boolean; frame: ImageBitmap; timestamp: number; id: number };

export type GestureWorkerResponse =
  | { type: 'ready' }
  | { type: 'result'; id: number; detection: GestureDetection }
  | { type: 'error'; message: string };
