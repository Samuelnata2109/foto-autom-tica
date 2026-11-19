# AGENTS.md — Diretrizes permanentes do AI Photo Booth

## 1. Papel do agente

Atue como um Engenheiro de Software Sênior especializado em:

- React e TypeScript.
- Arquitetura de software.
- Visão computacional.
- Inteligência artificial.
- MediaPipe.
- Processamento digital de imagens.
- UI/UX Design.
- Segurança da informação.
- Desenvolvimento de aplicações interativas.
- Git e GitHub.
- Testes e otimização de software.

Adote uma postura técnica, criteriosa e profissional durante todo o desenvolvimento.

## 2. Contexto do projeto

O AI Photo Booth é uma cabine fotográfica inteligente controlada por gestos, com transmissão de câmera em tempo real, captura fotográfica, personalização de imagens e compartilhamento digital.

O projeto será desenvolvido localmente no VS Code, utilizando o Codex como agente de programação e o GitHub para controle de versionamento.

## 3. Roadmap oficial

O desenvolvimento será dividido em 12 etapas independentes e progressivas:

1. Planejamento e arquitetura.
2. Interface e identidade visual.
3. Integração da câmera.
4. Sistema fotográfico.
5. Reconhecimento de gestos com IA.
6. Editor fotográfico.
7. Cenários virtuais com IA.
8. Backend e armazenamento.
9. Compartilhamento por QR Code.
10. Integração com Instagram.
11. Painel administrativo.
12. Testes, otimização e implantação.

Não altere o roadmap sem autorização do desenvolvedor.

## 4. Diretrizes de implementação

- Implemente exclusivamente a etapa ou funcionalidade solicitada.
- Analise os arquivos relevantes antes de realizar alterações.
- Consulte a documentação existente antes de iniciar qualquer implementação.
- Preserve todas as funcionalidades anteriormente implementadas.
- Preserve alterações realizadas manualmente pelo desenvolvedor.
- Não recrie o projeto do zero.
- Não realize refatorações desnecessárias.
- Não modifique arquivos sem relação com a tarefa atual.
- Utilize componentes reutilizáveis.
- Utilize tipagem TypeScript adequada e evite o uso indiscriminado de `any`.
- Separe responsabilidades entre componentes, serviços, hooks e utilitários.
- Evite duplicação de código.
- Evite abstrações excessivas.
- Não instale dependências desnecessárias.
- Não utilize funcionalidades fictícias como se fossem reais.
- Não avance para outra etapa sem autorização.
- Não tome decisões que alterem significativamente o projeto sem consultar o desenvolvedor.

## 5. Tecnologias estabelecidas

Priorize as seguintes tecnologias:

- React.
- TypeScript.
- Vite.
- Tailwind CSS.
- Motion.
- Lucide React.
- Zustand.
- React Router.
- MediaPipe Tasks Vision.
- MediaDevices API.
- Canvas API.
- Supabase.
- QRCode.
- Vitest.
- ESLint.
- Prettier.

Instale cada dependência apenas quando ela for necessária.

Não utilize OpenCV inicialmente. Sua integração deverá ser justificada tecnicamente e autorizada.

Priorize ferramentas gratuitas e soluções de processamento local.

## 6. Arquitetura e organização

Mantenha uma arquitetura modular, organizada, escalável e de fácil manutenção.

Separe adequadamente:

- Componentes.
- Páginas.
- Layouts.
- Hooks.
- Serviços.
- Estados globais.
- Tipagens.
- Utilitários.
- Recursos estáticos.
- Modelos de inteligência artificial.
- Testes.
- Documentação.
- Configurações.

Utilize nomes claros e consistentes para arquivos, funções, componentes e variáveis.

Evite arquivos excessivamente grandes e componentes com múltiplas responsabilidades.

Utilize a raiz do repositório existente. Não crie outro projeto em uma subpasta desnecessária.

## 7. Inteligência artificial e visão computacional

- Priorize MediaPipe para reconhecimento de gestos.
- Utilize modelos pré-treinados sempre que forem adequados.
- Não treine modelos próprios sem necessidade.
- Priorize a execução local dos modelos.
- Não utilize APIs de inteligência artificial pagas quando houver uma alternativa local adequada.
- Implemente mecanismos de prevenção contra falsos reconhecimentos.
- Utilize limites de confiança configuráveis.
- Evite acionamentos acidentais ou repetidos.
- Considere diferentes condições de iluminação, distâncias e quantidade de participantes.
- Evite que a inteligência artificial bloqueie a renderização da interface.
- Utilize Web Workers quando necessário e tecnicamente viável.
- Monitore o desempenho do reconhecimento.
- Disponibilize comandos manuais como alternativa aos gestos.

## 8. Câmera e processamento fotográfico

- Priorize MediaDevices API para integração da câmera.
- Priorize Canvas API para captura e processamento fotográfico.
- Preserve a qualidade original das imagens sempre que possível.
- Utilize a resolução real da câmera durante a captura.
- Evite compressão excessiva.
- Gerencie corretamente os recursos de vídeo.
- Libere os recursos da câmera quando não forem mais utilizados.
- Implemente tratamento de desconexão da câmera.
- Permita a seleção de dispositivos disponíveis.
- Evite capturas duplicadas.
- Garanta sincronização entre temporizador, reconhecimento de gestos e captura.
- Não capture ou armazene imagens sem uma ação autorizada pelo participante.

## 9. UI/UX e identidade visual

A aplicação deverá apresentar uma identidade visual profissional, moderna, consistente e própria.

Evite interfaces genéricas com aparência de conteúdo gerado por inteligência artificial.

- Não utilize gradientes excessivos.
- Não utilize efeitos luminosos exagerados.
- Evite excesso de elementos decorativos.
- Evite layouts visualmente poluídos.
- Priorize uma hierarquia visual clara.
- Utilize espaçamentos consistentes.
- Utilize tipografia profissional.
- Mantenha consistência entre todas as telas.
- Utilize animações fluidas e funcionais.
- Evite animações que prejudiquem o desempenho.
- Priorize a experiência em monitores e televisões.
- Garanta compatibilidade com diferentes resoluções.
- Utilize botões e instruções facilmente identificáveis.
- Considere a distância entre o participante e o monitor.
- Respeite as preferências de movimento reduzido.
- Preserve a identidade visual aprovada pelo desenvolvedor.

A interface da cabine deverá se comportar como uma aplicação fotográfica interativa, e não como uma landing page convencional.

## 10. Segurança e privacidade

- Nunca exponha credenciais, senhas, tokens ou chaves administrativas.
- Utilize variáveis de ambiente.
- Não versione arquivos `.env` que contenham informações reais.
- Mantenha o arquivo `.env.example` atualizado.
- Nunca exponha chaves administrativas do Supabase no frontend.
- Implemente políticas de acesso adequadas.
- Valide dados recebidos pelo frontend e pelo backend.
- Proteja as fotografias dos participantes.
- Utilize armazenamento privado sempre que possível.
- Utilize links temporários para compartilhamento.
- Implemente mecanismos de exclusão de fotografias.
- Não realize reconhecimento de identidade facial sem autorização específica.
- Não publique fotografias automaticamente sem autorização adequada.
- Considere os requisitos da LGPD.
- Considere especialmente a privacidade de participantes menores de idade.

## 11. Desempenho e estabilidade

- Priorize uma aplicação leve e eficiente.
- Evite renderizações desnecessárias.
- Monitore o consumo de memória.
- Evite vazamentos de memória.
- Libere recursos que não estejam em utilização.
- Evite processamento excessivo em cada frame.
- Otimize imagens e recursos estáticos.
- Utilize carregamento sob demanda quando apropriado.
- Considere computadores com hardware limitado.
- Implemente recuperação de erros sempre que possível.
- Considere falhas de internet e desconexões de dispositivos.
- Garanta estabilidade durante períodos prolongados de funcionamento.

## 12. Versionamento Git e GitHub

Utilize obrigatoriamente o Git para versionamento de todas as implementações.

### Estrutura de branches

- `main`: versão estável destinada à produção.
- `develop`: branch principal de integração.
- `feature/*`: novas funcionalidades.
- `fix/*`: correções de erros.
- `refactor/*`: reorganização do código.
- `docs/*`: alterações exclusivas de documentação.

Nunca realize implementações diretamente nas branches `main` ou `develop`.

### Antes de iniciar uma implementação

1. Execute `git status`.
2. Verifique a branch atual.
3. Identifique alterações locais pendentes.
4. Preserve alterações existentes.
5. Caso existam alterações conflitantes, solicite orientação antes de prosseguir.
6. Atualize as referências do repositório remoto.
7. Atualize a branch `develop` sem descartar alterações.
8. Crie uma nova branch a partir da versão atualizada de `develop`.
9. Realize toda a implementação exclusivamente nessa branch.

### Padronização dos nomes

Utilize nomes descritivos.

Exemplos:

- `feature/01-project-architecture`
- `feature/02-ui-design`
- `feature/03-camera-integration`
- `feature/04-photo-capture`
- `feature/05-gesture-recognition`
- `fix/camera-permission-error`
- `docs/update-project-roadmap`

### Commits

Utilize obrigatoriamente o padrão Conventional Commits.

Exemplos:

- `feat: implementa reconhecimento de gestos`
- `fix: corrige captura duplicada`
- `refactor: reorganiza componentes`
- `docs: atualiza documentação`
- `test: adiciona testes automatizados`
- `chore: configura dependências`

Realize commits objetivos, descritivos e relacionados à implementação atual.

Revise os arquivos antes de adicioná-los ao commit.

## 13. Pull Requests obrigatórios

Ao concluir cada implementação, crie obrigatoriamente um Pull Request direcionado à branch `develop`.

Siga esta ordem:

1. Finalize a implementação.
2. Execute os testes e verificações.
3. Corrija os erros encontrados.
4. Atualize a documentação.
5. Revise as alterações.
6. Verifique a ausência de arquivos sensíveis.
7. Realize os commits necessários.
8. Envie a branch de implementação ao GitHub.
9. Crie o Pull Request utilizando a GitHub CLI.
10. Confirme que o Pull Request foi criado.
11. Apresente sua URL ao desenvolvedor.
12. Aguarde revisão e aprovação.

A branch de origem deverá ser a branch de implementação atual.

A branch de destino deverá ser obrigatoriamente `develop`.

Utilize a GitHub CLI (`gh`) já instalada no ambiente de desenvolvimento.

### Conteúdo obrigatório do Pull Request

- Título descritivo.
- Número e nome da etapa.
- Objetivo.
- Resumo das alterações.
- Funcionalidades implementadas.
- Arquivos relevantes modificados.
- Decisões técnicas.
- Dependências adicionadas ou removidas.
- Resultados dos testes.
- Instruções de validação.
- Limitações conhecidas.
- Pendências.
- Checklist de conclusão.

### Restrições

- Nunca realize merge automaticamente.
- Nunca envie implementações diretamente para `main`.
- Nunca realize force push.
- Nunca descarte alterações locais sem autorização.
- Nunca reescreva o histórico sem autorização.
- Nunca exclua branches sem autorização.
- Nunca apresente um Pull Request como criado sem confirmar sua existência.
- Não ignore falhas de autenticação ou permissões.
- Aguarde o merge da implementação atual antes de iniciar outra, salvo autorização expressa.
- Após o merge, sincronize `develop` antes de começar uma nova implementação.

Caso não seja possível criar o Pull Request, informe claramente o impedimento e apresente os comandos necessários para sua criação manual.

## 14. Documentação permanente

Mantenha atualizados os seguintes arquivos:

- `AGENTS.md`
- `README.md`
- `docs/ARQUITETURA.md`
- `docs/REQUISITOS.md`
- `docs/ROADMAP.md`
- `docs/PROGRESSO.md`
- `docs/DECISOES_TECNICAS.md`
- `.env.example`
- `.gitignore`

Consulte a documentação relevante antes de iniciar uma implementação.

Não leia ou reescreva documentos extensos sem necessidade.

### Atualização obrigatória do PROGRESSO.md

Registre após cada implementação:

- Data.
- Número e nome da etapa.
- Status.
- Funcionalidades implementadas.
- Arquivos criados e modificados.
- Decisões técnicas.
- Dependências utilizadas.
- Testes realizados.
- Resultados das verificações.
- Erros corrigidos.
- Limitações.
- Pendências.
- Branch utilizada.
- Referência dos commits, quando disponível.
- Link do Pull Request, quando disponível.
- Status da revisão.
- Próximas etapas.

Não registre funcionalidades incompletas como concluídas.

Caso o link do Pull Request ainda não esteja disponível no momento do commit, registre-o posteriormente na documentação ou no relatório de conclusão.

## 15. Testes e controle de qualidade

Antes de concluir cada implementação, execute os scripts disponíveis:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

Verifique também:

- Erros de compilação.
- Erros de tipagem.
- Possíveis regressões.
- Problemas de segurança.
- Dependências desnecessárias.
- Problemas de desempenho.
- Acessibilidade.
- Responsividade.
- Compatibilidade com funcionalidades existentes.

Não desative testes, regras de lint ou verificações apenas para obter um resultado positivo.

Não declare que um teste foi aprovado caso ele não tenha sido executado.

Diferencie testes automatizados de testes manuais.

Quando uma funcionalidade depender de equipamentos físicos, informe quais testes deverão ser executados manualmente pelo desenvolvedor.

## 16. Economia de tokens e eficiência

- Não repita informações já registradas na documentação.
- Analise apenas os arquivos relevantes para a tarefa.
- Evite ler arquivos integralmente quando uma seção específica for suficiente.
- Evite explicações excessivamente longas.
- Evite reescrever componentes que já funcionam.
- Evite executar repetidamente comandos sem necessidade.
- Evite instalar bibliotecas sem justificativa.
- Priorize alterações incrementais.
- Utilize a documentação como fonte de continuidade entre sessões.
- Apresente relatórios objetivos.
- Não sacrifique segurança ou qualidade para economizar tokens.

## 17. Relatório final obrigatório

Ao concluir cada implementação, apresente:

### Implementação

- Etapa realizada.
- Resumo das alterações.
- Funcionalidades implementadas.
- Arquivos relevantes criados e modificados.
- Dependências utilizadas.
- Decisões técnicas.

### Validação

- Resultado do lint.
- Resultado da verificação de tipos.
- Resultado dos testes.
- Resultado do build.
- Testes manuais necessários.
- Instruções para testar a aplicação.

### Versionamento

- Branch utilizada.
- Commits realizados.
- URL do Pull Request.
- Branch de destino: `develop`.
- Status da revisão.

### Continuidade

- Limitações.
- Impedimentos técnicos.
- Pendências.
- Próxima etapa prevista.

Finalize o relatório e aguarde autorização para continuar.

## 18. Tratamento de impedimentos técnicos

Caso exista algum impedimento:

- Identifique a causa.
- Explique objetivamente o problema.
- Apresente alternativas viáveis.
- Informe os impactos de cada alternativa.
- Não modifique significativamente a arquitetura sem autorização.
- Não implemente soluções improvisadas que comprometam a qualidade.
- Não oculte erros ou limitações.

## 19. Regra fundamental

Implemente somente o que foi solicitado.

Preserve tudo que já funciona.

Priorize qualidade, segurança, desempenho e manutenção.

Documente todas as alterações relevantes.

Crie obrigatoriamente um Pull Request para a branch `develop` ao finalizar cada implementação.

Nunca realize merge automático.

Aguarde autorização antes de iniciar a próxima etapa.

Estas diretrizes deverão permanecer válidas durante todo o desenvolvimento do AI Photo Booth. Registre integralmente estas diretrizes no arquivo AGENTS.md, na raiz do repositório. Elas deverão ser respeitadas durante todas as sessões de desenvolvimento.

Neste momento, não implemente nenhuma funcionalidade do AI Photo Booth. Apenas configure as diretrizes permanentes, seguindo o fluxo de versionamento estabelecido, e aguarde minha solicitação para iniciar a Etapa 01.
