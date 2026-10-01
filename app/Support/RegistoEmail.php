<?php

namespace App\Support;

use App\Models\EnvioEmail;
use Illuminate\Mail\Mailable;
use Illuminate\Support\Facades\Mail;

/**
 * Único ponto por onde o sistema envia emails a clientes: envia e deixa o
 * registo completo (para quem, assunto, o que dizia, anexos, se saiu ou falhou,
 * se foi automático ou à mão). É daqui que sai a página "Emails enviados".
 */
class RegistoEmail
{
    /**
     * @param  array{tipo: string, cliente_id: ?int, factura_id?: ?int, origem?: string, enviado_por?: ?int}  $meta
     */
    public static function enviar(Mailable $mail, string $para, array $meta): EnvioEmail
    {
        $assunto = $mail->envelope()->subject;

        try {
            $corpo = $mail->render();
        } catch (\Throwable) {
            $corpo = null; // o corpo é só para consulta: nunca impede o envio
        }

        $anexos = collect($mail->attachments())->map(fn ($a) => $a->as)->filter()->values()->all();

        $registo = [
            'tipo' => $meta['tipo'],
            'origem' => $meta['origem'] ?? 'manual',
            'cliente_id' => $meta['cliente_id'] ?? null,
            'factura_id' => $meta['factura_id'] ?? null,
            'enviado_por' => $meta['enviado_por'] ?? null,
            'email' => $para,
            'assunto' => $assunto,
            'corpo' => $corpo,
            'anexos' => $anexos,
        ];

        $tentativas = 0;
        $erro = null;
        $maxTentativas = 2;

        while ($tentativas < $maxTentativas) {
            $tentativas++;
            try {
                Mail::to($para)->send($mail);

                return EnvioEmail::create([...$registo, 'estado' => 'enviado', 'tentativas' => $tentativas]);
            } catch (\Throwable $e) {
                $erro = $e;
            }
        }

        return EnvioEmail::create([...$registo, 'estado' => 'falhou', 'tentativas' => $tentativas, 'erro' => mb_substr((string) $erro?->getMessage(), 0, 250)]);
    }
}
