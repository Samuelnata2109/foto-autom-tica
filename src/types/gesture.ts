export type GestureName = 'Open_Palm' | 'Victory' | 'Closed_Fist' | 'Thumb_Up';
export type GesturePhase = 'idle' | 'countdown' | 'capturing' | 'review' | 'confirmed';
export type GestureDetection = { name: string; score: number } | null;
export type GestureCommand = 'start5' | 'start10' | 'cancel' | 'confirm';

export type GestureWorkerRequest =
  | { type: 'init'; wasmRoot: string; modelUrl: string }
  | { type: 'frame'; frame: ImageBitmap; timestamp: number; id: number };

export type GestureWorkerResponse =
  | { type: 'ready' }
  | { type: 'result'; id: number; detection: GestureDetection }
  | { type: 'error'; message: string };
