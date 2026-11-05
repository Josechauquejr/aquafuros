# Inventario de paginas, controllers e dados

Complemento do `INVENTARIO_PAGINAS.md`. Leitura estatica de 62 linhas/paginas JSX, origem do Inertia render e simbolos de dados referenciados no metodo do controller. Props e rotas continuam referenciadas no inventario base.

Modelos/servicos/tabelas abaixo sao referencias lexicais no metodo de render, nao prova de que toda coluna chega ao browser. Helpers e chamadas transitivas nao sao expandidos.

| Pagina Inertia | Ficheiro JSX | Metodo render | GET routes ligadas | Modelos referenciados | Servicos referenciados | DB tables directas |
|---|---|---|---|---|---|---|
| `AcessoBloqueado` | `resources/js/Pages/AcessoBloqueado.jsx` | Nao identificado automaticamente | Middleware/excepcao 403; sem rota propria | Nao identificado estaticamente | Nao identificado estaticamente | Nao identificado estaticamente |
| `Admin/Dashboard` | `resources/js/Pages/Admin/Dashboard.jsx` | `index` | `admin/dashboard` (admin.dashboard) | Nao identificado estaticamente | `MesReferencia` | Nao detectadas (consulta por modelo ou indireta) |
| `Admin/Kpis` | `resources/js/Pages/Admin/Kpis.jsx` | `kpis` | `admin/kpis` (admin.kpis) | Nao identificado estaticamente | `MesReferencia` | Nao detectadas (consulta por modelo ou indireta) |
| `Admin/Logs` | `resources/js/Pages/Admin/Logs.jsx` | `index` | `dev/actividade` (dev.logs.actividade) | `User` | Nao identificado estaticamente | Nao detectadas (consulta por modelo ou indireta) |
| `Auth/ConfirmPassword` | `resources/js/Pages/Auth/ConfirmPassword.jsx` | `show` | `confirm-password` (password.confirm) | Nao identificado estaticamente | Nao identificado estaticamente | Nao detectadas (consulta por modelo ou indireta) |
| `Auth/ForgotPassword` | `resources/js/Pages/Auth/ForgotPassword.jsx` | `create` | `forgot-password` (password.request) | Nao identificado estaticamente | Nao identificado estaticamente | Nao detectadas (consulta por modelo ou indireta) |
| `Auth/Login` | `resources/js/Pages/Auth/Login.jsx` | `create` | `login` (login) | Nao identificado estaticamente | Nao identificado estaticamente | Nao detectadas (consulta por modelo ou indireta) |
| `Auth/ResetPassword` | `resources/js/Pages/Auth/ResetPassword.jsx` | `create` | `reset-password/{token}` (password.reset) | Nao identificado estaticamente | Nao identificado estaticamente | Nao detectadas (consulta por modelo ou indireta) |
| `Auth/VerifyEmail` | `resources/js/Pages/Auth/VerifyEmail.jsx` | `__invoke` | `verify-email` (`verification.notice`) | Nao identificado estaticamente | Nao identificado estaticamente | Nao identificado estaticamente |
| `Auth/VerifyResetCode` | `resources/js/Pages/Auth/VerifyResetCode.jsx` | `code` | `forgot-password/code` (password.code) | Nao identificado estaticamente | Nao identificado estaticamente | Nao detectadas (consulta por modelo ou indireta) |
| `Caixa/Dashboard` | `resources/js/Pages/Caixa/Dashboard.jsx` | `index` | `caixa/dashboard` (caixa.dashboard) | `Credito`, `Factura`, `Pagamento` | Nao identificado estaticamente | Nao detectadas (consulta por modelo ou indireta) |
| `Clientes/Imprimir` | `resources/js/Pages/Clientes/Imprimir.jsx` | `imprimir` | `clientes/{cliente}/imprimir` (clientes.imprimir) | `Cliente`, `Factura` | Nao identificado estaticamente | Nao detectadas (consulta por modelo ou indireta) |
| `Clientes/Index` | `resources/js/Pages/Clientes/Index.jsx` | `index` | `clientes` (clientes.index) | `Cliente`, `Configuracao`, `Tarifa`, `Zona` | `BuscaDifusa`, `ListaQuery` | Nao detectadas (consulta por modelo ou indireta) |
| `Clientes/Show` | `resources/js/Pages/Clientes/Show.jsx` | `show` | `clientes/{cliente}` (clientes.show) | `AjusteLeitura`, `Cliente`, `Tarifa`, `Zona` | Nao identificado estaticamente | Nao detectadas (consulta por modelo ou indireta) |
| `Cobranca/Index` | `resources/js/Pages/Cobranca/Index.jsx` | `index` | `cobranca` (cobranca.index) | `Cliente`, `ContactoCobranca`, `Credito`, `Factura`, `PromessaPagamento`, `Zona` | Nao identificado estaticamente | Nao detectadas (consulta por modelo ou indireta) |
| `Creditos/Recibo` | `resources/js/Pages/Creditos/Recibo.jsx` | `recibo` | `creditos/{credito}/recibo` (creditos.recibo) | `Credito` | Nao identificado estaticamente | Nao detectadas (consulta por modelo ou indireta) |
| `Dev/Analise` | `resources/js/Pages/Dev/Analise.jsx` | `analise` | `dev/analise` (dev.analise) | Nao identificado estaticamente | `AnaliseDados` | Nao detectadas (consulta por modelo ou indireta) |
| `Dev/Auditoria` | `resources/js/Pages/Dev/Auditoria.jsx` | `index` | `dev/auditoria` (dev.auditoria) | `DevAuditoria` | Nao identificado estaticamente | Nao detectadas (consulta por modelo ou indireta) |
| `Dev/Configuracoes` | `resources/js/Pages/Dev/Configuracoes.jsx` | `index` | `dev/configuracoes` (dev.configuracoes.index) | `Configuracao`, `EmpresaPerfil`, `Funcionalidade` | Nao identificado estaticamente | Nao detectadas (consulta por modelo ou indireta) |
| `Dev/Dados` | `resources/js/Pages/Dev/Dados.jsx` | `index` | `dev/dados` (dev.dados.index) | Nao identificado estaticamente | `ExploradorDados` | Nao detectadas (consulta por modelo ou indireta) |
| `Dev/DadosRegisto` | `resources/js/Pages/Dev/DadosRegisto.jsx` | `registo` | `dev/dados/{tabela}/registo/{id}` (dev.dados.registo) | `DevAuditoria` | `ExploradorDados` | Nao detectadas (consulta por modelo ou indireta) |
| `Dev/DadosTabela` | `resources/js/Pages/Dev/DadosTabela.jsx` | `tabela` | `dev/dados/{tabela}` (dev.dados.tabela) | Nao identificado estaticamente | `ExploradorDados` | Nao detectadas (consulta por modelo ou indireta) |
| `Dev/EmailConfig` | `resources/js/Pages/Dev/EmailConfig.jsx` | `index` | `dev/email` (dev.email) | Nao identificado estaticamente | `Facturacao`, `GmailOAuth` | Nao detectadas (consulta por modelo ou indireta) |
| `Dev/Emails` | `resources/js/Pages/Dev/Emails.jsx` | `index` | `dev/emails` (dev.emails) | `EnvioEmail` | Nao identificado estaticamente | Nao detectadas (consulta por modelo ou indireta) |
| `Dev/Filas` | `resources/js/Pages/Dev/Filas.jsx` | `index` | `dev/filas` (dev.filas) | Nao identificado estaticamente | `LeitorLogs` | `failed_jobs`, `jobs` |
| `Dev/Integridade` | `resources/js/Pages/Dev/Integridade.jsx` | `index` | `dev/integridade` (dev.integridade) | Nao identificado estaticamente | `VerificacoesIntegridade` | Nao detectadas (consulta por modelo ou indireta) |
| `Dev/IntegridadeDetalhe` | `resources/js/Pages/Dev/IntegridadeDetalhe.jsx` | `detalhe` | `dev/integridade/{chave}` (dev.integridade.detalhe) | Nao identificado estaticamente | `VerificacoesIntegridade` | Nao detectadas (consulta por modelo ou indireta) |
| `Dev/Logs` | `resources/js/Pages/Dev/Logs.jsx` | `acessos` | `dev/logs/acessos` (dev.logs.acessos) | `AcessoSistema`, `User` | `ResolvedorPeriodo` | Nao detectadas (consulta por modelo ou indireta) |
| `Dev/LogsAplicacao` | `resources/js/Pages/Dev/LogsAplicacao.jsx` | `index` | `dev/logs/aplicacao` (dev.logs.aplicacao) | Nao identificado estaticamente | `LeitorLogs` | Nao detectadas (consulta por modelo ou indireta) |
| `Dev/Operacoes` | `resources/js/Pages/Dev/Operacoes.jsx` | `index` | `dev/operacoes` (dev.operacoes) | Nao identificado estaticamente | `Agendador` | Nao detectadas (consulta por modelo ou indireta) |
| `Dev/Painel` | `resources/js/Pages/Dev/Painel.jsx` | `index` | `dev/painel` (dev.painel) | `AcessoSistema`, `ErroSistema` | `ResolvedorPeriodo` | Nao detectadas (consulta por modelo ou indireta) |
| `Dev/Saude` | `resources/js/Pages/Dev/Saude.jsx` | `index` | `dev/saude` (dev.saude) | Nao identificado estaticamente | `SaudeSistema` | Nao detectadas (consulta por modelo ou indireta) |
| `Emails/Index` | `resources/js/Pages/Emails/Index.jsx` | `index` | `emails` (emails.index) | `EnvioEmail` | Nao identificado estaticamente | Nao detectadas (consulta por modelo ou indireta) |
| `Facturas/Imprimir` | `resources/js/Pages/Facturas/Imprimir.jsx` | `imprimir` | `facturas/{factura}/imprimir` (facturas.imprimir) | `Factura` | Nao identificado estaticamente | Nao detectadas (consulta por modelo ou indireta) |
| `Facturas/ImprimirLote` | `resources/js/Pages/Facturas/ImprimirLote.jsx` | `imprimirLote` | `facturas/imprimir-lote` (facturas.imprimir-lote) | `EmpresaPerfil`, `Factura` | Nao identificado estaticamente | Nao detectadas (consulta por modelo ou indireta) |
| `Facturas/Index` | `resources/js/Pages/Facturas/Index.jsx` | `index` | `facturas` (facturas.index) | `Factura`, `Leitura` | `ListaQuery`, `MesReferencia`, `ResumoMensal` | Nao detectadas (consulta por modelo ou indireta) |
| `Gestor/Dashboard` | `resources/js/Pages/Gestor/Dashboard.jsx` | `index` | `gestor/dashboard` (gestor.dashboard) | `Cliente`, `Leitura` | `Alertas`, `MesReferencia`, `ResumoMensal` | Nao detectadas (consulta por modelo ou indireta) |
| `Leituras/Estimadas` | `resources/js/Pages/Leituras/Estimadas.jsx` | `index` | `leituras-estimadas` (leituras-estimadas.index) | `AcertoLeitura`, `Cliente`, `LeituraEstimada` | Nao identificado estaticamente | Nao detectadas (consulta por modelo ou indireta) |
| `Leituras/Index` | `resources/js/Pages/Leituras/Index.jsx` | `index` | `leituras` (leituras.index) | `Cliente`, `Leitura` | `BuscaDifusa`, `Facturacao`, `ListaQuery`, `MesReferencia`, `ResumoMensal` | Nao detectadas (consulta por modelo ou indireta) |
| `LerQr` | `resources/js/Pages/LerQr.jsx` | Closure | `ler-qr` (`qr.ler`) | Nao identificado estaticamente | Nao identificado estaticamente | Nao identificado estaticamente |
| `Lixeira/Index` | `resources/js/Pages/Lixeira/Index.jsx` | `index` | `lixeira` (lixeira.index) | `Cliente`, `Leitura`, `Pagamento` | `BuscaDifusa`, `ListaQuery` | Nao detectadas (consulta por modelo ou indireta) |
| `NotificacoesSistema/Index` | `resources/js/Pages/NotificacoesSistema/Index.jsx` | `index` | `notificacoes-sistema` (notificacoes-sistema.index) | Nao identificado estaticamente | `Alertas` | Nao detectadas (consulta por modelo ou indireta) |
| `Ocorrencias/Index` | `resources/js/Pages/Ocorrencias/Index.jsx` | `index` | `ocorrencias` (ocorrencias.index) | `Cliente`, `Ocorrencia`, `Zona` | Nao identificado estaticamente | Nao detectadas (consulta por modelo ou indireta) |
| `Pagamentos/FechoCaixa` | `resources/js/Pages/Pagamentos/FechoCaixa.jsx` | `fechoCaixa` | `pagamentos/fecho-caixa` (pagamentos.fecho-caixa) | `Credito`, `FechoCaixa`, `Pagamento`, `User` | Nao identificado estaticamente | Nao detectadas (consulta por modelo ou indireta) |
| `Pagamentos/Imprimir` | `resources/js/Pages/Pagamentos/Imprimir.jsx` | `imprimir` | `pagamentos/{pagamento}/imprimir` (pagamentos.imprimir) | `Pagamento` | Nao identificado estaticamente | Nao detectadas (consulta por modelo ou indireta) |
| `Pagamentos/ImprimirLote` | `resources/js/Pages/Pagamentos/ImprimirLote.jsx` | `imprimirLote` | `pagamentos/imprimir-lote` (pagamentos.imprimir-lote) | `Pagamento` | Nao identificado estaticamente | Nao detectadas (consulta por modelo ou indireta) |
| `Pagamentos/Index` | `resources/js/Pages/Pagamentos/Index.jsx` | `index` | `pagamentos` (pagamentos.index) | `Cliente`, `Credito`, `Factura`, `Pagamento` | `BuscaDifusa`, `ListaQuery`, `MesReferencia`, `ResumoMensal` | Nao detectadas (consulta por modelo ou indireta) |
| `Pagamentos/ReciboLote` | `resources/js/Pages/Pagamentos/ReciboLote.jsx` | `reciboLote` | `pagamentos/lote/{lote}/recibo` (pagamentos.recibo-lote) | `Pagamento` | Nao identificado estaticamente | Nao detectadas (consulta por modelo ou indireta) |
| `Producao/Index` | `resources/js/Pages/Producao/Index.jsx` | `index` | `producao` (producao.index) | `ProducaoAgua`, `Zona` | `AnaliseOperacional`, `MesReferencia` | Nao detectadas (consulta por modelo ou indireta) |
| `Profile/Edit` | `resources/js/Pages/Profile/Edit.jsx` | `edit` | `profile` (profile.edit) | Nao identificado estaticamente | Nao identificado estaticamente | Nao detectadas (consulta por modelo ou indireta) |
| `Tarifas/Index` | `resources/js/Pages/Tarifas/Index.jsx` | `index` | `tarifas` (tarifas.index) | `Configuracao`, `Tarifa` | Nao identificado estaticamente | Nao detectadas (consulta por modelo ou indireta) |
| `Tecnico/Dashboard` | `resources/js/Pages/Tecnico/Dashboard.jsx` | `index` | `tecnico/dashboard` (tecnico.dashboard) | `Cliente`, `Leitura` | `MesReferencia` | Nao detectadas (consulta por modelo ou indireta) |
| `Users/Index` | `resources/js/Pages/Users/Index.jsx` | `index` | `dev/users` (dev.users.index) | `User` | `BuscaDifusa` | Nao detectadas (consulta por modelo ou indireta) |
| `Users/Lixeira` | `resources/js/Pages/Users/Lixeira.jsx` | `lixeira` | `dev/users/lixeira` (dev.users.lixeira) | `User` | `BuscaDifusa`, `ListaQuery` | Nao detectadas (consulta por modelo ou indireta) |
| `Verificacao/Factura` | `resources/js/Pages/Verificacao/Factura.jsx` | `factura` | `verificar/factura/{factura}` (verificacao.factura) | `Factura` | Nao identificado estaticamente | Nao detectadas (consulta por modelo ou indireta) |
| `Verificacao/Pagamento` | `resources/js/Pages/Verificacao/Pagamento.jsx` | `pagamento` | `verificar/pagamento/{pagamento}` (verificacao.pagamento) | `Pagamento` | Nao identificado estaticamente | Nao detectadas (consulta por modelo ou indireta) |
| `Zonas/Index` | `resources/js/Pages/Zonas/Index.jsx` | `index` | `zonas` (zonas.index) | `Cliente`, `Zona` | Nao identificado estaticamente | Nao detectadas (consulta por modelo ou indireta) |

## Reconciliacao

- Ficheiros JSX e chamadas de `Inertia::render` estao contabilizados no inventario base; middleware/closures e redirects nao correspondem sempre a um metodo controller.
- Uma pagina pode ter varias entradas GET e um metodo pode renderizar paginas sob condicoes diferentes. Consultar tambem INVENTARIO_ROTAS.md e MATRIZ_ROLE_PAGINA.md.
- Props calculadas por spreads, resources, closures e helpers podem nao surgir na lista literal; rever o metodo e os servicos transitivos antes de usar este indice como contrato de API.
