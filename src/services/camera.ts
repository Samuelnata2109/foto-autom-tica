export const cameraMessages = {
  idle: ['Câmera não iniciada', 'Selecione uma câmera e escolha Iniciar câmera.'],
  permission: ['Aguardando permissão', 'Autorize o acesso à câmera na solicitação do navegador.'],
  connecting: ['Conectando câmera', 'Aguarde a inicialização do vídeo.'],
  active: ['Câmera ativa', ''],
  denied: [
    'Permissão negada',
    'Permita o acesso à câmera nas configurações do site e tente novamente.',
  ],
  missing: [
    'Câmera não encontrada',
    'Conecte uma webcam ou inicie o DroidCam no computador. Atualize a lista e selecione a câmera.',
  ],
  busy: ['Câmera ocupada', 'Feche outros aplicativos ou abas que usam a câmera e tente novamente.'],
  incompatible: [
    'Configuração incompatível',
    'Escolha outra câmera ou revise a configuração de vídeo no DroidCam.',
  ],
  disconnected: [
    'Câmera desconectada',
    'Reconecte a câmera ou verifique o vídeo no cliente DroidCam. Depois, tente novamente.',
  ],
  unsupported: [
    'Navegador incompatível',
    'Abra a cabine em um navegador atualizado, por HTTPS ou localhost.',
  ],
  unexpected: [
    'Não foi possível iniciar o vídeo',
    'Verifique a câmera e tente novamente. Se persistir, recarregue a página.',
  ],
} as const;

export type CameraState = keyof typeof cameraMessages;

export function cameraError(error: unknown): CameraState {
  if (typeof error !== 'object' || error === null || !('name' in error)) return 'unexpected';
  switch (error.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'denied';
    case 'NotFoundError':
      return 'missing';
    case 'NotReadableError':
      return 'busy';
    case 'OverconstrainedError':
      return 'incompatible';
    default:
      return 'unexpected';
  }
}

export function stopStream(stream: MediaStream) {
  for (const track of stream.getTracks()) track.stop();
}

export function cameraConstraints(deviceId: string): MediaStreamConstraints {
  return {
    audio: false,
    video: {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      aspectRatio: { ideal: 16 / 9 },
      frameRate: { ideal: 30 },
      ...(deviceId && { deviceId: { exact: deviceId } }),
    },
  };
}

// A solicitação de permissão nativa pode permanecer aberta depois de sair da cabine.
let cameraQueue: Promise<unknown> = Promise.resolve();

export function requestCamera(media: MediaDevices, deviceId: string, signal: AbortSignal) {
  const request = cameraQueue.then(async () => {
    if (signal.aborted) return null;
    const stream = await media.getUserMedia(cameraConstraints(deviceId));
    if (!signal.aborted) return stream;
    stopStream(stream);
    return null;
  });
  cameraQueue = request.catch(() => {});
  return request;
}
