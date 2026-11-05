# Matriz role x pagina x permissao

Gerada a partir de `php artisan route:list --json` e das chamadas literais a `Inertia::render`. Uma pagina aparece mais de uma vez quando ha mais de uma entrada GET ou conjunto de permissoes. `auth`/`verified` sao condicoes adicionais; verificacoes inline das actions estao indexadas em [INVENTARIO_ACOES.md](INVENTARIO_ACOES.md). Confirmar autorizacao por registo continua a exigir leitura de services/transicoes e teste de endpoint.

| Pagina | Entrada GET | Role autorizado na rota | Middleware/condicao |
|---|---|---|---|
| `AcessoBloqueado` | Render condicional de middleware/excecao (ver linhas abaixo) | Todos os 5 roles autenticados | `VerificarFuncionalidadeActiva`, `VerificarHorarioFuncionamento` ou resposta de autorizacao 403 |
| `Admin/Dashboard` | `GET / HEAD admin/dashboard` (admin.dashboard) | administrador | `web; auth; verified; role:administrador` |
| `Admin/Kpis` | `GET / HEAD admin/kpis` (admin.kpis) | administrador, gestor | `web; auth; verified; role:administrador / gestor` |
| `Admin/Logs` | `GET / HEAD dev/actividade` (dev.logs.actividade) | desenvolvedor | `web; auth; verified; role:desenvolvedor; throttle:120,1; dev.auditar` |
| `Auth/ConfirmPassword` | `GET / HEAD confirm-password` (password.confirm) | administrador, caixa, desenvolvedor, gestor, tecnico | `web; auth` |
| `Auth/ForgotPassword` | `GET / HEAD forgot-password` (password.request) | publico | `web; sair.paginas.publicas; guest` |
| `Auth/Login` | `GET / HEAD login` (login) | publico | `web; sair.paginas.publicas; guest` |
| `Auth/ResetPassword` | `GET / HEAD reset-password/{token}` (password.reset) | publico | `web; sair.paginas.publicas; guest` |
| `Auth/VerifyEmail` | `GET / HEAD verify-email` (verification.notice) | administrador, caixa, desenvolvedor, gestor, tecnico | `web; auth` |
| `Auth/VerifyResetCode` | `GET / HEAD forgot-password/code` (password.code) | publico | `web; sair.paginas.publicas; guest` |
| `Caixa/Dashboard` | `GET / HEAD caixa/dashboard` (caixa.dashboard) | caixa | `web; auth; verified; role:caixa` |
| `Clientes/Imprimir` | `GET / HEAD clientes/{cliente}/imprimir` (clientes.imprimir) | administrador, gestor | `web; auth; verified; role:administrador / gestor` |
| `Clientes/Index` | `GET / HEAD clientes` (clientes.index) | administrador, gestor | `web; auth; verified; role:administrador / gestor` |
| `Clientes/Show` | `GET / HEAD clientes/{cliente}` (clientes.show) | administrador, gestor | `web; auth; verified; role:administrador / gestor` |
| `Cobranca/Index` | `GET / HEAD cobranca` (cobranca.index) | administrador, gestor | `web; auth; verified; role:administrador / gestor` |
| `Creditos/Recibo` | `GET / HEAD creditos/{credito}/recibo` (creditos.recibo) | administrador, caixa, gestor | `web; auth; verified; role:administrador / gestor / caixa` |
| `Dev/Analise` | `GET / HEAD dev/analise` (dev.analise) | desenvolvedor | `web; auth; verified; role:desenvolvedor; throttle:120,1; dev.auditar` |
| `Dev/Auditoria` | `GET / HEAD dev/auditoria` (dev.auditoria) | desenvolvedor | `web; auth; verified; role:desenvolvedor; throttle:120,1; dev.auditar` |
| `Dev/Configuracoes` | `GET / HEAD dev/configuracoes` (dev.configuracoes.index) | desenvolvedor | `web; auth; verified; role:desenvolvedor; throttle:120,1; dev.auditar` |
| `Dev/Dados` | `GET / HEAD dev/dados` (dev.dados.index) | desenvolvedor | `web; auth; verified; role:desenvolvedor; throttle:120,1; dev.auditar` |
| `Dev/DadosRegisto` | `GET / HEAD dev/dados/{tabela}/registo/{id}` (dev.dados.registo) | desenvolvedor | `web; auth; verified; role:desenvolvedor; throttle:120,1; dev.auditar` |
| `Dev/DadosTabela` | `GET / HEAD dev/dados/{tabela}` (dev.dados.tabela) | desenvolvedor | `web; auth; verified; role:desenvolvedor; throttle:120,1; dev.auditar` |
| `Dev/EmailConfig` | `GET / HEAD dev/email` (dev.email) | desenvolvedor | `web; auth; verified; role:desenvolvedor; throttle:120,1; dev.auditar` |
| `Dev/Emails` | `GET / HEAD dev/emails` (dev.emails) | desenvolvedor | `web; auth; verified; role:desenvolvedor; throttle:120,1; dev.auditar` |
| `Dev/Filas` | `GET / HEAD dev/filas` (dev.filas) | desenvolvedor | `web; auth; verified; role:desenvolvedor; throttle:120,1; dev.auditar` |
| `Dev/Integridade` | `GET / HEAD dev/integridade` (dev.integridade) | desenvolvedor | `web; auth; verified; role:desenvolvedor; throttle:120,1; dev.auditar` |
| `Dev/IntegridadeDetalhe` | `GET / HEAD dev/integridade/{chave}` (dev.integridade.detalhe) | desenvolvedor | `web; auth; verified; role:desenvolvedor; throttle:120,1; dev.auditar` |
| `Dev/Logs` | `GET / HEAD dev/logs/acessos` (dev.logs.acessos) | desenvolvedor | `web; auth; verified; role:desenvolvedor; throttle:120,1; dev.auditar` |
| `Dev/Logs` | `GET / HEAD dev/logs/erros` (dev.logs.erros) | desenvolvedor | `web; auth; verified; role:desenvolvedor; throttle:120,1; dev.auditar` |
| `Dev/LogsAplicacao` | `GET / HEAD dev/logs/aplicacao` (dev.logs.aplicacao) | desenvolvedor | `web; auth; verified; role:desenvolvedor; throttle:120,1; dev.auditar` |
| `Dev/Operacoes` | `GET / HEAD dev/operacoes` (dev.operacoes) | desenvolvedor | `web; auth; verified; role:desenvolvedor; throttle:120,1; dev.auditar` |
| `Dev/Painel` | `GET / HEAD dev/painel` (dev.painel) | desenvolvedor | `web; auth; verified; role:desenvolvedor; throttle:120,1; dev.auditar` |
| `Dev/Saude` | `GET / HEAD dev/saude` (dev.saude) | desenvolvedor | `web; auth; verified; role:desenvolvedor; throttle:120,1; dev.auditar` |
| `Emails/Index` | `GET / HEAD emails` (emails.index) | administrador, gestor | `web; auth; verified; role:administrador / gestor` |
| `Facturas/Imprimir` | `GET / HEAD facturas/{factura}/imprimir` (facturas.imprimir) | administrador, gestor | `web; auth; verified; role:administrador / gestor` |
| `Facturas/ImprimirLote` | `GET / HEAD facturas/imprimir-lote` (facturas.imprimir-lote) | administrador, gestor | `web; auth; verified; role:administrador / gestor` |
| `Facturas/Index` | `GET / HEAD facturas` (facturas.index) | administrador, gestor | `web; auth; verified; role:administrador / gestor` |
| `Gestor/Dashboard` | `GET / HEAD gestor/dashboard` (gestor.dashboard) | gestor | `web; auth; verified; role:gestor` |
| `Leituras/Estimadas` | `GET / HEAD leituras-estimadas` (leituras-estimadas.index) | administrador, gestor, tecnico | `web; auth; verified; role:administrador / gestor / tecnico` |
| `Leituras/Index` | `GET / HEAD leituras` (leituras.index) | administrador, gestor, tecnico | `web; auth; verified; role:administrador / gestor / tecnico` |
| `LerQr` | `GET / HEAD ler-qr` (qr.ler) | administrador, caixa, gestor | `web; auth; verified; role:administrador / gestor / caixa` |
| `Lixeira/Index` | `GET / HEAD lixeira` (lixeira.index) | administrador | `web; auth; verified; role:administrador` |
| `NotificacoesSistema/Index` | `GET / HEAD notificacoes-sistema` (notificacoes-sistema.index) | administrador, gestor | `web; auth; verified; role:administrador / gestor` |
| `Ocorrencias/Index` | `GET / HEAD ocorrencias` (ocorrencias.index) | administrador, gestor, tecnico | `web; auth; verified; role:administrador / gestor / tecnico` |
| `Pagamentos/FechoCaixa` | `GET / HEAD pagamentos/fecho-caixa` (pagamentos.fecho-caixa) | administrador, caixa, gestor | `web; auth; verified; role:administrador / gestor / caixa` |
| `Pagamentos/Imprimir` | `GET / HEAD pagamentos/{pagamento}/imprimir` (pagamentos.imprimir) | administrador, caixa, gestor | `web; auth; verified; role:administrador / gestor / caixa` |
| `Pagamentos/ImprimirLote` | `GET / HEAD pagamentos/imprimir-lote` (pagamentos.imprimir-lote) | administrador, caixa, gestor | `web; auth; verified; role:administrador / gestor / caixa` |
| `Pagamentos/Index` | `GET / HEAD pagamentos` (pagamentos.index) | administrador, caixa, gestor | `web; auth; verified; role:administrador / gestor / caixa` |
| `Pagamentos/ReciboLote` | `GET / HEAD pagamentos/lote/{lote}/recibo` (pagamentos.recibo-lote) | administrador, caixa, gestor | `web; auth; verified; role:administrador / gestor / caixa` |
| `Producao/Index` | `GET / HEAD producao` (producao.index) | administrador, gestor, tecnico | `web; auth; verified; role:administrador / gestor / tecnico` |
| `Profile/Edit` | `GET / HEAD profile` (profile.edit) | administrador, caixa, desenvolvedor, gestor, tecnico | `web; auth; verified` |
| `Tarifas/Index` | `GET / HEAD tarifas` (tarifas.index) | administrador | `web; auth; verified; role:administrador` |
| `Tecnico/Dashboard` | `GET / HEAD tecnico/dashboard` (tecnico.dashboard) | tecnico | `web; auth; verified; role:tecnico` |
| `Users/Index` | `GET / HEAD dev/users` (dev.users.index) | desenvolvedor | `web; auth; verified; role:desenvolvedor; throttle:120,1; dev.auditar` |
| `Users/Lixeira` | `GET / HEAD dev/users/lixeira` (dev.users.lixeira) | desenvolvedor | `web; auth; verified; role:desenvolvedor; throttle:120,1; dev.auditar` |
| `Verificacao/Factura` | `GET / HEAD verificar/factura/{factura}` (verificacao.factura) | publico | `web; signed` |
| `Verificacao/Pagamento` | `GET / HEAD verificar/pagamento/{pagamento}` (verificacao.pagamento) | publico | `web; signed` |
| `Zonas/Index` | `GET / HEAD zonas` (zonas.index) | administrador | `web; auth; verified; role:administrador` |
| `Dashboard (redirect por role)` | `GET / HEAD dashboard` | administrador, caixa, desenvolvedor, gestor, tecnico | `web; auth; verified; redirect.by.role` |
| `AcessoBloqueado` | `GET ou resposta 403 render de middleware/excepcao` | administrador | render condicional de middleware/excepcao |
| `AcessoBloqueado` | `GET ou resposta 403 render de middleware/excepcao` | gestor | render condicional de middleware/excepcao |
| `AcessoBloqueado` | `GET ou resposta 403 render de middleware/excepcao` | caixa | render condicional de middleware/excepcao |
| `AcessoBloqueado` | `GET ou resposta 403 render de middleware/excepcao` | tecnico | render condicional de middleware/excepcao |
| `AcessoBloqueado` | `GET ou resposta 403 render de middleware/excepcao` | desenvolvedor | render condicional de middleware/excepcao |
