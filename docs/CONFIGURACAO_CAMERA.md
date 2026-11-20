# Configuração da câmera

A cabine roda no navegador do computador. O DroidCam configura o caminho do
celular até o Windows por USB ou Wi-Fi. A aplicação recebe a webcam virtual que o
cliente expõe, da mesma forma que recebe qualquer webcam física.

## Instalar

1. No Android, instale o DroidCam pelo link oficial da [página do DroidCam](https://www.droidcam.app/).
2. No Windows, instale o [cliente e o driver de webcam virtual](https://droidcam.app/windows/).
   Use pares compatíveis. O DroidCam Classic para Android usa o cliente Classic.
3. Abra os dois aplicativos e conceda ao DroidCam no celular acesso à câmera.
   Mantenha o áudio do cliente desativado.

## Conectar via Wi-Fi

1. Conecte o celular e o computador à mesma rede local e abra o app Android.
2. No cliente, adicione uma fonte DroidCam e atualize a lista. Se a descoberta não
   funcionar, use **Use WiFi IP** e informe o endereço e, se solicitado, a porta
   indicados no app. No Classic, selecione o modo Wi-Fi e pressione **Start**.
3. Confirme primeiro que o vídeo aparece no cliente. No cliente atual, mantenha
   a fonte ativa para expor a saída **DroidCam Video**.

## Conectar via USB

1. Use um cabo que transfira dados. No Android, se o cliente exigir depuração USB,
   habilite as opções de desenvolvedor tocando sete vezes em **Número da versão**
   nas configurações do aparelho. Em **Opções do desenvolvedor**, ative **Depuração USB**.
2. Conecte o telefone desbloqueado e aceite o pedido de depuração apenas para o
   computador que você está usando. Instale o driver do fabricante se o Windows
   não reconhecer o dispositivo.
3. Atualize a lista no cliente DroidCam, selecione o telefone via USB e confirme
   a imagem. No Classic, escolha **USB** e pressione **Start**.
4. Ao terminar, desative a depuração USB se ela foi habilitada para esse uso.

Consulte o [guia oficial de USB e diagnóstico](https://droidcam.app/help/) para
detalhes por versão.

## Abrir a cabine e validar

1. No computador, execute `npm ci` e `npm run dev`. Abra o localhost informado pelo
   Vite ou use uma página servida por HTTPS. HTTP com endereço IP da rede não
   oferece o contexto seguro exigido pelo navegador para câmera.
2. Clique em **Iniciar experiência**, permita o uso da câmera e selecione
   **DroidCam Video** (ou o nome exibido pelo seu driver). Use **Atualizar lista de câmeras**
   caso tenha aberto o DroidCam depois do navegador.
3. Confira se o movimento no celular aparece no visor. Verifique a resolução e, se
   exibida, a taxa de quadros. A aplicação pede 1920 × 1080, 16:9 e 30 FPS como
   preferências. O dispositivo pode fornecer valores inferiores.
4. Alterne **Espelhar prévia**, mude para outra webcam, desligue a câmera e inicie
   de novo. Saia pelo botão **Início** e confira que o navegador liberou a câmera.
5. Interrompa a conexão no cliente DroidCam e religue. Se o driver remover o
   dispositivo ou encerrar a faixa, a cabine indica desconexão. Alguns drivers
   mantêm a webcam virtual ativa com um quadro congelado ou de espera. Nesse caso,
   confirme o sinal no cliente e desligue e religue a câmera na cabine.

## Diagnóstico

- **Sem vídeo no cliente por USB:** troque o cabo ou a porta, confirme a autorização
  de depuração e verifique o driver no Windows. Use Wi-Fi como alternativa.
- **Sem vídeo no cliente por Wi-Fi:** confira o IP atual e a mesma rede local.
  Redes de convidados podem impedir comunicação entre dispositivos. Verifique
  se o firewall permite o cliente na rede usada pelo evento.
- **Não aparece no navegador:** confirme a imagem no cliente, atualize a lista, feche
  e reabra o navegador se o driver acabou de ser instalado. Confira também o acesso
  à câmera em **Privacidade e segurança** no Windows.
- **Permissão negada:** permita a câmera nas configurações do site e tente novamente.
- **Câmera ocupada:** feche aplicativos ou abas que usam a câmera e tente novamente.
- **Webcam convencional:** conecte a câmera ao computador e selecione seu nome
  no mesmo seletor. Nenhuma configuração do DroidCam é necessária.

O desenvolvedor validou na cabine a webcam integrada e o DroidCam por Wi-Fi.
Transmissão, troca de câmera, espelhamento, reconexão e tela cheia passaram.
A conexão USB não funcionou no equipamento relatado.
