# Requisitos

Os requisitos marcados como previstos serão refinados e validados na etapa indicada.

## Funcionais

| ID    | Etapa | Status       | Critério de aceitação                                                                                                                             |
| ----- | ----- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF-01 | 01    | Implementado | Exibir nome, identificação do projeto e aviso de desenvolvimento na página inicial.                                                               |
| RF-02 | 03    | Previsto     | Receber vídeo ao vivo do celular pareado, selecionar uma câmera local quando disponível e recuperar de desconexões.                               |
| RF-03 | 04    | Previsto     | Permitir disparo manual e cancelar contagens de 5 ou 10 segundos. Gerar uma foto por disparo, na resolução da fonte de vídeo, e exibir a revisão. |
| RF-04 | 05    | Previsto     | Reconhecer o gesto configurado localmente e iniciar a mesma contagem do comando manual quando a sessão estiver pronta.                            |
| RF-05 | 06    | Previsto     | Aplicar e remover filtros e molduras, visualizar a composição e exportar a foto.                                                                  |
| RF-06 | 07    | Previsto     | Segmentar as pessoas e substituir o cenário com opção de voltar ao fundo original.                                                                |
| RF-07 | 08    | Previsto     | Armazenar a foto autorizada em área privada do Supabase e permitir sua exclusão.                                                                  |
| RF-08 | 09    | Previsto     | Compartilhar a foto autorizada por QR Code com expiração e revogação.                                                                             |
| RF-09 | 10    | Previsto     | Publicar no Instagram após confirmação por foto e mostrar o resultado ou a opção de download.                                                     |
| RF-10 | 11    | Previsto     | Permitir que operadores autorizados administrem eventos, configuração, retenção e exclusões.                                                      |
| RF-11 | 03–11 | Previsto     | Informar o uso do vídeo e solicitar autorizações separadas antes de captura, armazenamento, compartilhamento e publicação.                        |

Na Etapa 02 foram implementadas a navegação entre recepção e cabine, a seleção
visual de 5 ou 10 segundos, a tela cheia quando suportada e a apresentação de
estados indisponíveis. As prévias de contagem, revisão e compartilhamento estão
disponíveis no servidor de desenvolvimento.

## Não funcionais

| ID     | Critério                                                                                                           | Validação prevista                                                                                                                   |
| ------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| RNF-01 | Interface legível a distância em monitores e televisões, operável por teclado e compatível com movimento reduzido. | Conferir foco, contraste, texto e fluxo em telas estreitas e grandes.                                                                |
| RNF-02 | Prévia responsiva com inferência ativa e recursos liberados ao encerrar a sessão.                                  | Medir taxa de frames, latência, memória e falsos acionamentos em dispositivos de referência. Definir metas com as medições iniciais. |
| RNF-03 | Recuperação de recusa de permissão, perda de vídeo e queda de rede sem disparar ou publicar duas vezes.            | Simular recusa, reconexão, abas em segundo plano e repetição de requisições.                                                         |
| RNF-04 | Transporte protegido, acesso mínimo, fotos privadas e credenciais apenas no servidor quando secretas.              | Testar acesso cruzado, expiração, revogação, exclusão e entradas inválidas. Conferir o bundle e logs.                                |
| RNF-05 | Minimização de dados, retenção e descarte definidos, com tratamento específico para menores.                       | Validar avisos e fluxo de autorizações antes de uso real e revisar os requisitos aplicáveis da LGPD.                                 |
| RNF-06 | Instalação reproduzível e verificação automatizada da fundação.                                                    | Usar o lockfile com `npm ci` e executar lint, verificação de tipos, teste e build.                                                   |

## Riscos técnicos

| Risco                                                         | Mitigação planejada                                                                                                 |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Bloqueios de permissão, codec ou rota de rede no vídeo remoto | Prototipar pareamento em HTTPS, testar em iOS, Android e desktop em redes diferentes e oferecer câmera local.       |
| Falsos gestos e sobrecarga em computadores modestos           | Calibrar confiança e janela temporal, medir falsos disparos e amostrar frames com alternativa manual.               |
| Captura duplicada ou foto com tamanho incorreto               | Centralizar disparos, usar as dimensões reais do vídeo e cobrir cancelamento, concorrência e falhas com testes.     |
| Máscaras imprecisas e consumo de memória com fotos grandes    | Medir com grupos e luz variada, usar prévia reduzida e preservar a opção de fundo original.                         |
| Exposição indevida de fotos ou links encaminhados             | Armazenamento privado, políticas por evento, links revogáveis e curtos, exclusão e trilha de auditoria sem imagens. |
| Mudanças ou indisponibilidade da integração com Instagram     | Validar a API oficial e permissões na Etapa 10 e oferecer download quando a integração falhar.                      |
