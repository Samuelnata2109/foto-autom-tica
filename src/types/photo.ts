export type TimerDuration = 5 | 10;

export type CapturedPhoto = {
  blob: Blob;
  width: number;
  height: number;
};

export type SessionPhoto = CapturedPhoto & {
  url: string;
  original: CapturedPhoto;
  frame: 'applied' | 'missing' | 'failed';
};
