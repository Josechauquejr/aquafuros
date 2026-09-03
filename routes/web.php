<?php

use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\LogController;
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
});

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

// Apenas administrador
Route::middleware(['auth', 'role:administrador'])->group(function () {
    Route::resource('users', UserController::class)->only(['index']);
    // Antes do resource: evita que "taxa-ligacao" seja capturado pelo
    // wildcard {tarifa} de PUT tarifas/{tarifa}.
    Route::put('tarifas/taxa-ligacao', [TarifaController::class, 'actualizarTaxaLigacao'])->name('tarifas.taxa-ligacao');
    Route::resource('tarifas', TarifaController::class)->only(['index', 'store', 'update', 'destroy']);
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

// Dashboards específicos por role
Route::middleware(['auth', 'role:administrador'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('dashboard', [AdminDashboardController::class, 'index'])->name('dashboard');
    Route::get('dashboard/exportar', [AdminDashboardController::class, 'exportar'])->name('dashboard.exportar');
    Route::get('kpis', [AdminDashboardController::class, 'kpis'])->name('kpis');
    Route::get('logs', [LogController::class, 'index'])->name('logs.index');
    Route::delete('logs', [LogController::class, 'limpar'])->name('logs.limpar');
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

require __DIR__.'/auth.php';
