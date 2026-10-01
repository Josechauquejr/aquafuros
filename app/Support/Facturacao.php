<?php

namespace App\Support;

use App\Models\Configuracao;
use App\Models\Factura;
use App\Models\Leitura;
use App\Services\BillingService;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Emissão de facturas a partir de leituras confirmadas, e o que acontece a
 * seguir: o envio automático por email (a quem tem email) e a emissão
 * automática quando a leitura é confirmada. Os dois automatismos ligam-se e
 * desligam-se em Administração > Email.
 */
class Facturacao
{
    public static function emitir(Leitura $leitura, int $geradaPor): Factura
    {
        $calculo = app(BillingService::class)->calcular($leitura, $leitura->cliente);

        return Factura::create([
            'numero_factura' => self::proximoNumero($leitura->ano),
            'cliente_id' => $leitura->cliente_id,
            'leitura_id' => $leitura->id,
            'tipo' => 'consumo',
            'mes' => $leitura->mes,
            'ano' => $leitura->ano,
            // Prazo em dias corridos após a emissão (Tarifas > Prazos e limites; 15 por omissão).
            'data_vencimento' => now()->addDays((int) Configuracao::valor('dias_vencimento', 15))->toDateString(),
            'valor_consumo' => $calculo['valor_consumo'],
            'divida_anterior' => $calculo['divida_anterior'],
            'divida_anterior_incluida' => false,
            'multa' => $calculo['multa'],
            'total_pagar' => $calculo['total_pagar'],
            'estado' => 'pendente',
            'gerada_por' => $geradaPor,
        ]);
    }

    public static function proximoNumero(int $ano): string
    {
        // withTrashed(): uma factura anulada e movida para a lixeira ainda
        // ocupa o número — ignorá-la geraria um número duplicado.
        return NumeracaoDocumentos::proximoNumero(
            Factura::withTrashed()->where('numero_factura', 'like', "FAT-{$ano}-%"),
            'numero_factura',
            "FAT-{$ano}-%04d",
        );
    }

    public static function facturarAoConfirmar(): bool
    {
        return Configuracao::ligado('email_facturar_ao_confirmar', true);
    }

    public static function enviarAoEmitir(): bool
    {
        return Configuracao::ligado('email_enviar_ao_emitir', true);
    }

    /**
     * Manda por email as facturas dadas aos clientes que têm email (depois de a
     * página responder, sem fazer esperar). Quem não tem email fica de fora.
     *
     * @param  iterable<Factura>  $facturas
     * @return array{total: int, comEmail: int, semEmail: int}
     */
    public static function enviarPorEmail(iterable $facturas, ?int $userId, bool $forcar = false): array
    {
        $todas = collect($facturas)->each(fn (Factura $f) => $f->loadMissing(['cliente' => fn ($q) => $q->withTrashed()]));
        $comEmail = $todas->filter(fn (Factura $f) => filled($f->cliente?->email))->values();
        $resultado = ['total' => $todas->count(), 'comEmail' => $comEmail->count(), 'semEmail' => $todas->count() - $comEmail->count()];

        if (($forcar || self::enviarAoEmitir()) && $comEmail->isNotEmpty()) {
            $origem = $forcar ? 'manual' : 'automatico'; // forçado = alguém pediu o envio neste lote
            dispatch(fn () => FacturaEmail::enviarVarias($comEmail, $userId, $origem))->afterResponse();
        } else {
            $resultado['comEmail'] = 0; // nada vai sair
        }

        return $resultado;
    }

    /**
     * Quando uma leitura é confirmada, emite logo a factura (se ligado) e
     * manda-a por email. Devolve as facturas emitidas. Leituras que já têm
     * factura, ou cujo cliente não tem tarifa, são ignoradas.
     *
     * @param  Collection<int, Leitura>  $leituras  já confirmadas
     * @return Collection<int, Factura>
     */
    public static function aoConfirmar(Collection $leituras, int $userId): Collection
    {
        if (! self::facturarAoConfirmar()) {
            return collect();
        }

        $emitidas = DB::transaction(function () use ($leituras, $userId) {
            return Leitura::with('cliente.tarifa', 'factura')->whereIn('id', $leituras->pluck('id'))->get()
                ->filter(fn (Leitura $l) => ! $l->factura && $l->cliente?->tarifa)
                ->sortBy(fn (Leitura $l) => $l->ano * 100 + $l->mes) // do mais antigo para o mais recente: a dívida anterior sai certa
                ->map(fn (Leitura $l) => self::emitir($l, $userId))
                ->values();
        });

        self::enviarPorEmail($emitidas, $userId);

        return $emitidas;
    }
}
