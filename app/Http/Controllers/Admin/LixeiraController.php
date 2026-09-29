<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Cliente;
use App\Models\Leitura;
use App\Models\Pagamento;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

/**
 * Lixeiras administrativas — clientes, e leituras/pagamentos eliminados
 * isoladamente (não como parte de apagar um cliente; esses já ficam
 * cobertos pela lixeira do próprio cliente). 30 dias para restaurar ou
 * apagar definitivamente. Não há tarefa agendada (cron) configurada no
 * alojamento actual, por isso a purga de quem já passou os 30 dias corre
 * aqui mesmo, sempre que a respectiva página é aberta — suficiente para o
 * volume desta app, sem depender de infra extra.
 */
class LixeiraController extends Controller
{
    private const DIAS_RETENCAO = 30;

    public function index()
    {
        $this->purgarExpirados();

        $clientes = Cliente::onlyTrashed()
            ->with('tarifa')
            ->withCount(['facturas' => fn ($q) => $q->withTrashed(), 'leituras' => fn ($q) => $q->withTrashed(), 'pagamentos' => fn ($q) => $q->withTrashed()])
            ->orderByDesc('deleted_at')
            ->get()
            ->map(fn (Cliente $cliente) => [
                'id' => $cliente->id,
                'numero_cliente' => $cliente->numero_cliente,
                'nome' => $cliente->nome,
                'bairro' => $cliente->bairro,
                'tarifa' => $cliente->tarifa?->nome,
                'eliminado_em' => $cliente->deleted_at,
                'dias_restantes' => $this->diasRestantes($cliente->deleted_at),
                'preservado' => $this->temHistoricoFinanceiro($cliente),
                'facturas_count' => $cliente->facturas_count,
                'leituras_count' => $cliente->leituras_count,
                'pagamentos_count' => $cliente->pagamentos_count,
            ]);

        return Inertia::render('Clientes/Lixeira', [
            'clientes' => $clientes,
            'diasRetencao' => self::DIAS_RETENCAO,
        ]);
    }

    public function restaurar(int $id)
    {
        $cliente = Cliente::onlyTrashed()->findOrFail($id);

        DB::transaction(function () use ($cliente) {
            $cliente->pagamentos()->onlyTrashed()->restore();
            $cliente->facturas()->onlyTrashed()->restore();
            $cliente->leituras()->onlyTrashed()->restore();
            $cliente->restore();
        });

        return redirect()->route('clientes.lixeira')->with('status', "Cliente {$cliente->nome} recuperado com sucesso.");
    }

    public function destroyDefinitivo(int $id)
    {
        $cliente = Cliente::onlyTrashed()->findOrFail($id);
        $nome = $cliente->nome;

        $this->purgarCliente($cliente);

        return redirect()->route('clientes.lixeira')->with('status', "Cliente {$nome} eliminado definitivamente.");
    }

    private function purgarExpirados(): void
    {
        $limite = Carbon::now()->subDays(self::DIAS_RETENCAO);

        Cliente::onlyTrashed()
            ->where('deleted_at', '<=', $limite)
            ->get()
            ->each(function (Cliente $cliente) {
                // Um cliente com facturas ou pagamentos no histórico nunca é
                // apagado de vez, mesmo depois dos 30 dias — perder essas
                // facturas/recibos seria perder registos fiscais/financeiros
                // reais. Fica na lixeira indefinidamente, só recuperável ou
                // visível aqui (não conta para nada como cliente activo).
                if ($this->temHistoricoFinanceiro($cliente)) {
                    return;
                }

                $this->purgarCliente($cliente);
            });
    }

    private function temHistoricoFinanceiro(Cliente $cliente): bool
    {
        return $cliente->facturas()->withTrashed()->exists()
            || $cliente->pagamentos()->withTrashed()->exists();
    }

    private function purgarCliente(Cliente $cliente): void
    {
        DB::transaction(function () use ($cliente) {
            $cliente->pagamentos()->withTrashed()->forceDelete();
            $cliente->facturas()->withTrashed()->forceDelete();
            $cliente->leituras()->withTrashed()->forceDelete();
            $cliente->divida()->delete();
            $cliente->forceDelete();
        });
    }

    private function diasRestantes(?string $deletedAt): int
    {
        if (! $deletedAt) {
            return 0;
        }

        $limite = Carbon::parse($deletedAt)->addDays(self::DIAS_RETENCAO);

        return max(0, (int) Carbon::now()->diffInDays($limite, false));
    }

    /**
     * Leituras eliminadas isoladamente (nunca chegaram a ter factura) — as
     * que ficam anuladas em cascata ao anular uma factura, ou apagadas
     * junto com um cliente, não aparecem aqui: têm o seu próprio ciclo de
     * vida (ligadas à factura anulada, ou à lixeira desse cliente).
     */
    public function leituras()
    {
        $limite = Carbon::now()->subDays(self::DIAS_RETENCAO);

        Leitura::onlyTrashed()
            ->whereDoesntHave('factura')
            ->whereHas('cliente', fn ($q) => $q->whereNull('deleted_at'))
            ->where('deleted_at', '<=', $limite)
            ->forceDelete();

        $meses = [
            "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
            "Jul", "Ago", "Set", "Out", "Nov", "Dez",
        ];

        $leituras = Leitura::onlyTrashed()
            ->whereDoesntHave('factura')
            ->whereHas('cliente', fn ($q) => $q->whereNull('deleted_at'))
            ->with(['cliente' => fn ($q) => $q->withTrashed()])
            ->orderByDesc('deleted_at')
            ->get()
            ->map(fn (Leitura $leitura) => [
                'id' => $leitura->id,
                'cliente' => $leitura->cliente?->nome ?? 'Cliente removido',
                'periodo' => "{$meses[$leitura->mes - 1]}/{$leitura->ano}",
                'leitura_actual' => $leitura->leitura_actual,
                'eliminado_em' => $leitura->deleted_at,
                'dias_restantes' => $this->diasRestantes($leitura->deleted_at),
            ]);

        return Inertia::render('Leituras/Lixeira', [
            'leituras' => $leituras,
            'diasRetencao' => self::DIAS_RETENCAO,
        ]);
    }

    public function restaurarLeitura(int $id)
    {
        $leitura = Leitura::onlyTrashed()->findOrFail($id);
        $leitura->restore();

        return redirect()->route('leituras.lixeira')->with('status', 'Leitura recuperada com sucesso.');
    }

    public function destroyLeituraDefinitivo(int $id)
    {
        Leitura::onlyTrashed()->findOrFail($id)->forceDelete();

        return redirect()->route('leituras.lixeira')->with('status', 'Leitura eliminada definitivamente.');
    }

    /**
     * Pagamentos estornados (App\Http\Controllers\PagamentoController::destroy)
     * ou eliminados isoladamente — os que fazem parte da lixeira de um
     * cliente eliminado não aparecem aqui.
     */
    public function pagamentos()
    {
        $limite = Carbon::now()->subDays(self::DIAS_RETENCAO);

        Pagamento::onlyTrashed()
            ->whereHas('cliente', fn ($q) => $q->whereNull('deleted_at'))
            ->where('deleted_at', '<=', $limite)
            ->forceDelete();

        $pagamentos = Pagamento::onlyTrashed()
            ->whereHas('cliente', fn ($q) => $q->whereNull('deleted_at'))
            ->with(['cliente' => fn ($q) => $q->withTrashed(), 'factura'])
            ->orderByDesc('deleted_at')
            ->get()
            ->map(fn (Pagamento $pagamento) => [
                'id' => $pagamento->id,
                'numero_recibo' => $pagamento->numero_recibo,
                'cliente' => $pagamento->cliente?->nome ?? 'Cliente removido',
                'factura' => $pagamento->factura?->numero_factura,
                'valor_pago' => $pagamento->valor_pago,
                'metodo_pagamento' => $pagamento->metodo_pagamento,
                'eliminado_em' => $pagamento->deleted_at,
                'dias_restantes' => $this->diasRestantes($pagamento->deleted_at),
            ]);

        return Inertia::render('Pagamentos/Lixeira', [
            'pagamentos' => $pagamentos,
            'diasRetencao' => self::DIAS_RETENCAO,
        ]);
    }

    public function restaurarPagamento(int $id)
    {
        $pagamento = Pagamento::onlyTrashed()->with('factura')->findOrFail($id);
        $pagamento->restore();

        if ($pagamento->factura) {
            app(\App\Http\Controllers\PagamentoController::class)->recalcularFacturaEDivida($pagamento->factura);
        }

        return redirect()->route('pagamentos.lixeira')->with('status', 'Pagamento recuperado com sucesso.');
    }

    public function destroyPagamentoDefinitivo(int $id)
    {
        Pagamento::onlyTrashed()->findOrFail($id)->forceDelete();

        return redirect()->route('pagamentos.lixeira')->with('status', 'Pagamento eliminado definitivamente.');
    }
}
