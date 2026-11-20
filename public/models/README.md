# Modelo local de gestos

Execute `npm run setup:gesture-model` na raiz do projeto uma vez antes de ativar a IA. O comando baixa o Gesture Recognizer oficial float16/1, verifica o SHA-256 e cria `gesture_recognizer.task` neste diretório. O arquivo do modelo permanece fora do Git porque o model card consultado não explicita a licença de redistribuição do binário. Após a instalação, a cabine carrega o arquivo localmente e não usa CDN durante a inferência.

Origem, hash e instruções de validação: [Reconhecimento de gestos](../../docs/RECONHECIMENTO_GESTOS.md).
