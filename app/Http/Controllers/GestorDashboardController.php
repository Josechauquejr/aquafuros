<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use App\Models\Factura;
use App\Models\Leitura;
use App\Models\Pagamento;
use App\Support\MesReferencia;
use App\Support\ResumoMensal;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * Painel do gestor — visão operacional do mês actual (facturação, cobrança,
 * leituras pendentes, maiores devedores) com atalhos para as áreas que o
 * gestor gere no dia-a-dia. Sem as métricas de administração de sistema
 * (utilizadores, tarifário, registo de actividade), reservadas ao admin.
 */
class GestorDashboardController extends Controller
{
    public function index(Request $request)
    {
        $hoje = MesReferencia::resolver($request);

        $resumo = ResumoMensal::calcular($hoje->month, $hoje->year);

        return Inertia::render('Gestor/Dashboard', [
            'mesReferencia' => MesReferencia::paraSeletor($hoje),
            'resumoMes' => $resumo,
            'contadores' => [
                'clientesActivos' => Cliente::where('estado', 'ativo')->count(),
                'clientesCortados' => Cliente::where('estado', 'cortado')->count(),
                'clientesCortadosSemDivida' => Cliente::clientesCortadosSemDividaCount(),
                'leiturasPendentes' => Leitura::where('confirmado', false)->count(),
                'leiturasSemFactura' => Leitura::where('confirmado', true)->whereDoesntHave('factura')->count(),
            ],
            'dividaTotal' => Cliente::dividaTotalEmAtraso(),
            'maioresDevedores' => Cliente::maioresDevedores(5),
        ]);
    }
}
