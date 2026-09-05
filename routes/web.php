<?php

use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\LixeiraController;
use App\Http\Controllers\Admin\LogController;
use App\Http\Controllers\Dev\ConfiguracaoController as DevConfiguracaoController;
use App\Http\Controllers\Dev\LogController as DevLogController;
use App\Http\Controllers\Dev\PainelController as DevPainelController;
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

Route::middleware(['auth', 'redirect.by.role'])->group(function () {
   Route::get('/dashboard', fn () => Inertia::render('Dashboard'))->name('dashboard');
});

Route::middleware(['auth'])->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

// Leitor de QR code — abre a factura/recibo internamente (não a página
// pública de verificação), disponível a quem lida com facturação e caixa.
Route::middleware(['auth', 'role:administrador|gestor|caixa'])->group(function () {
    Route::get('/ler-qr', fn () => Inertia::render('LerQr'))->name('qr.ler');
});

// Apenas administrador — o desenvolvedor tem a sua própria área isolada
// (grupo dev/* mais abaixo), sem acesso às páginas do administrador.
Route::middleware(['auth', 'role:administrador'])->group(function () {
    // Antes do resource: evita que "taxa-ligacao" seja capturado pelo
    // wildcard {tarifa} de PUT tarifas/{tarifa}.
    Route::put('tarifas/taxa-ligacao', [TarifaController::class, 'actualizarTaxaLigacao'])->name('tarifas.taxa-ligacao');
    Route::resource('tarifas', TarifaController::class)->only(['index', 'store', 'update', 'destroy']);

    // Lixeira de clientes eliminados (30 dias para restaurar/apagar
    // definitivamente) — só o administrador tem acesso.
    Route::get('clientes/lixeira', [LixeiraController::class, 'index'])->name('clientes.lixeira');
    Route::post('clientes/lixeira/{id}/restaurar', [LixeiraController::class, 'restaurar'])->name('clientes.lixeira.restaurar');
    Route::delete('clientes/lixeira/{id}', [LixeiraController::class, 'destroyDefinitivo'])->name('clientes.lixeira.destruir');
});

// Administrador e Gestor
Route::middleware(['auth', 'role:administrador|gestor'])->group(function () {
    // Rotas de segmento fixo (emitir-lote, imprimir-lote) têm de vir ANTES do
    // resource, senão o {factura} do resource captura-as como se fossem um ID.
    Route::post('facturas/emitir-lote', [FacturaController::class, 'emitirLote'])->name('facturas.emitir-lote');
    Route::get('facturas/imprimir-lote', [FacturaController::class, 'imprimirLote'])->name('facturas.imprimir-lote');
    Route::get('clientes/{cliente}/imprimir', [ClienteController::class, 'imprimir'])->name('clientes.imprimir');
    Route::resource('clientes', ClienteController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::resource('facturas', FacturaController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::get('facturas/{factura}/imprimir', [FacturaController::class, 'imprimir'])->name('facturas.imprimir');
});

// Caixa recebe pagamentos
Route::middleware(['auth', 'role:administrador|gestor|caixa'])->group(function () {
    Route::get('pagamentos/imprimir-lote', [PagamentoController::class, 'imprimirLote'])->name('pagamentos.imprimir-lote');
    Route::get('pagamentos/fecho-caixa', [PagamentoController::class, 'fechoCaixa'])->name('pagamentos.fecho-caixa');
    Route::resource('pagamentos', PagamentoController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::get('pagamentos/{pagamento}/imprimir', [PagamentoController::class, 'imprimir'])->name('pagamentos.imprimir');
});

// Técnico regista leituras
Route::middleware(['auth', 'role:administrador|gestor|tecnico'])->group(function () {
    Route::resource('leituras', LeituraController::class)->only(['index', 'store', 'update', 'destroy']);
});

// Página principal e KPIs do administrador — exclusivo dele, o
// desenvolvedor não acede a esta área.
Route::middleware(['auth', 'role:administrador'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('dashboard', [AdminDashboardController::class, 'index'])->name('dashboard');
    Route::get('dashboard/exportar', [AdminDashboardController::class, 'exportar'])->name('dashboard.exportar');
    Route::get('kpis', [AdminDashboardController::class, 'kpis'])->name('kpis');
});

Route::middleware(['auth', 'role:gestor'])->prefix('gestor')->name('gestor.')->group(function () {
    Route::get('dashboard', [GestorDashboardController::class, 'index'])->name('dashboard');
});

Route::middleware(['auth', 'role:caixa'])->prefix('caixa')->name('caixa.')->group(function () {
    Route::get('dashboard', [CaixaDashboardController::class, 'index'])->name('dashboard');
});

Route::middleware(['auth', 'role:tecnico'])->prefix('tecnico')->name('tecnico.')->group(function () {
    Route::get('dashboard', [TecnicoDashboardController::class, 'index'])->name('dashboard');
});

// Área exclusiva do Desenvolvedor — totalmente isolada dos restantes
// papéis, incluindo administrador (nem um acede às páginas do outro).
Route::middleware(['auth', 'role:desenvolvedor'])->prefix('dev')->name('dev.')->group(function () {
    Route::get('painel', [DevPainelController::class, 'index'])->name('painel');
    Route::get('configuracoes', [DevConfiguracaoController::class, 'index'])->name('configuracoes.index');
    Route::put('configuracoes/funcionalidades/{funcionalidade}', [DevConfiguracaoController::class, 'actualizarFuncionalidade'])->name('configuracoes.funcionalidade');
    Route::put('configuracoes/horario', [DevConfiguracaoController::class, 'actualizarHorario'])->name('configuracoes.horario');
    // POST em vez de PUT: envia ficheiro (logotipo) via multipart/form-data.
    Route::post('configuracoes/empresa', [DevConfiguracaoController::class, 'actualizarEmpresa'])->name('configuracoes.empresa');
    Route::get('logs/acessos', [DevLogController::class, 'acessos'])->name('logs.acessos');
    Route::get('logs/erros', [DevLogController::class, 'erros'])->name('logs.erros');
    Route::put('logs/erros/{erro}/resolver', [DevLogController::class, 'marcarResolvido'])->name('logs.erros.resolver');
    Route::get('actividade', [LogController::class, 'index'])->name('logs.actividade');
    Route::delete('actividade', [LogController::class, 'limpar'])->name('logs.actividade.limpar');
    Route::post('users/{user}/reset-password', [UserController::class, 'resetPassword'])->name('users.reset-password');
    Route::resource('users', UserController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::resource('tarefas', DevTarefaController::class)->only(['index', 'store', 'update', 'destroy']);
});

require __DIR__.'/auth.php';
