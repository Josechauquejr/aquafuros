# Inventario de rotas (snapshot)

Gerado em 25/10/2026 com `php artisan route:list --json`. Uma rota pode aceitar varios verbos HTTP. Middleware e nomes parametrizados sao copiados do Laravel. Rotas de recursos agrupam permissoes por middleware; regras adicionais dentro dos controllers continuam a exigir leitura individual. O inventario complementar de 99 endpoints de escrita distingue redirects multi-verbo que nao mutam.

Total registado: 175 rotas; 62 paginas JSX; 29 modelos Eloquent; 55 ficheiros de migration.

| Metodo | URI | Nome | Middleware | Accao |
|---|---|---|---|---|
| GET / HEAD | `/` | `—` | `sair.paginas.publicas` | `Closure` |
| PUT | `acertos-leitura/{acerto}/aprovar` | `acertos-leitura.aprovar` | `auth, verified, role:administrador / gestor` | `App\Http\Controllers\LeituraEstimadaController@aprovarAcerto` |
| GET / HEAD | `admin/dashboard` | `admin.dashboard` | `auth, verified, role:administrador` | `App\Http\Controllers\Admin\DashboardController@index` |
| GET / HEAD | `admin/kpis` | `admin.kpis` | `auth, verified, role:administrador / gestor` | `App\Http\Controllers\Admin\DashboardController@kpis` |
| GET / HEAD | `admin/kpis/exportar` | `admin.kpis.exportar` | `auth, verified, role:administrador / gestor` | `App\Http\Controllers\Admin\DashboardController@exportarKpis` |
| POST | `ajustes-leitura/{ajuste}/reverter` | `ajustes-leitura.reverter` | `auth, verified, role:administrador` | `App\Http\Controllers\AjusteLeituraController@reverter` |
| GET / HEAD | `caixa/dashboard` | `caixa.dashboard` | `auth, verified, role:caixa` | `App\Http\Controllers\CaixaDashboardController@index` |
| GET / HEAD | `clientes` | `clientes.index` | `auth, verified, role:administrador / gestor` | `App\Http\Controllers\ClienteController@index` |
| POST | `clientes` | `clientes.store` | `auth, verified, role:administrador / gestor` | `App\Http\Controllers\ClienteController@store` |
| POST | `clientes/historico/{activity}/reverter` | `clientes.historico.reverter` | `auth, verified, role:administrador / gestor` | `App\Http\Controllers\ClienteController@reverter` |
| DELETE | `clientes/lixeira/{id}` | `clientes.lixeira.destruir` | `auth, verified, role:administrador` | `App\Http\Controllers\Admin\LixeiraController@destroyDefinitivo` |
| POST | `clientes/lixeira/{id}/restaurar` | `clientes.lixeira.restaurar` | `auth, verified, role:administrador` | `App\Http\Controllers\Admin\LixeiraController@restaurar` |
| POST | `clientes/zonas` | `clientes.zonas.store` | `auth, verified, role:administrador / gestor` | `App\Http\Controllers\ZonaController@store` |
| GET / HEAD | `clientes/{cliente}` | `clientes.show` | `auth, verified, role:administrador / gestor` | `App\Http\Controllers\ClienteController@show` |
| PUT / PATCH | `clientes/{cliente}` | `clientes.update` | `auth, verified, role:administrador / gestor` | `App\Http\Controllers\ClienteController@update` |
| DELETE | `clientes/{cliente}` | `clientes.destroy` | `auth, verified, role:administrador / gestor` | `App\Http\Controllers\ClienteController@destroy` |
| GET / HEAD | `clientes/{cliente}/imprimir` | `clientes.imprimir` | `auth, verified, role:administrador / gestor` | `App\Http\Controllers\ClienteController@imprimir` |
| PUT | `clientes/{cliente}/leitura-inicial` | `clientes.leitura-inicial.update` | `auth, verified, role:administrador / gestor` | `App\Http\Controllers\ClienteController@actualizarLeituraInicial` |
| POST | `clientes/{cliente}/previsualizar-leitura-inicial` | `clientes.leitura-inicial.preview` | `auth, verified, role:administrador / gestor` | `App\Http\Controllers\ClienteController@previsualizarLeituraInicial` |
| GET / HEAD | `cobranca` | `cobranca.index` | `auth, verified, role:administrador / gestor` | `App\Http\Controllers\CobrancaController@index` |
| POST | `cobranca/contactos` | `cobranca.contactos.store` | `auth, verified, role:administrador / gestor` | `App\Http\Controllers\CobrancaController@storeContacto` |
| PUT | `cobranca/promessas/{promessa}/cancelar` | `cobranca.promessas.cancelar` | `auth, verified, role:administrador / gestor` | `App\Http\Controllers\CobrancaController@cancelarPromessa` |
| GET / HEAD | `confirm-password` | `password.confirm` | `auth` | `App\Http\Controllers\Auth\ConfirmablePasswordController@show` |
| POST | `confirm-password` | `—` | `auth` | `App\Http\Controllers\Auth\ConfirmablePasswordController@store` |
| POST | `creditos` | `creditos.store` | `auth, verified, role:administrador / gestor / caixa` | `App\Http\Controllers\CreditoController@store` |
| GET / HEAD | `creditos/{credito}/recibo` | `creditos.recibo` | `auth, verified, role:administrador / gestor / caixa` | `App\Http\Controllers\CreditoController@recibo` |
| GET / HEAD | `dashboard` | `dashboard` | `auth, verified, redirect.by.role` | `Closure` |
| GET / HEAD | `dev/actividade` | `dev.logs.actividade` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar` | `App\Http\Controllers\Admin\LogController@index` |
| DELETE | `dev/actividade` | `dev.logs.actividade.limpar` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar, password.confirm:password.confirm,900` | `App\Http\Controllers\Admin\LogController@limpar` |
| GET / HEAD | `dev/analise` | `dev.analise` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar` | `App\Http\Controllers\Dev\IntegridadeController@analise` |
| GET / HEAD | `dev/auditoria` | `dev.auditoria` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar` | `App\Http\Controllers\Dev\AuditoriaController@index` |
| GET / HEAD | `dev/configuracoes` | `dev.configuracoes.index` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar` | `App\Http\Controllers\Dev\ConfiguracaoController@index` |
| POST | `dev/configuracoes/empresa` | `dev.configuracoes.empresa` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar, password.confirm:password.confirm,900` | `App\Http\Controllers\Dev\ConfiguracaoController@actualizarEmpresa` |
| PUT | `dev/configuracoes/funcionalidades/{funcionalidade}` | `dev.configuracoes.funcionalidade` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar, password.confirm:password.confirm,900` | `App\Http\Controllers\Dev\ConfiguracaoController@actualizarFuncionalidade` |
| PUT | `dev/configuracoes/horario` | `dev.configuracoes.horario` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar, password.confirm:password.confirm,900` | `App\Http\Controllers\Dev\ConfiguracaoController@actualizarHorario` |
| GET / HEAD | `dev/dados` | `dev.dados.index` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar` | `App\Http\Controllers\Dev\DadosController@index` |
| GET / HEAD | `dev/dados/{tabela}` | `dev.dados.tabela` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar` | `App\Http\Controllers\Dev\DadosController@tabela` |
| GET / HEAD | `dev/dados/{tabela}/exportar` | `dev.dados.exportar` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar, password.confirm:password.confirm,900, throttle:6,1` | `App\Http\Controllers\Dev\DadosController@exportar` |
| GET / HEAD | `dev/dados/{tabela}/registo/{id}` | `dev.dados.registo` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar` | `App\Http\Controllers\Dev\DadosController@registo` |
| GET / HEAD | `dev/email` | `dev.email` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar` | `App\Http\Controllers\Dev\EmailConfigController@index` |
| PUT | `dev/email/automatico` | `dev.email.automatico` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar, password.confirm:password.confirm,900` | `App\Http\Controllers\Dev\EmailConfigController@automatico` |
| GET / HEAD | `dev/email/google` | `dev.email.ligar` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar` | `App\Http\Controllers\Dev\EmailConfigController@ligar` |
| DELETE | `dev/email/google` | `dev.email.desligar` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar, password.confirm:password.confirm,900` | `App\Http\Controllers\Dev\EmailConfigController@desligar` |
| GET / HEAD | `dev/email/google/callback` | `dev.email.callback` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar` | `App\Http\Controllers\Dev\EmailConfigController@callback` |
| POST | `dev/email/teste` | `dev.email.testar` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar, password.confirm:password.confirm,900` | `App\Http\Controllers\Dev\EmailConfigController@testar` |
| GET / HEAD | `dev/emails` | `dev.emails` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar` | `App\Http\Controllers\Dev\EmailsController@index` |
| GET / HEAD | `dev/emails/{envio}/ver` | `dev.emails.ver` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar` | `App\Http\Controllers\Dev\EmailsController@ver` |
| GET / HEAD | `dev/filas` | `dev.filas` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar` | `App\Http\Controllers\Dev\FilasController@index` |
| DELETE | `dev/filas/falhados` | `dev.filas.limpar-falhados` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar, password.confirm:password.confirm,900` | `App\Http\Controllers\Dev\FilasController@limparFalhados` |
| POST | `dev/filas/falhados/repetir-todos` | `dev.filas.repetir-todos` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar, password.confirm:password.confirm,900` | `App\Http\Controllers\Dev\FilasController@repetirTodos` |
| DELETE | `dev/filas/falhados/{uuid}` | `dev.filas.esquecer` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar, password.confirm:password.confirm,900` | `App\Http\Controllers\Dev\FilasController@esquecer` |
| POST | `dev/filas/falhados/{uuid}/repetir` | `dev.filas.repetir` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar, password.confirm:password.confirm,900` | `App\Http\Controllers\Dev\FilasController@repetir` |
| DELETE | `dev/filas/pendentes` | `dev.filas.limpar-pendentes` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar, password.confirm:password.confirm,900` | `App\Http\Controllers\Dev\FilasController@limparPendentes` |
| DELETE | `dev/filas/pendentes/{id}` | `dev.filas.apagar-pendente` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar, password.confirm:password.confirm,900` | `App\Http\Controllers\Dev\FilasController@apagarPendente` |
| GET / HEAD | `dev/integridade` | `dev.integridade` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar` | `App\Http\Controllers\Dev\IntegridadeController@index` |
| GET / HEAD | `dev/integridade/{chave}` | `dev.integridade.detalhe` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar` | `App\Http\Controllers\Dev\IntegridadeController@detalhe` |
| GET / HEAD | `dev/logs/acessos` | `dev.logs.acessos` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar` | `App\Http\Controllers\Dev\LogController@acessos` |
| GET / HEAD | `dev/logs/aplicacao` | `dev.logs.aplicacao` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar` | `App\Http\Controllers\Dev\LogAplicacaoController@index` |
| GET / HEAD | `dev/logs/erros` | `dev.logs.erros` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar` | `App\Http\Controllers\Dev\LogController@erros` |
| PUT | `dev/logs/erros/{erro}/resolver` | `dev.logs.erros.resolver` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar` | `App\Http\Controllers\Dev\LogController@marcarResolvido` |
| GET / HEAD | `dev/operacoes` | `dev.operacoes` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar` | `App\Http\Controllers\Dev\OperacoesController@index` |
| POST | `dev/operacoes/cache` | `dev.operacoes.cache` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar, password.confirm:password.confirm,900` | `App\Http\Controllers\Dev\OperacoesController@limparCache` |
| POST | `dev/operacoes/manutencao` | `dev.operacoes.manutencao.ligar` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar, password.confirm:password.confirm,900` | `App\Http\Controllers\Dev\OperacoesController@ligarManutencao` |
| DELETE | `dev/operacoes/manutencao` | `dev.operacoes.manutencao.desligar` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar, password.confirm:password.confirm,900` | `App\Http\Controllers\Dev\OperacoesController@desligarManutencao` |
| POST | `dev/operacoes/tarefa` | `dev.operacoes.tarefa` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar, password.confirm:password.confirm,900` | `App\Http\Controllers\Dev\OperacoesController@executarTarefa` |
| GET / HEAD | `dev/painel` | `dev.painel` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar` | `App\Http\Controllers\Dev\PainelController@index` |
| GET / HEAD | `dev/saude` | `dev.saude` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar` | `App\Http\Controllers\Dev\SaudeController@index` |
| GET / HEAD | `dev/users` | `dev.users.index` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar` | `App\Http\Controllers\UserController@index` |
| POST | `dev/users` | `dev.users.store` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar, password.confirm:password.confirm,900` | `App\Http\Controllers\UserController@store` |
| GET / HEAD | `dev/users/lixeira` | `dev.users.lixeira` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar` | `App\Http\Controllers\UserController@lixeira` |
| DELETE | `dev/users/lixeira/{id}` | `dev.users.lixeira.destruir` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar, password.confirm:password.confirm,900` | `App\Http\Controllers\UserController@destroyDefinitivo` |
| POST | `dev/users/lixeira/{id}/restaurar` | `dev.users.lixeira.restaurar` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar, password.confirm:password.confirm,900` | `App\Http\Controllers\UserController@restaurar` |
| PUT / PATCH | `dev/users/{user}` | `dev.users.update` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar, password.confirm:password.confirm,900` | `App\Http\Controllers\UserController@update` |
| DELETE | `dev/users/{user}` | `dev.users.destroy` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar, password.confirm:password.confirm,900` | `App\Http\Controllers\UserController@destroy` |
| POST | `dev/users/{user}/reset-password` | `dev.users.reset-password` | `auth, verified, role:desenvolvedor, throttle:120,1, dev.auditar, password.confirm:password.confirm,900` | `App\Http\Controllers\UserController@resetPassword` |
| POST | `email/verification-notification` | `verification.send` | `auth, throttle:6,1` | `App\Http\Controllers\Auth\EmailVerificationNotificationController@store` |
| GET / HEAD | `emails` | `emails.index` | `auth, verified, role:administrador / gestor` | `App\Http\Controllers\EmailEnviadoController@index` |
| GET / HEAD | `emails/{envio}/ver` | `emails.ver` | `auth, verified, role:administrador / gestor` | `App\Http\Controllers\EmailEnviadoController@ver` |
| GET / HEAD | `facturas` | `facturas.index` | `auth, verified, role:administrador / gestor` | `App\Http\Controllers\FacturaController@index` |
| POST | `facturas` | `facturas.store` | `auth, verified, role:administrador / gestor` | `App\Http\Controllers\FacturaController@store` |
| POST | `facturas/emitir-lote` | `facturas.emitir-lote` | `auth, verified, role:administrador / gestor` | `App\Http\Controllers\FacturaController@emitirLote` |
| GET / HEAD | `facturas/imprimir-lote` | `facturas.imprimir-lote` | `auth, verified, role:administrador / gestor` | `App\Http\Controllers\FacturaController@imprimirLote` |
| PUT / PATCH | `facturas/{factura}` | `facturas.update` | `auth, verified, role:administrador / gestor` | `App\Http\Controllers\FacturaController@update` |
| DELETE | `facturas/{factura}` | `facturas.destroy` | `auth, verified, role:administrador / gestor` | `App\Http\Controllers\FacturaController@destroy` |
| GET / HEAD | `facturas/{factura}/imprimir` | `facturas.imprimir` | `auth, verified, role:administrador / gestor` | `App\Http\Controllers\FacturaController@imprimir` |
| GET / HEAD | `facturas/{factura}/pdf` | `facturas.pdf` | `auth, verified, role:administrador / gestor` | `App\Http\Controllers\FacturaController@pdf` |
| GET / HEAD | `forgot-password` | `password.request` | `sair.paginas.publicas, guest` | `App\Http\Controllers\Auth\PasswordResetLinkController@create` |
| POST | `forgot-password` | `password.email` | `sair.paginas.publicas, guest, throttle:5,1` | `App\Http\Controllers\Auth\PasswordResetLinkController@store` |
| GET / HEAD | `forgot-password/code` | `password.code` | `sair.paginas.publicas, guest` | `App\Http\Controllers\Auth\PasswordResetLinkController@code` |
| POST | `forgot-password/code` | `password.verify-code` | `sair.paginas.publicas, guest, throttle:10,1` | `App\Http\Controllers\Auth\PasswordResetLinkController@verifyCode` |
| GET / HEAD | `gestor/dashboard` | `gestor.dashboard` | `auth, verified, role:gestor` | `App\Http\Controllers\GestorDashboardController@index` |
| GET / HEAD | `leituras` | `leituras.index` | `auth, verified, role:administrador / gestor / tecnico` | `App\Http\Controllers\LeituraController@index` |
| POST | `leituras` | `leituras.store` | `auth, verified, role:administrador / gestor / tecnico` | `App\Http\Controllers\LeituraController@store` |
| GET / HEAD | `leituras-estimadas` | `leituras-estimadas.index` | `auth, verified, role:administrador / gestor / tecnico` | `App\Http\Controllers\LeituraEstimadaController@index` |
| POST | `leituras-estimadas` | `leituras-estimadas.store` | `auth, verified, role:administrador / gestor / tecnico` | `App\Http\Controllers\LeituraEstimadaController@store` |
| POST | `leituras-estimadas/prever` | `leituras-estimadas.prever` | `auth, verified, role:administrador / gestor / tecnico` | `App\Http\Controllers\LeituraEstimadaController@prever` |
| DELETE | `leituras-estimadas/{estimativa}` | `leituras-estimadas.cancelar` | `auth, verified, role:administrador / gestor` | `App\Http\Controllers\LeituraEstimadaController@cancelar` |
| PUT | `leituras-estimadas/{estimativa}/confirmar` | `leituras-estimadas.confirmar` | `auth, verified, role:administrador / gestor` | `App\Http\Controllers\LeituraEstimadaController@confirmar` |
| POST | `leituras-estimadas/{estimativa}/facturar` | `leituras-estimadas.facturar` | `auth, verified, role:administrador / gestor` | `App\Http\Controllers\LeituraEstimadaController@emitir` |
| PUT | `leituras/confirmar-todas` | `leituras.confirmar-todas` | `auth, verified, role:administrador / gestor / tecnico` | `App\Http\Controllers\LeituraController@confirmarTodas` |
| POST | `leituras/correccoes/{correccao}/desfazer` | `leituras.correccoes.desfazer` | `auth, verified, role:administrador` | `App\Http\Controllers\LeituraController@desfazerCorreccao` |
| DELETE | `leituras/lixeira/{id}` | `leituras.lixeira.destruir` | `auth, verified, role:administrador` | `App\Http\Controllers\Admin\LixeiraController@destroyLeituraDefinitivo` |
| POST | `leituras/lixeira/{id}/restaurar` | `leituras.lixeira.restaurar` | `auth, verified, role:administrador` | `App\Http\Controllers\Admin\LixeiraController@restaurarLeitura` |
| POST | `leituras/previsualizar` | `leituras.preview` | `auth, verified, role:administrador / gestor / tecnico` | `App\Http\Controllers\LeituraController@previsualizar` |
| PUT / PATCH | `leituras/{leitura}` | `leituras.update` | `auth, verified, role:administrador / gestor / tecnico` | `App\Http\Controllers\LeituraController@update` |
| DELETE | `leituras/{leitura}` | `leituras.destroy` | `auth, verified, role:administrador / gestor / tecnico` | `App\Http\Controllers\LeituraController@destroy` |
| PUT | `leituras/{leitura}/corrigir` | `leituras.corrigir` | `auth, verified, role:administrador` | `App\Http\Controllers\LeituraController@corrigir` |
| POST | `leituras/{leitura}/previsualizar` | `leituras.update.preview` | `auth, verified, role:administrador / gestor / tecnico` | `App\Http\Controllers\LeituraController@previsualizarActualizacao` |
| GET / HEAD | `ler-qr` | `qr.ler` | `auth, verified, role:administrador / gestor / caixa` | `Closure` |
| GET / HEAD | `lixeira` | `lixeira.index` | `auth, verified, role:administrador` | `App\Http\Controllers\Admin\LixeiraController@index` |
| GET / HEAD | `login` | `login` | `sair.paginas.publicas, guest` | `App\Http\Controllers\Auth\AuthenticatedSessionController@create` |
| POST | `login` | `—` | `sair.paginas.publicas, guest` | `App\Http\Controllers\Auth\AuthenticatedSessionController@store` |
| POST | `logout` | `logout` | `auth` | `App\Http\Controllers\Auth\AuthenticatedSessionController@destroy` |
| GET / HEAD | `notificacoes-sistema` | `notificacoes-sistema.index` | `auth, verified, role:administrador / gestor` | `App\Http\Controllers\NotificacaoSistemaController@index` |
| POST | `novidades/vista` | `novidades.vista` | `auth, verified` | `App\Http\Controllers\NovidadeController@vista` |
| GET / HEAD | `ocorrencias` | `ocorrencias.index` | `auth, verified, role:administrador / gestor / tecnico` | `App\Http\Controllers\OcorrenciaController@index` |
| POST | `ocorrencias` | `ocorrencias.store` | `auth, verified, role:administrador / gestor / tecnico` | `App\Http\Controllers\OcorrenciaController@store` |
| PUT / PATCH | `ocorrencias/{ocorrencia}` | `ocorrencias.update` | `auth, verified, role:administrador / gestor / tecnico` | `App\Http\Controllers\OcorrenciaController@update` |
| DELETE | `ocorrencias/{ocorrencia}` | `ocorrencias.destroy` | `auth, verified, role:administrador / gestor / tecnico` | `App\Http\Controllers\OcorrenciaController@destroy` |
| GET / HEAD | `pagamentos` | `pagamentos.index` | `auth, verified, role:administrador / gestor / caixa` | `App\Http\Controllers\PagamentoController@index` |
| POST | `pagamentos` | `pagamentos.store` | `auth, verified, role:administrador / gestor / caixa` | `App\Http\Controllers\PagamentoController@store` |
| GET / HEAD | `pagamentos/fecho-caixa` | `pagamentos.fecho-caixa` | `auth, verified, role:administrador / gestor / caixa` | `App\Http\Controllers\PagamentoController@fechoCaixa` |
| POST | `pagamentos/fecho-caixa/confirmar` | `pagamentos.fecho-caixa.confirmar` | `auth, verified, role:administrador / gestor / caixa` | `App\Http\Controllers\PagamentoController@confirmarFecho` |
| GET / HEAD | `pagamentos/imprimir-lote` | `pagamentos.imprimir-lote` | `auth, verified, role:administrador / gestor / caixa` | `App\Http\Controllers\PagamentoController@imprimirLote` |
| DELETE | `pagamentos/lixeira/{id}` | `pagamentos.lixeira.destruir` | `auth, verified, role:administrador` | `App\Http\Controllers\Admin\LixeiraController@destroyPagamentoDefinitivo` |
| POST | `pagamentos/lixeira/{id}/restaurar` | `pagamentos.lixeira.restaurar` | `auth, verified, role:administrador` | `App\Http\Controllers\Admin\LixeiraController@restaurarPagamento` |
| DELETE | `pagamentos/lote/{lote}` | `pagamentos.lote.destruir` | `auth, verified, role:administrador / gestor / caixa` | `App\Http\Controllers\PagamentoController@destroyLote` |
| GET / HEAD | `pagamentos/lote/{lote}/recibo` | `pagamentos.recibo-lote` | `auth, verified, role:administrador / gestor / caixa` | `App\Http\Controllers\PagamentoController@reciboLote` |
| POST | `pagamentos/multiplo` | `pagamentos.multiplo` | `auth, verified, role:administrador / gestor / caixa` | `App\Http\Controllers\PagamentoController@storeMultiplo` |
| PUT / PATCH | `pagamentos/{pagamento}` | `pagamentos.update` | `auth, verified, role:administrador / gestor / caixa` | `App\Http\Controllers\PagamentoController@update` |
| DELETE | `pagamentos/{pagamento}` | `pagamentos.destroy` | `auth, verified, role:administrador / gestor / caixa` | `App\Http\Controllers\PagamentoController@destroy` |
| GET / HEAD | `pagamentos/{pagamento}/imprimir` | `pagamentos.imprimir` | `auth, verified, role:administrador / gestor / caixa` | `App\Http\Controllers\PagamentoController@imprimir` |
| PUT | `password` | `password.update` | `auth` | `App\Http\Controllers\Auth\PasswordController@update` |
| GET / HEAD | `producao` | `producao.index` | `auth, verified, role:administrador / gestor / tecnico` | `App\Http\Controllers\ProducaoController@index` |
| POST | `producao` | `producao.store` | `auth, verified, role:administrador / gestor / tecnico` | `App\Http\Controllers\ProducaoController@store` |
| DELETE | `producao/{producao}` | `producao.destroy` | `auth, verified, role:administrador / gestor / tecnico` | `App\Http\Controllers\ProducaoController@destroy` |
| GET / HEAD | `profile` | `profile.edit` | `auth, verified` | `App\Http\Controllers\ProfileController@edit` |
| PATCH | `profile` | `profile.update` | `auth, verified` | `App\Http\Controllers\ProfileController@update` |
| POST | `reset-password` | `password.store` | `sair.paginas.publicas, guest` | `App\Http\Controllers\Auth\NewPasswordController@store` |
| GET / HEAD | `reset-password/{token}` | `password.reset` | `sair.paginas.publicas, guest` | `App\Http\Controllers\Auth\NewPasswordController@create` |
| GET / HEAD | `storage/{path}` | `storage.local` | `—` | `Closure` |
| PUT | `storage/{path}` | `storage.local.upload` | `—` | `Closure` |
| GET / HEAD | `tarifas` | `tarifas.index` | `auth, verified, role:administrador` | `App\Http\Controllers\TarifaController@index` |
| POST | `tarifas` | `tarifas.store` | `auth, verified, role:administrador` | `App\Http\Controllers\TarifaController@store` |
| PUT | `tarifas/regras` | `tarifas.regras` | `auth, verified, role:administrador` | `App\Http\Controllers\TarifaController@actualizarRegras` |
| PUT | `tarifas/taxa-ligacao` | `tarifas.taxa-ligacao` | `auth, verified, role:administrador` | `App\Http\Controllers\TarifaController@actualizarTaxaLigacao` |
| PUT / PATCH | `tarifas/{tarifa}` | `tarifas.update` | `auth, verified, role:administrador` | `App\Http\Controllers\TarifaController@update` |
| DELETE | `tarifas/{tarifa}` | `tarifas.destroy` | `auth, verified, role:administrador` | `App\Http\Controllers\TarifaController@destroy` |
| GET / HEAD | `tecnico/dashboard` | `tecnico.dashboard` | `auth, verified, role:tecnico` | `App\Http\Controllers\TecnicoDashboardController@index` |
| GET / HEAD | `up` | `—` | `—` | `Closure` |
| GET / HEAD | `verificar/factura/{factura}` | `verificacao.factura` | `signed` | `App\Http\Controllers\VerificacaoController@factura` |
| GET / HEAD | `verificar/pagamento/{pagamento}` | `verificacao.pagamento` | `signed` | `App\Http\Controllers\VerificacaoController@pagamento` |
| GET / HEAD | `verify-email` | `verification.notice` | `auth` | `App\Http\Controllers\Auth\EmailVerificationPromptController` |
| POST | `verify-email` | `verification.verify` | `auth, throttle:10,1` | `App\Http\Controllers\Auth\VerifyEmailController` |
| GET / HEAD | `zonas` | `zonas.index` | `auth, verified, role:administrador` | `App\Http\Controllers\ZonaController@index` |
| POST | `zonas` | `zonas.store` | `auth, verified, role:administrador` | `App\Http\Controllers\ZonaController@store` |
| PUT / PATCH | `zonas/{zona}` | `zonas.update` | `auth, verified, role:administrador` | `App\Http\Controllers\ZonaController@update` |
| DELETE | `zonas/{zona}` | `zonas.destroy` | `auth, verified, role:administrador` | `App\Http\Controllers\ZonaController@destroy` |
