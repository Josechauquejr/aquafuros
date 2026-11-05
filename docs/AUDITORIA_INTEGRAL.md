# Auditoria integral do sistema

**Estado:** Inventario tecnico, correcao da suite e verificacoes locais de schema/scheduler concluidos; auditoria visual, acessibilidade manual e baseline UX com utilizadores pendentes.  
**Snapshot:** 25/10/2026 (Africa/Johannesburg).  
**Ã‚mbito desta entrega:** Fase 0 documental, com reconciliaÃ§Ã£o inicial de roles, rotas, pÃ¡ginas, dados e processos a partir do repositÃ³rio.

Este documento e o registo de rastreabilidade do prompt. Nao declara conformidade integral nem ganhos de UX sem observacao ou medicao. Inventarios: [rotas](INVENTARIO_ROTAS.md), [roles por pagina](MATRIZ_ROLE_PAGINA.md), [acoes e salvaguardas](INVENTARIO_ACOES.md), [paginas e props](INVENTARIO_PAGINAS.md), [pagina-controller-dados](INVENTARIO_PAGINAS_DADOS.md), [componentes](INVENTARIO_COMPONENTES.md), [modelos/schema/migrations](INVENTARIO_MODELO_DADOS.md), [codigo e performance](INVENTARIO_E_PERFORMANCE.md) e [plano de melhorias](PLANO_DE_MELHORIAS.md).

## 1. EvidÃªncia e limites

| Artefacto | EvidÃªncia observada | Limite |
|---|---|---|
| Rotas | `php artisan route:list --json`: 175 endpoints no snapshot; detalhe de verbo, URI, nome, middleware e action no inventario de rotas. | A contagem anterior de 176 em `INVENTARIO_E_PERFORMANCE.md` era manual e estava errada: o diff de `routes/web.php` no commit `527913f` acrescentou e removeu 8 declaracoes de rota, sem alterar a cardinalidade. |
| Perfis | `RoleSeeder` cria administrador, gestor, caixa, tÃ©cnico e desenvolvedor; `UserSeeder` cobre os perfis e uma conta tÃ©cnica inactiva. | Seeders nÃ£o medem frequÃªncia real nem confirmam o conjunto de contas de produÃ§Ã£o. |
| PÃ¡ginas | 62 ficheiros JSX em `resources/js/Pages`; resoluÃ§Ã£o Inertia dinÃ¢mica em `resources/js/app.js`. | PÃ¡gina JSX nÃ£o equivale necessariamente a uma rota ou a um ecrÃ£ alcanÃ§Ã¡vel. |
| Dados | 29 modelos Eloquent, 55 migrations no codigo e 46 tabelas observadas na copia local (45 da aplicacao mais `migrations`); nenhuma migration pendente (55/55 marcadas `Ran`). | Schema e migrations da copia local nao sao declarados iguais a producao. |
| Middleware e autorizaÃ§Ã£o | As rotas autenticadas exigem `auth` e `verified`; grupos usam middleware `role:*`; acÃ§Ãµes adicionais validam papel dentro do controller. | A matriz abaixo Ã© de acesso por rota, nÃ£o substitui revisÃ£o de autorizaÃ§Ã£o por acÃ§Ã£o/linha de dados. |
| Performance | `RegistarAcesso` guarda duraÃ§Ã£o e mÃ©tricas de SQL por pedido. HÃ¡ comparaÃ§Ã£o local antes/depois em `INVENTARIO_E_PERFORMANCE.md`. | NÃ£o Ã© mediÃ§Ã£o de tarefa, rede ou navegador; valores nÃ£o representam produÃ§Ã£o. |
| Agendamento/filas | `routes/console.php` agenda apenas o pulso de saude por minuto; existem quatro comandos da aplicacao. | Tarefa local Windows executa o pulso automaticamente por minuto; nenhum job `ShouldQueue` foi encontrado. |
| Utilizadores e operaÃ§Ã£o | NÃ£o foram disponibilizados utilizadores para observaÃ§Ã£o nem logs de eventos de tarefa nesta fase. | CompreensÃ£o, frequÃªncia, erros humanos, decisÃ£o e conclusÃ£o de tarefas nÃ£o podem ser inferidos do cÃ³digo. |

## 2. Roles e permissÃµes: mapa inicial

Os nomes e as pÃ¡ginas abaixo sÃ£o derivados de grupos de rota. Os grupos partilhados dÃ£o acesso ao endpoint conforme o middleware indicado; operaÃ§Ãµes internas podem ser mais restritas. â€œFrequÃªnciaâ€ permanece por medir.

| Role | Objectivo inferido do produto | PÃ¡ginas e Ã¡reas identificadas | Limites explÃ­citos no cÃ³digo | FrequÃªncia |
|---|---|---|---|---|
| Administrador | AdministraÃ§Ã£o operacional e controlo integral, incluindo operaÃ§Ãµes sensÃ­veis. | Dashboard/KPIs, clientes, tarifas, zonas, leituras, estimativas, facturas, cobranÃ§as, pagamentos/caixa, ocorrÃªncias, produÃ§Ã£o, lixeira, emails/notificaÃ§Ãµes, utilizadores e perfil. | AnulaÃ§Ãµes/estornos, correcÃ§Ãµes e reversÃµes crÃ­ticas, gestÃ£o de tarifas/zonas/lixeira; rotas e acÃ§Ãµes conferidas no backend. | NÃ£o medida. |
| Gestor | OperaÃ§Ã£o, facturaÃ§Ã£o, acompanhamento de dÃ­vida e anÃ¡lise de desempenho. | Dashboard do gestor; clientes; leituras e estimativas; facturas e emissÃ£o em lote; cobranÃ§a; pagamentos/recibos/crÃ©ditos/fecho; KPIs; ocorrÃªncias, produÃ§Ã£o e QR. | Sem Ã¡rea `/admin/dashboard`, gestÃ£o de tarifas/zonas, lixeira ou operaÃ§Ãµes exclusivas do administrador; algumas mutaÃ§Ãµes crÃ­ticas continuam exclusivas ao administrador. | NÃ£o medida. |
| Caixa | RecepÃ§Ã£o e registo de pagamentos, crÃ©ditos e reconciliaÃ§Ã£o diÃ¡ria. | Dashboard de caixa; pagamentos, pagamento mÃºltiplo, impressÃ£o, recibos, crÃ©ditos, fecho de caixa, leitura QR e perfil. | Sem clientes/facturas/leitura como Ã¡rea geral; estornos administrativos nÃ£o permitidos; fecho impede registos posteriores do prÃ³prio caixa. | NÃ£o medida. |
| TÃ©cnico | Leituras de contadores e registo de ocorrÃªncias/produÃ§Ã£o. | Dashboard tÃ©cnico; leituras, estimativas, ocorrÃªncias, produÃ§Ã£o e perfil. | Rotas de leitura sÃ£o partilhadas com administrador/gestor/tÃ©cnico; confirmaÃ§Ã£o/aprovaÃ§Ã£o de estimativas Ã© de administrador/gestor. Confirmar cada endpoint no inventÃ¡rio. | NÃ£o medida. |
| Desenvolvedor | DiagnÃ³stico, saÃºde, manutenÃ§Ã£o e suporte tÃ©cnico isolado. | Ãrea `/dev`: painel, saÃºde, auditoria, dados, integridade, anÃ¡lise, filas, operaÃ§Ãµes, email, logs, utilizadores e tarefas; perfil e funcionalidades partilhadas. | Isolamento expresso de administrador; acÃ§Ãµes de escrita requerem configuraÃ§Ã£o, confirmaÃ§Ã£o de senha, throttling e auditoria conforme o endpoint. | NÃ£o medida. |

### Matrizes iniciais

**Role x page x permission:** [MATRIZ_ROLE_PAGINA.md](MATRIZ_ROLE_PAGINA.md) cobre as entradas GET; [INVENTARIO_ACOES.md](INVENTARIO_ACOES.md) cobre todos os endpoints com verbos mutaveis e sinais inline. Middleware de role esta expresso por rota. Autorizacao por registo/estado exige validacao funcional e testes directos.


| Role(s) | Fluxo/tarefa | EvidÃªncia para o percurso | Tempo, interacÃ§Ãµes, erros e conclusÃ£o |
|---|---|---|---|
| TÃ©cnico â†’ gestor/administrador | Registar leitura â†’ validar/confirmar â†’ gerar factura | `LeituraController`, `FacturaController`, rotas de preview/confirmaÃ§Ã£o e emissÃ£o. | NÃ£o medidos; percurso AS-IS exacto requer observaÃ§Ã£o da interface. |
| Caixa | Localizar dÃ­vida â†’ registar pagamento simples/mÃºltiplo ou crÃ©dito â†’ emitir recibo â†’ fechar caixa | `PagamentoController`, `CreditoController`, `FechoCaixa`, rotas de impressÃ£o/recibo. | NÃ£o medidos. Integridade concorrente e financeira jÃ¡ tem documentaÃ§Ã£o de regressÃ£o separada. |
| Gestor/administrador | Identificar dÃ­vida â†’ registar contacto/promessa â†’ acompanhar/cancelar promessa | `CobrancaController` e pÃ¡ginas de cobranÃ§a. | NÃ£o medidos. |
| Gestor/administrador/tÃ©cnico | Rever leitura estimada â†’ confirmar/aprovar/cancelar â†’ facturar | `LeituraEstimadaController` e permissÃµes por endpoint. | NÃ£o medidos. |
| Administrador | Administrar clientes, zonas, tarifas, utilizadores e recuperar registos da lixeira | Controllers respectivos e grupos de rotas administrativos/partilhados. | NÃ£o medidos. |
| Desenvolvedor | Diagnosticar saÃºde/erros â†’ inspeccionar dados/operaÃ§Ã£o â†’ aplicar alteraÃ§Ã£o protegida e auditada | Controllers `Dev\*`, middleware de auditoria/escrita e confirmaÃ§Ã£o de senha. | NÃ£o medidos. |

**Pagina x componente x dados:** 62 ficheiros JSX, origens literais do render, props, imports/componentes e referencias estaticas a models/services estao catalogados em `INVENTARIO_PAGINAS.md`, `INVENTARIO_COMPONENTES.md` e `INVENTARIO_PAGINAS_DADOS.md`. Nao expande dependencias transitivas nem prova o payload final; continua pendente a validacao de estados e comportamento por pagina.

## 3. Fluxos AS-IS, TO-BE e DELTA

Os percursos documentados acima sÃ£o mapas de entrada pelo cÃ³digo, nÃ£o observaÃ§Ãµes exactas do comportamento de utilizadores. A sequÃªncia de telas, decisÃµes, validaÃ§Ãµes visÃ­veis, estados vazios/erro, tempos e interacÃ§Ãµes serÃ¡ preenchida por tarefa numa revisÃ£o por role. AtÃ© recolher essa baseline, nenhuma reduÃ§Ã£o percentual de passos ou tempo Ã© atribuÃ­da.

| Fluxo | AS-IS verificÃ¡vel agora | TO-BE / DELTA | PrÃ³xima evidÃªncia necessÃ¡ria |
|---|---|---|---|
| Leitura â†’ facturaÃ§Ã£o | Rotas de consulta/preview/confirmaÃ§Ã£o e emissÃ£o existem; regras de transiÃ§Ã£o descritas nos testes e documentaÃ§Ã£o P0/P1. | NÃ£o especificado antes de observar e medir o fluxo no ecrÃ£. | SessÃ£o observada com tÃ©cnico e gestor; tarefa, dispositivo, erros e tempos. |
| Pagamento â†’ fecho | Pagamentos individuais/mÃºltiplos, crÃ©dito, recibo e fecho tÃªm endpoints separados; concorrÃªncia e bloqueios financeiros foram tratados. | Preservar confirmaÃ§Ã£o e controlo financeiro; simplificar apenas com evidÃªncia de desperdÃ­cio. | ObservaÃ§Ã£o com caixa; medir navegaÃ§Ã£o, interacÃ§Ãµes, tempo e recuperaÃ§Ã£o. |
| CobranÃ§a | Lista operacional, registo de contacto e cancelamento de promessa. | NÃ£o especificado. | ObservaÃ§Ã£o com gestor e anÃ¡lise de utilizaÃ§Ã£o real. |
| DiagnÃ³stico tÃ©cnico | Ãrea dev instrumenta acessos e oferece saÃºde/anÃ¡lise/logs; mutaÃ§Ãµes crÃ­ticas tÃªm salvaguardas. | NÃ£o especificado. | Tarefas de diagnÃ³stico observadas; avaliar alertas e tempo para localizar causa. |

## 4. Problemas confirmados e registo de auditoria

Os estados distinguem implementacao de validacao com utilizadores. Nenhum ganho de UX e alegado sem baseline comparavel.

### AUD-001 - Telemetria de tarefa ausente

- **Role:** Todos.
- **Pagina:** Fluxos operacionais autenticados.
- **Fluxo:** Inicio, conclusao ou abandono de tarefa.
- **Problema:** Nao ha eventos para as metricas de tarefa M1?M7, M9 e M10. A medicao por pedido nao identifica uma tarefa.
- **Evidencia:** Busca estatica em `app`, `resources`, `routes`, `bootstrap` e `config`; `RegistarAcesso` apenas grava pedido, URL, utilizador, IP, user-agent, status e tempos de servidor/SQL.
- **Impacto:** Sem conclusao, interaccoes, rework ou decisao observaveis, a eficiencia percebida nao pode ser comparada.
- **Areas/principios:** A12, A16, A23, A27, B16.
- **Metricas:** M1?M7, M9, M10; baseline nao medida.
- **Solucao/implementacao:** Desenhar eventos minimos por tarefa e politica de retencao antes de instrumentar; nao recolher conteudo de formulario.
- **Testes/resultado:** Nao aplicavel ainda; nenhuma medicao inventada.
- **Estado/prioridade:** Planeado; alta.

### AUD-002 - Inventario tecnico ampliado; validacao de interacao pendente

- **Role:** Todos.
- **Pagina:** Todas as paginas Inertia e endpoints de escrita.
- **Fluxo:** Navegacao e execucao de tarefas por role.
- **Problema:** A leitura estatica nao valida estados efectivamente renderizados, dependencias transitivas, acessibilidade ou autorizacao por registo em execucao.
- **Evidencia:** 62 JSX, 65 chamadas literais de render (63 nomes), 175 rotas, 99 endpoints mutaveis (excluidos redirects multi-verbo), 29 modelos, 55 migrations, 45 tabelas na copia local; componentes, props/dados, roles e marcadores de proteccao catalogados nos inventarios ligados acima.
- **Impacto:** A documentacao tecnica esta reconciliada estaticamente; a experiencia de utilizacao, o payload runtime e permissoes por registo precisam de validacao funcional.
- **Areas/principios:** A01, A11, A13, A15, A22, B11, B13, B18, B19.
- **Metricas:** M3-M7 nao medidas.
- **Solucao/implementacao:** Concluidos inventarios de rotas, paginas/render/props, componentes estaticos, pagina-controller-model/service, endpoints mutaveis/middleware/sinais inline e modelos/tabelas/migrations. Permanecem apenas limites dinamicos e verificacoes operacionais descritos nos documentos.
- **Testes/resultado:** Contagens reconciliadas com `route:list`, ficheiros JSX, models/migrations; schema observado somente leitura no restore local. Sem validacao manual de UI ou endpoint por registo.
- **Estado/prioridade:** Inventario tecnico estatico concluido; verificacao manual/funcional pendente; alta.

### AUD-003 - Performance de tarefa nao medida em producao

- **Role:** Todos.
- **Pagina:** Listas e dashboards identificados no inventario tecnico.
- **Fluxo:** Carregamento e interaccao em rede/dispositivo reais.
- **Problema:** Perfil local anterior nao inclui rede nem navegador e nao caracteriza producao.
- **Evidencia:** `INVENTARIO_E_PERFORMANCE.md` documenta comparacao local de servidor/SQL e limita explicitamente a amostra.
- **Impacto:** M8 parcial; sem inferencia valida sobre latencia percebida ou p95 de producao.
- **Areas/principios:** A29, B16.
- **Metricas:** M8; baseline parcial local, sem comparacao posterior em producao.
- **Solucao/implementacao:** Reavaliar apos instrumentacao/deployment em ambiente representativo, estratificando role/dispositivo e componente de latencia.
- **Testes/resultado:** Comparacao local anterior documentada; novo perfil pendente.
- **Estado/prioridade:** Pendente; media.

### AUD-004 - Agendamento de producao por confirmar

- **Role:** Desenvolvedor e operacao.
- **Pagina:** `/dev/saude` e `/dev/operacoes`.
- **Fluxo:** Verificar pulso e executar comandos/agendamentos.
- **Problema:** O codigo actual agenda apenas o pulso por minuto; nao ha tarefa diaria de negocio registada. A execucao do scheduler no deployment nao foi confirmada.
- **Evidencia:** `routes/console.php` contem somente `pulso-agendador`; `php artisan list --raw` confirma quatro comandos da app. A referencia anterior a `notificacoes:gerar` e ao envio diario estava desactualizada.
- **Impacto:** Nao ha evidencia de automacao diaria de negocio no scheduler actual; disponibilidade operacional em producao permanece desconhecida.
- **Areas/principios:** A23, A24, A28, B16, B17.
- **Metricas:** M8/M10 quando elegiveis; nao medidas.
- **Solucao:** Confirmar o scheduler do deployment e decidir quais tarefas recorrentes fazem parte do produto actual.
- **Implementacao:** Inventario e documentacao corrigidos; nenhuma nova automacao adicionada sem requisito operacional confirmado.
- **Testes/resultado:** Rotas/comandos inspeccionados; ambiente externo pendente.
- **Estado/prioridade:** Pendente de confirmacao operacional; alta.

### AUD-005 - Dialogos modais permitem foco escapar

- **Role:** Todos os perfis que usam formularios e confirmacoes.
- **Pagina:** Dialogos partilhados em clientes, leituras, facturas, cobranca e outras paginas que usam `Modal`.
- **Fluxo:** Abrir dialogo ? ler/preencher/confirmar ? regressar ao ponto de origem.
- **Problema:** O foco so era contido quando o componente tinha `footer`, embora todos os dialogos anunciassem `aria-modal="true"`.
- **Evidencia:** `resources/js/Components/Modal.jsx`; a constante `enquadrado` controlava o bloqueio do fundo e o focus trap, mas nao o estado ARIA.
- **Impacto:** Teclado podia navegar pelo conteudo de fundo enquanto tecnologias de apoio eram informadas de que o dialogo era modal; foco inicial/restauracao inconsistentes.
- **Areas/principios:** A01, A11, A22, A27, B04, B13, B18.
- **Metricas:** M3/M5 candidatas a reavaliar; baseline humana nao medida.
- **Solucao:** Manter foco no dialogo para todos os modais, conter Tab/Shift+Tab, permitir Escape e restaurar foco ao fechar; aumentar alvo do botao Fechar.
- **Implementacao:** `Modal.jsx` agora aplica essas regras independentemente de `footer`; logica de limite isolada em `resources/js/lib/modalFocus.js`.
- **Testes:** `node --test --test-isolation=none tests/js/modalFocus.test.mjs` (4/4); `npm run build` aprovado. Falta verificacao manual por teclado/leitor de ecran.
- **Resultado:** Correcao integrada; resultado de usabilidade ainda nao medido.
- **Estado/prioridade:** Implementado, ainda nao validado com utilizadores; alta.

### AUD-006 - Sem atalho para saltar a navegacao repetida

- **Role:** Todos os perfis autenticados.
- **Pagina:** Shell partilhada `AppShell`.
- **Fluxo:** Percorrer por teclado a navegacao ate ao conteudo de cada pagina.
- **Problema:** Antes da alteracao, a shell nao tinha link de salto para o conteudo principal.
- **Evidencia:** `resources/js/Components/AppShell.jsx` apresentava menu lateral e barra superior antes do conteudo; nao existia `href` para o landmark `main`.
- **Impacto:** Mais tabulacoes repetidas ao navegar entre paginas; tempo de navegacao nao medido.
- **Areas/principios:** A11, A22, A27, B02, B18.
- **Metricas:** M3/M7 candidatas a reavaliar; baseline humana nao medida.
- **Solucao:** Link de salto visivel ao receber foco, com alvo para o landmark principal.
- **Implementacao:** `AppShell.jsx` inclui link com alvo `#conteudo-principal`; o `main` recebe id, foco programatico e indicador visual.
- **Testes:** Build de producao aprovado; falta validacao manual com teclado e leitor de ecran.
- **Resultado:** Atalho integrado; tempo poupado nao medido.
- **Estado/prioridade:** Implementado, ainda nao validado com utilizadores; media.

### AUD-007 - Logs persistiam valores da query string

- **Role:** Desenvolvedor (consulta aos logs); todos os utilizadores cujos pedidos ficam registados.
- **Pagina:** `/dev/logs/acessos`, painel de actividade de pedidos e registo de erros.
- **Fluxo:** Pesquisa/filtro com valor enviado na query string ? pedido ? registo tecnico.
- **Problema:** O middleware de acessos e o registo de excepcoes persistiam `fullUrl()`, incluindo valores de pesquisa/filtros.
- **Evidencia:** `RegistarAcesso.php` e `bootstrap/app.php` gravavam URL completo; a pagina dev apresenta URL em detalhe.
- **Impacto:** Valores potencialmente identificaveis podem permanecer em logs tecnicos; politica de retencao e dados historicos nao foram auditados.
- **Areas/principios:** A19, A22, A29, B16, B18, B19.
- **Metricas:** M8 nao afectada; metrico de acesso continua por rota. Sem baseline de tarefa.
- **Solucao:** Gravar URL sem query string; manter metodo, caminho, status e tempos para diagnostico operacional.
- **Implementacao:** `RegistarAcesso.php` e `bootstrap/app.php` usam `url()`; detalhe em `Dev/Logs.jsx` identifica rota sem parametros.
- **Testes:** Teste HTTP `Fase4PerformanceTest` aprovado (5/5, 20 assertions), incluindo query string; Node (8/8) e build aprovados.
- **Resultado:** Novos registos deixam de guardar valores da query; registos historicos nao foram alterados.
- **Estado/prioridade:** Implementado para novos registos; revisao de retencao historica pendente; alta.

### AUD-008 - Suite PHP alinhada ao escopo e aos drivers suportados

- **Role:** Todos; qualidade transversal.
- **Pagina:** Nao aplicavel; validacao de regressao do sistema.
- **Problema:** A suite inicial reportava 191 aprovados, 20 falhas e 7 erros (218 testes). Os testes assumiam emails/notificacoes a clientes removidos do produto, executavam SQL PostgreSQL no SQLite e tratavam testes concorrentes PostgreSQL como testes SQLite.
- **Solucao/implementacao:** Actualizados os testes de emissao, PDF, painel dev e fluxos da Fase 3 para validar o comportamento actual, incluindo a ausencia de endpoints antigos de email a clientes; SQL do consumo agora aceita ambos os drivers; concorrencia entre processos fica ignorada quando o driver nao e PostgreSQL.
- **Cobertura preservada:** Emissao e nao duplicacao de facturas, PDF, isolamento do historico de emails de autenticacao, whitelist vazia de comandos, fluxos de cobranca sem email e permissao de roles continuam testados.
- **Resultado inicial:** `php artisan test`: 204 testes, 202 aprovados, 0 falhas, 0 erros e 2 ignorados (testes de concorrencia que requerem PostgreSQL). As classes ajustadas passaram: 35 aprovados, 2 ignorados, 331 assertions.
- **Validacao posterior:** Os 2 testes concorrentes passaram separadamente em PostgreSQL isolado (24 assertions). Execucao actual de `php artisan test --compact`: 208 testes, 206 aprovados, 0 falhas, 0 erros e 2 ignorados (1.879 assertions).
- **Estado/prioridade:** Suite SQLite e testes PostgreSQL isolados validados localmente.

### AUD-009 - Controlos sem nome acessivel

- **Role:** Desenvolvedor, utilizadores de tecnologias de apoio.
- **Pagina:** Configuracoes, Operacoes, Analise e Tarefas na area de desenvolvimento.
- **Problema:** Alguns controlos iconicos e switches nao tinham nome programatico; tarefas nao identificavam a acao nem o titulo associado.
- **Evidencia:** Inspecao estatica de JSX encontrou switch sem label em `Dev/Configuracoes.jsx`, botoes de copiar em `Dev/Operacoes.jsx` e `Dev/Analise.jsx`, e botoes iconicos de tarefa em `Dev/Tarefas.jsx`.
- **Solucao/implementacao:** Associar o switch ao nome visivel da funcionalidade e dar nomes explicitos aos controlos de copiar/concluir/reabrir com contexto da tarefa.
- **Validacao:** Build de producao e testes Node executados apos as correccoes; validacao manual com leitor de ecran pendente.
- **Estado/prioridade:** Corrigido por inspecao estatica; alta.

### AUD-010 — Estado das migrations e constraints PostgreSQL local

**Estado:** Validado localmente em 25/10/2026. Um registo historico de cinco migrations pendentes foi superado: `migrate:status` mostra 55/55 `Ran`; constraints e colunas auditadas correspondem ao codigo. Nenhuma migration foi aplicada na base auditada; os testes de concorrencia recriaram apenas a base PostgreSQL explicitamente isolada para testes. Evidencias em [VALIDACAO_POSTGRES_SCHEDULER_2026-10-25.md](VALIDACAO_POSTGRES_SCHEDULER_2026-10-25.md).
### AUD-011 — Peso do JavaScript partilhado e graficos

- **Role:** Todos; maior impacto potencial em dashboards com graficos e dispositivos lentos.
- **Pagina:** Shell partilhada, cartoes KPI e dashboards com ApexCharts.
- **Problema/evidencia:** O build anterior emitia `app` de 660,52 KB e incluia o custo do componente de KPI/graficos no caminho partilhado; ApexCharts isolado mede 520,23 KB (135,99 KB gzip).
- **Solucao/implementacao:** Separar React e Motion em chunks cacheaveis; carregar `GraficoKpi` sob demanda; substituir classes arbitrarias ambiguas por propriedades Tailwind explicitas.
- **Validacao:** `npm run build` passa sem avisos Tailwind; `app` mede 197,55 KB, com chunks `react-vendor` 311,89 KB, `motion-vendor` 121,34 KB e ApexCharts 520,23 KB (135,99 KB gzip).
- **Resultado/limite:** Distribuicao por chunk melhorada e graficos KPI lazy; nao foi medida latencia no browser e nao se declara melhoria de LCP/FCP. ApexCharts ainda excede 500 KB sem gzip em paginas que precisam dele.
- **Estado/prioridade:** Implementado e build validado; impacto real pendente de medicao em browser; media.
### AUD-012 — Seed de demonstracao falhava apos remocao de relacao antiga

- **Role:** Operacao local/QA; afecta a preparacao de dados para todos os perfis.
- **Pagina/fluxo:** Nao aplicavel; `DatabaseSeeder` / `FacturacaoSeeder`.
- **Problema/evidencia:** `php artisan migrate:fresh --seed` falhava porque `FacturacaoSeeder` tentava carregar `Cliente.divida`, relacao removida quando a divida passou a ser derivada das facturas.
- **Solucao/implementacao:** O seeder carrega agora apenas `tarifa`, que e a relacao necessaria ao `BillingService`.
- **Validacao:** `migrate:fresh --seed` concluiu numa base SQLite descartavel; `DatabaseSeederTest` passou e confirma perfis, 10 clientes e 20 facturas.
- **Estado/prioridade:** Corrigido e validado; media.
O padrao de dialogo modal WAI-ARIA APG descreve foco dentro do dialogo, contencao de Tab/Shift+Tab, Escape para fechar e conteudo externo inerte: [W3C WAI-ARIA APG - Dialog (Modal) Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/). O link de salto implementa a tecnica W3C para bypass de blocos repetidos: [W3C WAI - G1](https://www.w3.org/WAI/WCAG21/Techniques/general/G1).

Problemas financeiros P0/P1 tratados, respectivas evidencias e limites de validacao constam de [PLANO_DE_MELHORIAS.md](PLANO_DE_MELHORIAS.md). Nao foram duplicados aqui para evitar divergencia de estado.

## 5. Matriz A â€” 31 Ã¡reas de especializaÃ§Ã£o

Estado permitido: **Por analisar**, **Analisado**, **Planeado**, **Em implementaÃ§Ã£o**, **Implementado**, **Validado**, **Bloqueado**, **NÃ£o aplicÃ¡vel**. â€œAnalisadoâ€ nesta matriz significa consideraÃ§Ã£o documental inicial; nÃ£o equivale a estudo com utilizadores.

| ID | Ãrea | Objectivo/contexto e roles | EvidÃªncia/implementaÃ§Ã£o e validaÃ§Ã£o | Estado |
|---|---|---|---|---|
| A01 | Psicologia cognitiva | Carga mental por tarefa; todos. | Auditoria por ecrÃ£ e teste de compreensÃ£o pendentes. | Por analisar |
| A02 | PercepÃ§Ã£o visual | Leitura de hierarquia/estados; todos. | RevisÃ£o visual e contraste pendentes. | Por analisar |
| A03 | Psicologia comportamental | Feedback e acÃ§Ã£o segura; todos. | Fluxos visÃ­veis por avaliar. | Por analisar |
| A04 | Gestalt | Agrupamento e relaÃ§Ã£o visual; todos. | RevisÃ£o por pÃ¡gina pendente. | Por analisar |
| A05 | Psicologia das cores | SemÃ¢ntica/contraste; todos. | Tokens e uso cromÃ¡tico a inventariar. | Por analisar |
| A06 | Psicologia emocional | ConfianÃ§a/recuperaÃ§Ã£o de erro; todos. | Requer observaÃ§Ã£o e entrevistas/testes. | Por analisar |
| A07 | Psicologia social | Handoffs e responsabilidade entre roles. | Fluxos inter-role inferidos; operaÃ§Ã£o real pendente. | Por analisar |
| A08 | MotivaÃ§Ã£o | Objectivos e progresso nas tarefas. | MÃ©tricas e feedback por rever. | Por analisar |
| A09 | DecisÃ£o | Escolhas de cobranÃ§a/estimativas/KPIs. | Dados e opÃ§Ãµes por pÃ¡gina a rever. | Por analisar |
| A10 | Psicologia do consumidor | TransparÃªncia em facturas/pagamentos. | PÃ¡ginas existentes; teste de compreensÃ£o pendente. | Por analisar |
| A11 | Psicologia humanista | Autonomia, dignidade e inclusÃ£o; todos. | AvaliaÃ§Ã£o de acessibilidade pendente. | Por analisar |
| A12 | Psicologia experimental | HipÃ³teses e validaÃ§Ã£o antes/depois. | Sem amostra/estudo nesta fase; plano em secÃ§Ã£o 9. | Planeado |
| A13 | Information Design | OrganizaÃ§Ã£o de informaÃ§Ã£o operacional. | InventÃ¡rio pÃ¡ginaâ†’dados em curso. | Por analisar |
| A14 | Data Visualization | KPI e sÃ©ries nos dashboards. | GrÃ¡ficos e tarefas perceptivas a auditar. | Por analisar |
| A15 | Information Architecture | NavegaÃ§Ã£o e nomenclatura. | 175 endpoints inventariados; navegaÃ§Ã£o UI pendente. | Por analisar |
| A16 | Quantitative UX Research | Comportamento quantitativo por role. | Telemetria de tarefa nÃ£o encontrada. | Planeado |
| A17 | Numerical Cognition | Valores, unidades, datas e montantes. | Tabelas/formataÃ§Ã£o por pÃ¡gina pendentes. | Por analisar |
| A18 | Financial UX Design | DÃ­vida, cobranÃ§a, pagamentos e fecho. | Integridade tÃ©cnica documentada; compreensÃ£o UX pendente. | Por analisar |
| A19 | Ergonomia cognitiva | Ajuste tarefa/interface/capacidade. | RevisÃ£o por contexto/dispositivo pendente. | Por analisar |
| A20 | Visual Analytics | ExploraÃ§Ã£o e decisÃ£o operacional. | Dashboards admin/gestor/dev existem; utilidade nÃ£o validada. | Por analisar |
| A21 | Data Storytelling | Contexto â†’ interpretaÃ§Ã£o â†’ prÃ³xima acÃ§Ã£o. | SequÃªncia nos dashboards a rever. | Por analisar |
| A22 | HCI | InteracÃ§Ã£o em pÃ¡gina e dispositivos. | InventÃ¡rio de pÃ¡ginas feito; avaliaÃ§Ã£o prÃ¡tica pendente. | Por analisar |
| A23 | Process Mining | Reconstruir trajectos por eventos. | Eventos de acesso existem; sem eventos de tarefa completos. | NÃ£o aplicÃ¡vel, justificado |
| A24 | BPM | Fluxos ponta-a-ponta multi-role. | Fluxos de cÃ³digo identificados; modelaÃ§Ã£o detalhada pendente. | Planeado |
| A25 | Lean Management | Remover esperas/retrabalho sem valor. | Sem tempos observados; aguardar baseline. | Planeado |
| A26 | Value Stream Mapping | Mapear entrega ponta-a-ponta. | DependÃªncias externas e tempos operacionais por descobrir. | Planeado |
| A27 | Task Analysis | Decompor tarefas e decisÃµes. | Candidatos listados; decomposiÃ§Ã£o observada pendente. | Planeado |
| A28 | Workflow Automation | AutomatizaÃ§Ã£o segura e auditÃ¡vel. | Scheduler e emails identificados; avaliaÃ§Ã£o de elegibilidade pendente. | Por analisar |
| A29 | Performance Engineering | LatÃªncia e escalabilidade. | Perfil local antes/depois em `INVENTARIO_E_PERFORMANCE.md`; produÃ§Ã£o pendente. | Implementado |
| A30 | Operations Research | AlocaÃ§Ã£o/sequenciamento operacional. | Sem dados de capacidade/volume para optimizaÃ§Ã£o. | Por analisar |
| A31 | GOMS/KLM | Estimar esforÃ§o de tarefas elegÃ­veis. | Aplicar apÃ³s decomposiÃ§Ã£o e distinguir previsÃ£o de mediÃ§Ã£o real. | Planeado |

## 6. Matriz B â€” 20 princÃ­pios, leis e disciplinas

| ID | ReferÃªncia | Contexto/roles | AplicaÃ§Ã£o e evidÃªncia/teste necessÃ¡rios | Estado |
|---|---|---|---|---|
| B01 | Hick-Hyman | Menus e escolhas de todos os perfis | Medir nÃºmero/complexidade de escolhas e testar findability. | Por analisar |
| B02 | Fitts | Alvos de toque e acÃ§Ãµes frequentes | Rever tamanho/alvo/posiÃ§Ã£o em ecrÃ£s reais. | Por analisar |
| B03 | Von Restorff | AcÃ§Ã£o principal/alertas | Confirmar destaque singular e semÃ¢ntica. | Por analisar |
| B04 | Carga cognitiva | FormulÃ¡rios e operaÃ§Ãµes multi-etapa | Teste de tarefa e retenÃ§Ã£o de dados entre pÃ¡ginas. | Por analisar |
| B05 | Similaridade | Componentes e estados | InventÃ¡rio de variantes e consistÃªncia. | Por analisar |
| B06 | Cleveland/McGill | GrÃ¡ficos/KPIs | Validar codificaÃ§Ã£o contra pergunta analÃ­tica. | Por analisar |
| B07 | Data-Ink Ratio | Dashboards/relatÃ³rios | Remover ruÃ­do apenas quando revisÃ£o confirmar ausÃªncia de valor. | Por analisar |
| B08 | Progressive Disclosure | Dados e opÃ§Ãµes secundÃ¡rias | Verificar descoberta sem esconder informaÃ§Ã£o crÃ­tica. | Por analisar |
| B09 | Preattentive Processing | Prioridades e anomalias | Avaliar detecÃ§Ã£o rÃ¡pida sem depender sÃ³ da cor. | Por analisar |
| B10 | Chunking | Tabelas/formulÃ¡rios/relatÃ³rios | Agrupar conforme tarefa observada. | Por analisar |
| B11 | Visual Hierarchy | Todas as pÃ¡ginas | RevisÃ£o de ordem de leitura e acÃ§Ã£o. | Por analisar |
| B12 | Gestalt Common Region | CartÃµes, filtros e secÃ§Ãµes | Rever agrupamentos e limites visuais. | Por analisar |
| B13 | Consistency Principle | NavegaÃ§Ã£o/componentes/termos | Consolidar sistema visual apÃ³s inventÃ¡rio de variantes. | Por analisar |
| B14 | Signal-to-Noise Ratio | Dashboards/listas | RelevÃ¢ncia de cada coluna/KPI a confirmar por role. | Por analisar |
| B15 | Weber-Fechner | Contraste, escala e diferenÃ§as | NÃ£o assumir percepÃ§Ã£o linear; validar diferenÃ§as visualmente. | Por analisar |
| B16 | Systems Thinking | AlteraÃ§Ãµes partilhadas entre Ã¡reas | RevisÃ£o de dependÃªncias e regressÃ£o por fluxo. | Planeado |
| B17 | Service Design | Fluxos interdepartamentais | Mapear backstage/handoffs e dependÃªncias. | Planeado |
| B18 | Human Factors Engineering | Erros, teclado, seguranÃ§a e contexto | RevisÃ£o de prevenÃ§Ã£o/recuperaÃ§Ã£o e acessibilidade. | Por analisar |
| B19 | Data Architecture & Modeling | Entidades, relaÃ§Ãµes, constraints e consultas | Rever migrations/modelos/schema reconciliado. | Por analisar |
| B20 | Business Intelligence | KPIs, filtros, periodicidade e decisÃ£o | Documentar fÃ³rmula/fonte/unidade/responsÃ¡vel e validar utilidade. | Por analisar |

## 7. Matriz C â€” 10 mÃ©tricas

â€œInstrumentadoâ€ significa fonte tÃ©cnica disponÃ­vel; nenhuma mÃ©trica de tarefa tem baseline de utilizadores nesta entrega. A mÃ©trica M8 tem mediÃ§Ã£o parcial por pedido no servidor.

| ID | MÃ©trica e definiÃ§Ã£o operacional | Fonte/instrumento e contexto | Baseline/meta/pÃ³s/delta | Estado |
|---|---|---|---|---|
| M1 | Time on Task: do evento explÃ­cito de inÃ­cio atÃ© conclusÃ£o/abandono; segundos. | A definir; por role, fluxo, dispositivo. | NÃ£o medida; estabelecer baseline antes de redesenhar o fluxo. | Planeado |
| M2 | Task Completion Rate: tarefas concluÃ­das Ã· tentativas vÃ¡lidas Ã— 100. | Eventos de inÃ­cio/fim e resultado, com tentativas invÃ¡lidas classificadas. | NÃ£o medida; sem amostra. | Planeado |
| M3 | Interaction Count: cliques/toques/entradas relevantes por tentativa. | InstrumentaÃ§Ã£o de cliente minimizada ou observaÃ§Ã£o; por fluxo/dispositivo. | NÃ£o medida. | Planeado |
| M4 | Step Count: etapas lÃ³gicas obrigatÃ³rias por tarefa. | Task analysis observada; separar etapas de interacÃ§Ãµes. | NÃ£o medida; nÃ£o inferir do nÃºmero de pÃ¡ginas. | Planeado |
| M5 | Error Rate: erros humanos, de validaÃ§Ã£o e tÃ©cnicos separados por tentativa/oportunidade definida. | Eventos classificados + observaÃ§Ã£o; denominador a declarar. | NÃ£o medida. | Planeado |
| M6 | Rework Rate: operaÃ§Ãµes refeitas/corrigidas Ã· operaÃ§Ãµes avaliadas Ã— 100. | Auditoria de evento/reversÃ£o e observaÃ§Ã£o; classificar causa. | NÃ£o medida. | Planeado |
| M7 | Navigation Time: tempo gasto a procurar pÃ¡gina/ferramenta para a tarefa. | ObservaÃ§Ã£o ou eventos de navegaÃ§Ã£o; por role/dispositivo. | NÃ£o medida. | Planeado |
| M8 | System Response Time: pedido atÃ© resposta relevante; separar servidor/SQL/rede/renderizaÃ§Ã£o quando possÃ­vel. | `RegistarAcesso`/`AcessoSistema` mede servidor/SQL; browser/rede ainda sem instrumento confirmado. | ComparaÃ§Ã£o local documentada; sem baseline completa de produÃ§Ã£o/browser. Meta por definir apÃ³s SLO e perfil de trÃ¡fego. | Implementado |
| M9 | Decision Time: desde apresentaÃ§Ã£o de informaÃ§Ã£o necessÃ¡ria atÃ© escolha registada. | Eventos de exposiÃ§Ã£o/decisÃ£o ou estudo observado; nÃ£o confundir espera tÃ©cnica. | NÃ£o medida. | Planeado |
| M10 | Automation Rate: operaÃ§Ãµes elegÃ­veis automatizadas Ã· operaÃ§Ãµes elegÃ­veis; excluir decisÃ£o humana necessÃ¡ria. | CatÃ¡logo de processos, eventos de execuÃ§Ã£o e auditoria. | NÃ£o medida; denominador ainda por definir por processo. | Planeado |

Em todas as mÃ©tricas, amostra, percentis, intervalo temporal, role, dispositivo, contexto e mÃ©todo serÃ£o registados. NÃ£o calcular ganhos atÃ© existir baseline comparÃ¡vel.

## 8. Sistema visual, componentes e acessibilidade

HÃ¡ layouts distintos para administraÃ§Ã£o, desenvolvimento e convidados, componentes partilhados (`DataTable`, botÃµes, campos, diÃ¡logos, badges, cartÃµes, navegaÃ§Ã£o) e CSS/Tailwind. O repositÃ³rio tambÃ©m contÃ©m documentaÃ§Ã£o de motion; isso nÃ£o prova consistÃªncia visual nem conformidade WCAG. Ainda nÃ£o foi feita auditoria completa de tokens, tipografia, contraste, foco, teclado, semÃ¢ntica, leitores de ecrÃ£, zoom, estados vazios/erro ou tamanhos mÃ³veis. A referÃªncia de validaÃ§Ã£o serÃ¡ WCAG 2.2 AA aplicÃ¡vel, testada pÃ¡gina a pÃ¡gina com ferramenta e revisÃ£o manual.

Dashboards/relatÃ³rios identificados incluem administrador, gestor, caixa, tÃ©cnico, desenvolvedor e KPIs. NÃ£o foi possÃ­vel declarar neste inventÃ¡rio que cada KPI tem fÃ³rmula, unidade, periodicidade, fonte e responsÃ¡vel documentados; completar antes de redesenhar esses painÃ©is. Tabelas, filtros, grÃ¡ficos e modais serÃ£o mapeados durante a auditoria de pÃ¡gina.

### Inventario de componentes

A contagem estatica por pagina esta em [INVENTARIO_COMPONENTES.md](INVENTARIO_COMPONENTES.md): 46 forms, 31 tabelas HTML, 31 usos de `Modal`, 6 de `DataTable` e 10 tags de graficos reconhecidas. Sao indexadores para a auditoria; imports indirectos, componentes internos, estados e comportamentos precisam de revisao manual.

### Dados e integracoes identificados

Os 29 modelos locais cobrem entidades de clientes/zonas/tarifas; leituras, estimativas, correccoes e acertos; facturas; pagamentos, imputacoes, creditos e fechos; cobranca; ocorrencias/producao; utilizadores/configuracao; emails e auditoria/saude. `INVENTARIO_MODELO_DADOS.md` liga modelos, tabelas convencionais/explicitas, fillable, casts, relacoes e migrations; tambem regista a observacao somente leitura do schema PostgreSQL local e 55/55 migrations marcadas `Ran`. O codigo inclui Gmail OAuth para emails de autenticacao, verificacao assinada de facturas/recibos por QR e geracao de PDF. Nao foi encontrada integracao de gateway de pagamentos nem jobs `ShouldQueue`. O scheduler actual regista apenas o pulso; ver AUD-004.

## 9. Plano faseado, prioridades e critÃ©rios de saÃ­da

| Fase | Trabalho | Prioridade/dependÃªncia | CritÃ©rio de saÃ­da |
|---|---|---|---|
| 0 Descoberta/inventÃ¡rio | Rotas, roles, pÃ¡ginas, controllers, entidades, integraÃ§Ãµes e tarefas; reconciliar endpointâ†”pÃ¡gina. | Em curso; rotas e perfis identificados. | InventÃ¡rio revisto e diferenÃ§as com aplicaÃ§Ã£o/configuraÃ§Ã£o conhecidas registadas. |
| 1 Auditoria/baseline | Observar tarefas por role; definir eventos e medir M1â€“M10 aplicÃ¡veis; acessibilidade e compreensÃ£o. | Depende de acesso a utilizadores, ambiente e consentimento operacional. | Baselines reproduzÃ­veis com contexto, denominador e instrumento; lacunas explÃ­citas. |
| 2 Proposta | AS-IS/TO-BE/DELTA, protÃ³tipos e prioridade por impacto/frequÃªncia/risco/esforÃ§o. | Depende da Fase 1; preservar regras crÃ­ticas. | SoluÃ§Ãµes aprovadas por evidÃªncia e critÃ©rios de aceitaÃ§Ã£o. |
| 3 FundaÃ§Ã£o tÃ©cnica | Telemetria de tarefa com privacidade, tokens/componentes, estados e regressÃµes. | ApÃ³s definir esquema/eventos; mudanÃ§as incrementais. | InstrumentaÃ§Ã£o validada, sem dados sensÃ­veis desnecessÃ¡rios; componentes documentados. |
| 4 Por role | Melhorias para administrador, gestor, caixa, tÃ©cnico e desenvolvedor. | Sequenciar por frequÃªncia, risco e baseline. | Fluxos funcionais, backend autorizado, acessÃ­veis e com reavaliaÃ§Ã£o comparÃ¡vel. |
| 5 Transversal | Handoffs, integraÃ§Ãµes, relatÃ³rios e automatizaÃ§Ãµes. | Depende de BPM e regras operacionais. | AutomaÃ§Ã£o auditÃ¡vel/reversÃ­vel e resultados medidos. |
| 6 ValidaÃ§Ã£o | Repetir mÃ©tricas e estudos de compreensÃ£o/uso. | Depende de implantaÃ§Ã£o controlada e amostra. | ComparaÃ§Ã£o antes/depois sem confundir previsÃ£o com observaÃ§Ã£o. |
| 7 ConsolidaÃ§Ã£o | RegressÃµes, documentaÃ§Ã£o e matrizes A/B/C. | ApÃ³s fases anteriores. | Todos os requisitos aplicÃ¡veis validados; outros justificados e aprovados. |

### PrÃ³ximas tarefas

1. Validar manualmente o cruzamento estatico de paginas, props, models e services nos documentos `INVENTARIO_PAGINAS*.md`; reconciliar referencias transitivas e payloads reais.
2. Validar por testes as regras internas de autorizacao por registo/estado para cada mutacao de risco financeiro/administrativo, usando a matriz estatica como roteiro.
3. Fazer inspeÃ§Ã£o de UI por fluxo e role antes de alterar componentes; incluir estados vazio, espera, erro, validaÃ§Ã£o, confirmaÃ§Ã£o, responsividade e teclado.
4. Especificar plano de observaÃ§Ã£o e instrumentaÃ§Ã£o de mÃ©tricas com eventos mÃ­nimos e polÃ­tica de retenÃ§Ã£o, sem conteÃºdo de formulÃ¡rio ou dados financeiros pessoais.
5. Schema e constraints locais reconciliados; scheduler Windows local configurado e pulso automatico observado. Validar qualquer outro ambiente apenas quando estiver incluido no escopo.

## 10. InventÃ¡rio integral do prompt: estado inicial

| Requisito | EvidÃªncia/implementaÃ§Ã£o actual | Estado |
|---|---|---|
| 31 Ã¡reas especializadas | Matriz A; vÃ¡rias exigem investigaÃ§Ã£o futura ou dados humanos. | Analisado parcialmente |
| 20 princÃ­pios | Matriz B; aplicaÃ§Ã£o por componente ainda nÃ£o auditada. | Analisado parcialmente |
| 10 mÃ©tricas | Matriz C; M8 parcial, as restantes sem baseline observada. | Planeado / parcial |
| Roles Ã— pÃ¡ginas Ã— permissÃµes | 5 roles identificados; inventÃ¡rio de 175 endpoints; pÃ¡gina/aÃ§Ã£o ainda em reconciliaÃ§Ã£o. | Em implementaÃ§Ã£o |
| Roles Ã— fluxos Ã— tarefas | 6 famÃ­lias de fluxo inferidas do cÃ³digo. | Planeado |
| PÃ¡ginas Ã— componentes Ã— dados | 62 pÃ¡ginas e componentes existentes contabilizados; relaÃ§Ãµes por resolver. | Por analisar |
| Fluxo Ã— interacÃ§Ãµes Ã— tempo | Sem estudo de utilizador; nÃ£o inventar contagens. | Por analisar |
| Problema Ã— princÃ­pio Ã— soluÃ§Ã£o | 4 lacunas confirmadas no registo AUD; problemas tÃ©cnicos prÃ©-existentes ligados nos docs. | Em implementaÃ§Ã£o |
| Requisito Ã— implementaÃ§Ã£o Ã— teste Ã— evidÃªncia | Matrizes A/B/C e critÃ©rios definidos; evidÃªncia de UI e resultados posteriores pendentes. | Em implementaÃ§Ã£o |

