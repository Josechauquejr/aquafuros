<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use App\Models\Divida;
use App\Models\Factura;
use App\Models\Leitura;
use App\Models\Pagamento;
use Illuminate\Support\Carbon;
use Inertia\Inertia;

/**
 * Painel do gestor — visão operacional do mês actual (facturação, cobrança,
 * leituras pendentes, maiores devedores) com atalhos para as áreas que o
 * gestor gere no dia-a-dia. Sem as métricas de administração de sistema
 * (utilizadores, tarifário, registo de actividade), reservadas ao admin.
 */
class GestorDashboardController extends Controller
{
    public function index()
    {
        $hoje = Carbon::now();

        $facturas = Factura::where('mes', $hoje->month)
            ->where('ano', $hoje->year)
            ->where('estado', '!=', 'anulada')
            ->get();
        $totalFacturado = (float) $facturas->sum('total_pagar');
        $totalRecebido = (float) Pagamento::whereIn('factura_id', $facturas->pluck('id'))->sum('valor_pago');

        return Inertia::render('Gestor/Dashboard', [
            'resumoMes' => [
                'mes' => $hoje->month,
                'ano' => $hoje->year,
                'totalFacturado' => $totalFacturado,
                'totalRecebido' => $totalRecebido,
                'taxaCobranca' => $totalFacturado > 0 ? round(($totalRecebido / $totalFacturado) * 100, 1) : null,
                'numeroFacturas' => $facturas->count(),
            ],
            'contadores' => [
                'clientesActivos' => Cliente::where('estado', 'ativo')->count(),
                'clientesCortados' => Cliente::where('estado', 'cortado')->count(),
                'leiturasPendentes' => Leitura::where('confirmado', false)->count(),
                'leiturasSemFactura' => Leitura::where('confirmado', true)->whereDoesntHave('factura')->count(),
            ],
            'dividaTotal' => (float) Divida::sum('valor_divida'),
            'maioresDevedores' => Divida::where('valor_divida', '>', 0)
                ->with(['cliente' => fn ($q) => $q->withTrashed()])
                ->orderByDesc('valor_divida')
                ->limit(5)
                ->get(),
        ]);
    }
}
