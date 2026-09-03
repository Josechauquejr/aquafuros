<?php

namespace App\Http\Controllers;

use App\Models\Factura;
use App\Models\Pagamento;
use Illuminate\Support\Carbon;
use Inertia\Inertia;

/**
 * Painel da caixa — o que este operador de caixa recebeu hoje, os seus
 * últimos recibos, e as facturas em aberto por cobrar. Foco na operação do
 * dia, não em analítica de sistema.
 */
class CaixaDashboardController extends Controller
{
    public function index()
    {
        $utilizador = request()->user();
        $hoje = Carbon::now()->toDateString();

        $pagamentosHoje = Pagamento::where('recebido_por', $utilizador->id)
            ->whereDate('created_at', $hoje)
            ->get();

        return Inertia::render('Caixa/Dashboard', [
            'resumoHoje' => [
                'totalRecebido' => (float) $pagamentosHoje->sum('valor_pago'),
                'quantidade' => $pagamentosHoje->count(),
                'ticketMedio' => $pagamentosHoje->isEmpty() ? null : round((float) $pagamentosHoje->avg('valor_pago'), 2),
            ],
            'ultimosPagamentos' => Pagamento::where('recebido_por', $utilizador->id)
                ->with(['cliente' => fn ($q) => $q->withTrashed()])
                ->orderByDesc('created_at')
                ->limit(8)
                ->get(),
            'facturasEmAberto' => Factura::whereIn('estado', ['pendente', 'parcial'])
                ->with(['cliente' => fn ($q) => $q->withTrashed()])
                ->orderBy('created_at')
                ->limit(8)
                ->get(),
            'contadorFacturasEmAberto' => Factura::whereIn('estado', ['pendente', 'parcial'])->count(),
        ]);
    }
}
