<?php

namespace App\Support;

use App\Mail\FacturaMail;
use App\Models\Factura;

/** Envia a factura por email ao cliente e regista o resultado (enviado ou falhou, e porquê). */
class FacturaEmail
{
    /**
     * @param  string  $origem  'automatico' (ao confirmar/emitir) ou 'manual' (alguém carregou no botão)
     * @return array{ok: bool, mensagem: string}
     */
    public static function enviar(Factura $factura, ?int $enviadoPor = null, string $origem = 'manual'): array
    {
        $factura->loadMissing(['cliente' => fn ($q) => $q->withTrashed(), 'leitura' => fn ($q) => $q->withTrashed()]);
        $email = trim((string) $factura->cliente?->email);

        if ($email === '') {
            return ['ok' => false, 'mensagem' => 'O cliente não tem email registado.'];
        }
        if ($factura->estado === 'anulada') {
            return ['ok' => false, 'mensagem' => 'Uma factura anulada não se envia.'];
        }

        $envio = RegistoEmail::enviar(new FacturaMail($factura), $email, [
            'tipo' => 'factura', 'origem' => $origem, 'cliente_id' => $factura->cliente_id, 'factura_id' => $factura->id, 'enviado_por' => $enviadoPor,
        ]);

        return $envio->estado === 'enviado'
            ? ['ok' => true, 'mensagem' => "Factura enviada para {$email}."]
            : ['ok' => false, 'mensagem' => 'Não foi possível enviar o email: '.mb_substr((string) $envio->erro, 0, 160)];
    }

    /**
     * Envia várias (uma a uma, sem parar se alguma falhar).
     *
     * @param  iterable<Factura>  $facturas
     * @return array{enviadas: int, falharam: int, semEmail: int}
     */
    public static function enviarVarias(iterable $facturas, ?int $enviadoPor = null, string $origem = 'manual'): array
    {
        $r = ['enviadas' => 0, 'falharam' => 0, 'semEmail' => 0];

        foreach ($facturas as $factura) {
            $factura->loadMissing('cliente');
            if (! filled($factura->cliente?->email)) {
                $r['semEmail']++;

                continue;
            }
            self::enviar($factura, $enviadoPor, $origem)['ok'] ? $r['enviadas']++ : $r['falharam']++;
        }

        return $r;
    }
}
