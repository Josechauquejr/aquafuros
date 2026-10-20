<?php

use App\Models\Factura;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Facturas emitidas antes da consolidação mantêm o saldo anterior como
     * informativo. Reúne facturas ainda abertas na mais recente do cliente,
     * mantendo as anteriores no histórico e sem permitir cobrança duplicada.
     */
    public function up(): void
    {
        if (! DB::table('facturas')->exists()) return;
        DB::statement('ALTER TABLE facturas DROP CONSTRAINT IF EXISTS facturas_estado_check');
        DB::statement("ALTER TABLE facturas ADD CONSTRAINT facturas_estado_check CHECK (estado IN ('pendente', 'paga', 'parcial', 'anulada', 'transferida'))");

        DB::transaction(function () {
            $clientes = Factura::query()
                ->whereIn('estado', ['pendente', 'parcial'])
                ->select('cliente_id')
                ->groupBy('cliente_id')
                ->havingRaw('count(*) > 1')
                ->pluck('cliente_id');

            foreach ($clientes as $clienteId) {
                $abertas = Factura::where('cliente_id', $clienteId)
                    ->whereIn('estado', ['pendente', 'parcial'])
                    ->with(['pagamentos', 'cliente.tarifa'])
                    ->orderBy('created_at')->orderBy('id')->lockForUpdate()->get();

                if ($abertas->count() < 2) {
                    continue;
                }

                $actual = $abertas->pop();
                $anteriores = $abertas;

                foreach ($anteriores as $anterior) {
                    $anterior->registarMultaAtraso();
                    $anterior->refresh();
                }

                $saldoAnterior = round($anteriores->sum(fn (Factura $f) => $f->emFalta()), 2);
                $multaAnterior = round($anteriores->sum(fn (Factura $f) => self::multaEmFalta($f)), 2);
                $dividaAnterior = max(0, round($saldoAnterior - $multaAnterior, 2));
                $valorDestaFactura = $actual->divida_anterior_incluida
                    ? $actual->valorProprio()
                    : round((float) $actual->total_pagar, 2);

                $actual->update([
                    'divida_anterior' => $dividaAnterior,
                    'multa_anterior' => $multaAnterior,
                    'divida_anterior_incluida' => true,
                    'total_pagar' => round($saldoAnterior + $valorDestaFactura, 2),
                ]);

                foreach ($anteriores as $anterior) {
                    $anterior->update([
                        'estado' => 'transferida',
                        'transferida_para_id' => $actual->id,
                    ]);
                }
            }
        });
    }

    private static function multaEmFalta(Factura $factura): float
    {
        $multa = (float) $factura->multa + (float) $factura->multa_anterior;
        $principal = max(0, (float) $factura->total_pagar - $multa);
        $multaPaga = min($multa, max(0, $factura->totalPago() - $principal));

        return max(0, round($multa - $multaPaga, 2));
    }

    public function down(): void
    {
        // A transferência altera dados contabilísticos e mantém um rasto.
        // Não há reversão automática para não duplicar saldos já pagos.
    }
};
