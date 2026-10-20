<?php

namespace App\Services;

use App\Models\Cliente;
use App\Models\Factura;
use App\Models\Pagamento;
use App\Models\PagamentoImputacao;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ImputacaoPagamento
{
    public static function aplicar(Pagamento $pagamento): void
    {
        Cliente::withTrashed()->whereKey($pagamento->cliente_id)->lockForUpdate()->firstOrFail();
        $factura = Factura::whereKey($pagamento->factura_id)->lockForUpdate()->firstOrFail();
        if ($factura->cliente_id !== $pagamento->cliente_id || ! in_array($factura->estado, ['pendente', 'parcial', 'paga'], true)) {
            throw ValidationException::withMessages(['factura_id' => 'A factura seleccionada já não aceita este pagamento.']);
        }
        $factura->setRelation('pagamentos', $factura->pagamentos()->where('id', '!=', $pagamento->id)->get());
        $valor = (int) round((float) $pagamento->valor_pago * 100);
        $principal = (int) round($factura->principalEmFalta() * 100);
        $multa = (int) round($factura->multaEmFalta() * 100);
        if ($valor <= 0 || $valor > $principal + $multa) {
            throw ValidationException::withMessages(['valor_pago' => 'O saldo da factura mudou. Actualize os valores antes de confirmar o pagamento.']);
        }
        $partePrincipal = min($principal, $valor);
        PagamentoImputacao::create([
            'pagamento_id' => $pagamento->id, 'factura_id' => $factura->id,
            'valor_principal' => $partePrincipal / 100,
            'valor_multa' => ($valor - $partePrincipal) / 100,
        ]);
        $pagamento->unsetRelation('imputacoes');
        self::recalcularCliente($factura->cliente_id);
    }

    public static function recalcularCliente(int $clienteId): void
    {
        Cliente::withTrashed()->whereKey($clienteId)->lockForUpdate()->first();
        foreach (Factura::where('cliente_id', $clienteId)->where('estado', '!=', 'anulada')->lockForUpdate()->get() as $factura) {
            $pago = $factura->totalPago();
            $estado = $pago + 0.005 >= (float) $factura->total_pagar ? 'paga' : ($pago > 0 ? 'parcial' : 'pendente');
            if ($factura->estado !== $estado) $factura->update(['estado' => $estado]);
        }
    }

    public static function validarReposicao(Pagamento $pagamento): void
    {
        Cliente::withTrashed()->whereKey($pagamento->cliente_id)->lockForUpdate()->firstOrFail();
        foreach ($pagamento->imputacoes()->with('factura')->get() as $parcela) {
            $factura = $parcela->factura;
            if (! $factura || $factura->trashed() || $factura->estado === 'anulada'
                || (float) $parcela->valor_principal > $factura->principalEmFalta() + 0.005
                || (float) $parcela->valor_multa > $factura->multaEmFalta() + 0.005) {
                throw ValidationException::withMessages(['pagamento' => 'A reposição excederia o saldo actual de uma factura de origem.']);
            }
        }
    }
}
