# Identidade visual e interface da cabine

O visor para eventos escolares usa cantos de enquadramento, superfícies escuras e controles
separados da futura transmissão.

| Token visual          | Valor         |
| --------------------- | ------------- |
| Fundo                 | `#0C0E12`     |
| Superfície            | `#191D24`     |
| Superfície secundária | `#242A35`     |
| Primária              | `#377DFF`     |
| Destaque              | `#79A9FF`     |
| Texto principal       | `#F5F7FA`     |
| Texto secundário      | `#9EA9BC`     |
| Títulos e marca       | Space Grotesk |
| Corpo e controles     | Inter         |

`src/styles.css` centraliza cores, fontes, espaçamento, raios, foco, sombra do visor e
transições. O texto escuro sobre o botão azul preserva contraste. Os controles usam
alvo mínimo de 44 px. O foco acompanha a navegação. O guia fica à direita em telas
amplas e abaixo dos controles em tablets e celulares.

Inter e Space Grotesk usam arquivos WOFF2 latinos dos pacotes Fontsource. Ambas usam
SIL Open Font License 1.1, distribuída em `public/licenses/`.
[Licença do Inter](../public/licenses/Inter-OFL.txt) ·
[Licença da Space Grotesk](../public/licenses/Space-Grotesk-OFL.txt).

## Fluxo

- Recepção `#/` → **Iniciar experiência** → cabine `#/cabine`.
- Na cabine, **Início** retorna à recepção. Tela cheia acompanha o estado do navegador.
- Em desenvolvimento, o link **Prévias de desenvolvimento** abre contagem, revisão e
  compartilhamento. Cancelar na contagem só troca o estado do exemplo. **Tirar novamente**
  volta à cabine e **Finalizar experiência** volta à recepção.

## Componentes

| Conjunto                                                        | Responsabilidade                                    |
| --------------------------------------------------------------- | --------------------------------------------------- |
| `Brand`, `Button`, `ButtonLink`, `IconButton`, `BoothHeader`    | Marca, controles e navegação.                       |
| `CameraViewport`, `CameraStatus`, `FramingGuides`, `EmptyState` | Visor e comunicação do estado da fonte.             |
| `CaptureControls`, `TimerSelector`, `GestureGuide`              | Controles visuais e referência dos quatro gestos.   |
| `CountdownOverlay`, `PhotoPreview`, `SharingPanel`              | Estados visuais preparados para as próximas etapas. |

A contagem recebe número, duração, progresso de 0 a 1, orientação e cancelamento.
A prévia da foto aceita origem e texto alternativo.
