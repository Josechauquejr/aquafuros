<?php

namespace App\Support;

use App\Mail\FacturaMail;
use App\Models\EnvioEmail;
use App\Models\Factura;
use Illuminate\Support\Facades\Mail;

/** Envia a factura por email ao cliente e regista o resultado (enviado ou falhou, e porquê). */
class FacturaEmail
{
    /**
     * @return array{ok: bool, mensagem: string}
     */
    public static function enviar(Factura $factura, ?int $enviadoPor = null): array
    {
        $factura->loadMissing(['cliente' => fn ($q) => $q->withTrashed(), 'leitura' => fn ($q) => $q->withTrashed()]);
        $email = trim((string) $factura->cliente?->email);

        if ($email === '') {
            return ['ok' => false, 'mensagem' => 'O cliente não tem email registado.'];
        }
        if ($factura->estado === 'anulada') {
            return ['ok' => false, 'mensagem' => 'Uma factura anulada não se envia.'];
        }

        $registo = ['factura_id' => $factura->id, 'cliente_id' => $factura->cliente_id, 'email' => $email, 'enviado_por' => $enviadoPor];

        try {
            Mail::to($email)->send(new FacturaMail($factura));
            EnvioEmail::create([...$registo, 'estado' => 'enviado']);

            return ['ok' => true, 'mensagem' => "Factura enviada para {$email}."];
        } catch (\Throwable $e) {
            EnvioEmail::create([...$registo, 'estado' => 'falhou', 'erro' => mb_substr($e->getMessage(), 0, 250)]);

            return ['ok' => false, 'mensagem' => 'Não foi possível enviar o email: '.mb_substr($e->getMessage(), 0, 160)];
        }
    }

    /**
     * Envia várias (uma a uma, sem parar se alguma falhar).
     *
     * @param  iterable<Factura>  $facturas
     * @return array{enviadas: int, falharam: int, semEmail: int}
     */
    public static function enviarVarias(iterable $facturas, ?int $enviadoPor = null): array
    {
        $r = ['enviadas' => 0, 'falharam' => 0, 'semEmail' => 0];

        foreach ($facturas as $factura) {
            $factura->loadMissing('cliente');
            if (! filled($factura->cliente?->email)) {
                $r['semEmail']++;

                continue;
            }
            self::enviar($factura, $enviadoPor)['ok'] ? $r['enviadas']++ : $r['falharam']++;
        }

        return $r;
    }
}
