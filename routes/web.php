<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\TarifaController;
use App\Http\Controllers\ClienteController;
use App\Http\Controllers\FacturaController;
use App\Http\Controllers\PagamentoController;
use App\Http\Controllers\LeituraController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/dashboard', function () {
    return view('dashboard');
})->middleware(['auth'])->name('dashboard');

Route::middleware(['auth'])->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

// Apenas administrador
Route::middleware(['auth', 'role:administrador'])->group(function () {
    Route::resource('users', UserController::class);
    Route::resource('tarifas', TarifaController::class);
});

// Administrador e Gestor
Route::middleware(['auth', 'role:administrador|gestor'])->group(function () {
    Route::resource('clientes', ClienteController::class);
    Route::resource('facturas', FacturaController::class);
});

// Caixa recebe pagamentos
Route::middleware(['auth', 'role:administrador|gestor|caixa'])->group(function () {
    Route::resource('pagamentos', PagamentoController::class);
});

// Técnico regista leituras
Route::middleware(['auth', 'role:administrador|gestor|tecnico'])->group(function () {
    Route::resource('leituras', LeituraController::class);
});

require __DIR__.'/auth.php';
