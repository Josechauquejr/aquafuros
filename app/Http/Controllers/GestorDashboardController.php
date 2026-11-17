<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use App\Models\Factura;
use App\Models\Leitura;
use App\Models\Pagamento;
use App\Support\Alertas;
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
                'clientesTotal' => Cliente::count(),
                // do mês do ciclo — o mesmo que o passo "Confirmar" do Painel
                'leiturasPendentes' => Leitura::where('mes', $hoje->month)->where('ano', $hoje->year)->where('confirmado', false)->count(),
                'leiturasSemFactura' => Leitura::where('confirmado', true)->whereDoesntHave('factura')->count(),
            ],
            'alertas' => Alertas::para(false),
            'dividaTotal' => Cliente::dividaTotalEmAtraso(),
            'facturasVencidas' => $this->facturasVencidas(),
        ]);
    }

    /** Facturas em aberto já vencidas e quanto falta receber delas. */
    private function facturasVencidas(): array
    {
        $facturas = Factura::whereIn('estado', ['pendente', 'parcial'])
            ->where('data_vencimento', '<', now()->toDateString())
            ->withSum('pagamentos', 'valor_pago')
            ->get(['id', 'total_pagar']);

        return [
            'quantidade' => $facturas->count(),
            'valor' => round((float) $facturas->sum(
                fn ($f) => max(0, (float) $f->total_pagar - (float) ($f->pagamentos_sum_valor_pago ?? 0)),
            ), 2),
        ];
    }
}
