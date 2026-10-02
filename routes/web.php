<?php

use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\LixeiraController;
use App\Http\Controllers\Admin\LogController;
use App\Http\Controllers\Dev\AlteracoesController as DevAlteracoesController;
use App\Http\Controllers\Dev\AuditoriaController as DevAuditoriaController;
use App\Http\Controllers\Dev\DadosController as DevDadosController;
use App\Http\Controllers\Dev\EdicaoController as DevEdicaoController;
use App\Http\Controllers\Dev\EmailConfigController as DevEmailConfigController;
use App\Http\Controllers\Dev\EmailsController as DevEmailsController;
use App\Http\Controllers\Dev\FilasController as DevFilasController;
use App\Http\Controllers\Dev\IntegridadeController as DevIntegridadeController;
use App\Http\Controllers\Dev\OperacoesController as DevOperacoesController;
use App\Http\Controllers\Dev\LogAplicacaoController as DevLogAplicacaoController;
use App\Http\Controllers\Dev\ConfiguracaoController as DevConfiguracaoController;
use App\Http\Controllers\Dev\LogController as DevLogController;
use App\Http\Controllers\Dev\PainelController as DevPainelController;
use App\Http\Controllers\Dev\SaudeController as DevSaudeController;
use App\Http\Controllers\Dev\TarefaController as DevTarefaController;
use App\Http\Controllers\CaixaDashboardController;
use App\Http\Controllers\GestorDashboardController;
use App\Http\Controllers\TecnicoDashboardController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\TarifaController;
use App\Http\Controllers\ClienteController;
use App\Http\Controllers\FacturaController;
use App\Http\Controllers\PagamentoController;
use App\Http\Controllers\LeituraController;
use App\Http\Controllers\VerificacaoController;
use App\Http\Controllers\CobrancaController;
use App\Http\Controllers\CreditoController;
use App\Http\Controllers\NotificacaoController;
use App\Http\Controllers\NovidadeController;
use App\Http\Controllers\OcorrenciaController;
use App\Http\Controllers\ProducaoController;
use App\Http\Controllers\ZonaController;
use App\Http\Controllers\EmailEnviadoController;
use App\Http\Controllers\NotificacaoSistemaController;
use Inertia\Inertia;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return Inertia::render('Welcome');
})->middleware('sair.paginas.publicas');

// Verificação pública de autenticidade de documentos (QR code impresso nas
// facturas/recibos) — sem autenticação, protegida por assinatura de URL
// (Laravel signed routes: adulterar o id invalida a assinatura).
Route::middleware(['signed'])->group(function () {
    Route::get('/verificar/factura/{factura}', [VerificacaoController::class, 'factura'])->name('verificacao.factura');
    Route::get('/verificar/pagamento/{pagamento}', [VerificacaoController::class, 'pagamento'])->name('verificacao.pagamento');
});

// Todas as rotas autenticadas exigem também o email verificado — antes do
// utilizador poder entrar em qualquer área, tem de confirmar o email (ver
// Auth/VerifyEmail.jsx). Os utilizadores criados pelo admin/dev já nascem
// verificados (UserSeeder/UserController::store), por isso isto não afecta
// o fluxo actual, só passa a proteger uma eventual conta que não o esteja.
Route::middleware(['auth', 'verified'])->group(function () {
    Route::middleware(['redirect.by.role'])->group(function () {
        Route::get('/dashboard', fn () => Inertia::render('Dashboard'))->name('dashboard');
    });

    Route::post('/novidades/vista', [NovidadeController::class, 'vista'])->name('novidades.vista');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Leitor de QR code — abre a factura/recibo internamente (não a página
    // pública de verificação), disponível a quem lida com facturação e caixa.
    Route::middleware(['role:administrador|gestor|caixa'])->group(function () {
        Route::get('/ler-qr', fn () => Inertia::render('LerQr'))->name('qr.ler');
    });

    // Apenas administrador — o desenvolvedor tem a sua própria área isolada
    // (grupo dev/* mais abaixo), sem acesso às páginas do administrador.
    Route::middleware(['role:administrador'])->group(function () {
        // Antes do resource: evita que "taxa-ligacao" seja capturado pelo
        // wildcard {tarifa} de PUT tarifas/{tarifa}.
        Route::put('tarifas/taxa-ligacao', [TarifaController::class, 'actualizarTaxaLigacao'])->name('tarifas.taxa-ligacao');
        // Correcção de leituras já confirmadas (e desfazer) — só o administrador.
        Route::put('leituras/{leitura}/corrigir', [LeituraController::class, 'corrigir'])->name('leituras.corrigir');
        Route::post('leituras/correccoes/{correccao}/desfazer', [LeituraController::class, 'desfazerCorreccao'])->name('leituras.correccoes.desfazer');
        Route::put('tarifas/regras', [TarifaController::class, 'actualizarRegras'])->name('tarifas.regras');
        Route::resource('tarifas', TarifaController::class)->only(['index', 'store', 'update', 'destroy']);

        // Lixeiras (30 dias para restaurar/apagar definitivamente) — só o
        // administrador tem acesso.
        // Uma só página para as 3 lixeiras (?tipo=clientes|leituras|pagamentos).
        Route::get('lixeira', [LixeiraController::class, 'index'])->name('lixeira.index');
        Route::redirect('clientes/lixeira', '/lixeira?tipo=clientes');
        Route::redirect('leituras/lixeira', '/lixeira?tipo=leituras');
        Route::redirect('pagamentos/lixeira', '/lixeira?tipo=pagamentos');

        Route::post('clientes/lixeira/{id}/restaurar', [LixeiraController::class, 'restaurar'])->name('clientes.lixeira.restaurar');
        Route::delete('clientes/lixeira/{id}', [LixeiraController::class, 'destroyDefinitivo'])->name('clientes.lixeira.destruir');

        Route::post('leituras/lixeira/{id}/restaurar', [LixeiraController::class, 'restaurarLeitura'])->name('leituras.lixeira.restaurar');
        Route::delete('leituras/lixeira/{id}', [LixeiraController::class, 'destroyLeituraDefinitivo'])->name('leituras.lixeira.destruir');

        Route::post('pagamentos/lixeira/{id}/restaurar', [LixeiraController::class, 'restaurarPagamento'])->name('pagamentos.lixeira.restaurar');
        Route::delete('pagamentos/lixeira/{id}', [LixeiraController::class, 'destroyPagamentoDefinitivo'])->name('pagamentos.lixeira.destruir');
    });

    // Administrador e Gestor
    Route::middleware(['role:administrador|gestor'])->group(function () {
        // Rotas de segmento fixo (emitir-lote, imprimir-lote) têm de vir ANTES do
        // resource, senão o {factura} do resource captura-as como se fossem um ID.
        Route::post('facturas/emitir-lote', [FacturaController::class, 'emitirLote'])->name('facturas.emitir-lote');
        Route::post('facturas/email-lote', [FacturaController::class, 'enviarEmailLote'])->name('facturas.email-lote');
        Route::get('facturas/imprimir-lote', [FacturaController::class, 'imprimirLote'])->name('facturas.imprimir-lote');
        Route::get('clientes/{cliente}/imprimir', [ClienteController::class, 'imprimir'])->name('clientes.imprimir');
        Route::resource('clientes', ClienteController::class)->only(['index', 'store', 'update', 'destroy']);
        Route::post('clientes/zonas', [ZonaController::class, 'store'])->name('clientes.zonas.store');
        Route::post('clientes/historico/{activity}/reverter', [ClienteController::class, 'reverter'])->name('clientes.historico.reverter');
        Route::resource('facturas', FacturaController::class)->only(['index', 'store', 'update', 'destroy']);
        Route::get('facturas/{factura}/imprimir', [FacturaController::class, 'imprimir'])->name('facturas.imprimir');
        Route::get('facturas/{factura}/pdf', [FacturaController::class, 'pdf'])->name('facturas.pdf');
        Route::post('facturas/{factura}/email', [FacturaController::class, 'enviarEmail'])->name('facturas.email');

        // Cobrança: quem está em atraso, contactos feitos e promessas de pagamento.
        Route::get('cobranca', [CobrancaController::class, 'index'])->name('cobranca.index');
        Route::post('cobranca/contactos', [CobrancaController::class, 'storeContacto'])->name('cobranca.contactos.store');
        Route::post('cobranca/clientes/{cliente}/email', [CobrancaController::class, 'enviarEmail'])->name('cobranca.email');
        Route::put('cobranca/promessas/{promessa}/cancelar', [CobrancaController::class, 'cancelarPromessa'])->name('cobranca.promessas.cancelar');

        // Registo de todos os emails enviados aos clientes.
        Route::get('emails', [EmailEnviadoController::class, 'index'])->name('emails.index');
        Route::get('emails/{envio}/ver', [EmailEnviadoController::class, 'ver'])->name('emails.ver');
        Route::get('notificacoes-sistema', [NotificacaoSistemaController::class, 'index'])->name('notificacoes-sistema.index');

        // Mensagens aos clientes (lembretes e avisos de atraso).
        Route::get('notificacoes', [NotificacaoController::class, 'index'])->name('notificacoes.index');
        Route::post('notificacoes/gerar', [NotificacaoController::class, 'gerar'])->name('notificacoes.gerar');
        Route::post('notificacoes/{notificacao}/enviar', [NotificacaoController::class, 'enviar'])->name('notificacoes.enviar');
        Route::delete('notificacoes/{notificacao}', [NotificacaoController::class, 'destroy'])->name('notificacoes.destroy');
    });

    // Caixa recebe pagamentos
    Route::middleware(['role:administrador|gestor|caixa'])->group(function () {
        Route::get('pagamentos/imprimir-lote', [PagamentoController::class, 'imprimirLote'])->name('pagamentos.imprimir-lote');
        Route::get('pagamentos/fecho-caixa', [PagamentoController::class, 'fechoCaixa'])->name('pagamentos.fecho-caixa');
        Route::post('pagamentos/fecho-caixa/confirmar', [PagamentoController::class, 'confirmarFecho'])->name('pagamentos.fecho-caixa.confirmar');
        Route::post('creditos', [CreditoController::class, 'store'])->name('creditos.store');
        Route::get('creditos/{credito}/recibo', [CreditoController::class, 'recibo'])->name('creditos.recibo');
        Route::post('pagamentos/multiplo', [PagamentoController::class, 'storeMultiplo'])->name('pagamentos.multiplo');
        Route::get('pagamentos/lote/{lote}/recibo', [PagamentoController::class, 'reciboLote'])->name('pagamentos.recibo-lote');
        Route::delete('pagamentos/lote/{lote}', [PagamentoController::class, 'destroyLote'])->name('pagamentos.lote.destruir');
        Route::resource('pagamentos', PagamentoController::class)->only(['index', 'store', 'update', 'destroy']);
        Route::get('pagamentos/{pagamento}/imprimir', [PagamentoController::class, 'imprimir'])->name('pagamentos.imprimir');
    });

    // Técnico regista leituras
    Route::middleware(['role:administrador|gestor|tecnico'])->group(function () {
        Route::put('leituras/confirmar-todas', [LeituraController::class, 'confirmarTodas'])->name('leituras.confirmar-todas');
        Route::resource('leituras', LeituraController::class)->only(['index', 'store', 'update', 'destroy']);

        // Avarias e reclamações; produção de água (para as perdas).
        Route::resource('ocorrencias', OcorrenciaController::class)->only(['index', 'store', 'update', 'destroy']);
        Route::get('producao', [ProducaoController::class, 'index'])->name('producao.index');
        Route::post('producao', [ProducaoController::class, 'store'])->name('producao.store');
        Route::delete('producao/{producao}', [ProducaoController::class, 'destroy'])->name('producao.destroy');
    });

    // Página principal e KPIs do administrador — exclusivo dele, o
    // desenvolvedor não acede a esta área.
    Route::middleware(['role:administrador'])->prefix('admin')->name('admin.')->group(function () {
        Route::get('dashboard', [AdminDashboardController::class, 'index'])->name('dashboard');
    });

    // KPIs: o gestor vê a análise; os de controlo (anulações, estornos, caixa) ficam só para o administrador.
    Route::middleware(['role:administrador|gestor'])->prefix('admin')->name('admin.')->group(function () {
        Route::get('kpis', [AdminDashboardController::class, 'kpis'])->name('kpis');
        Route::get('kpis/exportar', [AdminDashboardController::class, 'exportarKpis'])->name('kpis.exportar');
    });

    Route::middleware(['role:administrador'])->group(function () {
        Route::resource('zonas', ZonaController::class)->only(['index', 'store', 'update', 'destroy']);
    });

    Route::middleware(['role:gestor'])->prefix('gestor')->name('gestor.')->group(function () {
        Route::get('dashboard', [GestorDashboardController::class, 'index'])->name('dashboard');
    });

    Route::middleware(['role:caixa'])->prefix('caixa')->name('caixa.')->group(function () {
        Route::get('dashboard', [CaixaDashboardController::class, 'index'])->name('dashboard');
    });

    Route::middleware(['role:tecnico'])->prefix('tecnico')->name('tecnico.')->group(function () {
        Route::get('dashboard', [TecnicoDashboardController::class, 'index'])->name('dashboard');
    });

    // Área exclusiva do Desenvolvedor — totalmente isolada dos restantes
    // papéis, incluindo administrador (nem um acede às páginas do outro).
    Route::middleware(['role:desenvolvedor', 'throttle:120,1', 'dev.auditar'])->prefix('dev')->name('dev.')->group(function () {
        // Só leitura.
        Route::get('painel', [DevPainelController::class, 'index'])->name('painel');
        Route::get('saude', [DevSaudeController::class, 'index'])->name('saude');
        Route::get('auditoria', [DevAuditoriaController::class, 'index'])->name('auditoria');
        Route::get('configuracoes', [DevConfiguracaoController::class, 'index'])->name('configuracoes.index');
        Route::get('dados', [DevDadosController::class, 'index'])->name('dados.index');
        Route::get('dados/{tabela}', [DevDadosController::class, 'tabela'])->name('dados.tabela');
        Route::get('dados/{tabela}/registo/{id}', [DevDadosController::class, 'registo'])->name('dados.registo');
        // Alterações de dados: a página mostra sempre o estado; o resto só corre com DEV_ESCRITA=true.
        Route::get('alteracoes', [DevAlteracoesController::class, 'index'])->name('alteracoes');
        Route::get('editar/{tabela}/{id}', [DevEdicaoController::class, 'form'])->middleware('dev.escrita')->name('editar');
        Route::get('integridade', [DevIntegridadeController::class, 'index'])->name('integridade');
        Route::get('integridade/{chave}', [DevIntegridadeController::class, 'detalhe'])->name('integridade.detalhe');
        Route::get('analise', [DevIntegridadeController::class, 'analise'])->name('analise');
        Route::get('filas', [DevFilasController::class, 'index'])->name('filas');
        Route::get('operacoes', [DevOperacoesController::class, 'index'])->name('operacoes');
        Route::get('emails', [DevEmailsController::class, 'index'])->name('emails');
        Route::get('emails/{envio}/ver', [DevEmailsController::class, 'ver'])->name('emails.ver');

        // Ligação do Gmail e envio automático (configuração técnica: só o desenvolvedor).
        Route::get('email', [DevEmailConfigController::class, 'index'])->name('email');
        Route::get('email/google', [DevEmailConfigController::class, 'ligar'])->name('email.ligar');
        Route::get('email/google/callback', [DevEmailConfigController::class, 'callback'])->name('email.callback');
        Route::get('logs/aplicacao', [DevLogAplicacaoController::class, 'index'])->name('logs.aplicacao');
        Route::get('logs/acessos', [DevLogController::class, 'acessos'])->name('logs.acessos');
        Route::get('logs/erros', [DevLogController::class, 'erros'])->name('logs.erros');
        Route::get('actividade', [LogController::class, 'index'])->name('logs.actividade');
        Route::get('users', [UserController::class, 'index'])->name('users.index');
        Route::get('users/lixeira', [UserController::class, 'lixeira'])->name('users.lixeira');

        // Checklist pessoal e marcar erros como resolvidos: sem risco, sem repetir a senha.
        Route::put('logs/erros/{erro}/resolver', [DevLogController::class, 'marcarResolvido'])->name('logs.erros.resolver');
        Route::resource('tarefas', DevTarefaController::class)->only(['index', 'store', 'update', 'destroy']);

        // A pré-visualização só LÊ (mostra o que seria afectado): pede a senha mas não precisa de DEV_ESCRITA.
        Route::post('alteracoes/previa', [DevAlteracoesController::class, 'previa'])->middleware(['password.confirm:password.confirm,900', 'throttle:20,1'])->name('alteracoes.previa');

        Route::middleware(['dev.escrita', 'password.confirm:password.confirm,900', 'throttle:20,1'])->group(function () {
            Route::post('alteracoes/executar', [DevAlteracoesController::class, 'executar'])->name('alteracoes.executar');
            Route::post('alteracoes/{snapshot}/desfazer', [DevAlteracoesController::class, 'desfazer'])->name('alteracoes.desfazer');
            Route::put('editar/{tabela}/{id}', [DevEdicaoController::class, 'guardar'])->name('editar.guardar');
        });

        // Tudo o que altera dados ou contas: volta a pedir a senha (válida 15 min) e fica na auditoria.
        Route::middleware(['password.confirm:password.confirm,900'])->group(function () {
            // Filas, operações do sistema e reenvio de emails (acções reais: a maioria pede também uma palavra escrita).
            Route::post('filas/falhados/repetir-todos', [DevFilasController::class, 'repetirTodos'])->name('filas.repetir-todos');
            Route::post('filas/falhados/{uuid}/repetir', [DevFilasController::class, 'repetir'])->name('filas.repetir');
            Route::delete('filas/falhados/{uuid}', [DevFilasController::class, 'esquecer'])->name('filas.esquecer');
            Route::delete('filas/falhados', [DevFilasController::class, 'limparFalhados'])->name('filas.limpar-falhados');
            Route::delete('filas/pendentes/{id}', [DevFilasController::class, 'apagarPendente'])->name('filas.apagar-pendente');
            Route::delete('filas/pendentes', [DevFilasController::class, 'limparPendentes'])->name('filas.limpar-pendentes');
            Route::post('operacoes/tarefa', [DevOperacoesController::class, 'executarTarefa'])->name('operacoes.tarefa');
            Route::post('operacoes/cache', [DevOperacoesController::class, 'limparCache'])->name('operacoes.cache');
            Route::post('operacoes/manutencao', [DevOperacoesController::class, 'ligarManutencao'])->name('operacoes.manutencao.ligar');
            Route::delete('operacoes/manutencao', [DevOperacoesController::class, 'desligarManutencao'])->name('operacoes.manutencao.desligar');
            Route::post('emails/{envio}/reenviar', [DevEmailsController::class, 'reenviar'])->name('emails.reenviar');
            Route::delete('email/google', [DevEmailConfigController::class, 'desligar'])->name('email.desligar');
            Route::put('email/automatico', [DevEmailConfigController::class, 'automatico'])->name('email.automatico');
            Route::post('email/teste', [DevEmailConfigController::class, 'testar'])->name('email.testar');

            // Exportar dados pessoais: pede a senha, tem limite de pedidos e fica na auditoria.
            Route::get('dados/{tabela}/exportar', [DevDadosController::class, 'exportar'])->middleware('throttle:6,1')->name('dados.exportar');
            Route::put('configuracoes/funcionalidades/{funcionalidade}', [DevConfiguracaoController::class, 'actualizarFuncionalidade'])->name('configuracoes.funcionalidade');
            Route::put('configuracoes/horario', [DevConfiguracaoController::class, 'actualizarHorario'])->name('configuracoes.horario');
            // POST em vez de PUT: envia ficheiro (logotipo) via multipart/form-data.
            Route::post('configuracoes/empresa', [DevConfiguracaoController::class, 'actualizarEmpresa'])->name('configuracoes.empresa');
            Route::delete('actividade', [LogController::class, 'limpar'])->name('logs.actividade.limpar');
            Route::post('users/{user}/reset-password', [UserController::class, 'resetPassword'])->name('users.reset-password');
            Route::post('users/lixeira/{id}/restaurar', [UserController::class, 'restaurar'])->name('users.lixeira.restaurar');
            Route::delete('users/lixeira/{id}', [UserController::class, 'destroyDefinitivo'])->name('users.lixeira.destruir');
            Route::resource('users', UserController::class)->only(['store', 'update', 'destroy']);
        });
    });
});

require __DIR__.'/auth.php';
