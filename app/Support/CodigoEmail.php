<?php

namespace App\Support;

use App\Mail\CodigoMail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Códigos de 6 dígitos por email: gera, envia (via RegistoEmail, com registo) e
 * confirma. O código nunca fica guardado em claro — só o hash — e pede-se um novo
 * a cada reenvio. Cada email tem no máximo um código activo por finalidade.
 */
class CodigoEmail
{
    public const VERIFICACAO = 'verificacao';

    public const RECUPERACAO = 'recuperacao';

    public const VALIDADE_MINUTOS = 15;

    public const MAX_TENTATIVAS = 5;

    /** Gera um código novo (substitui o anterior) e envia-o. Devolve se o email saiu. */
    public static function enviar(string $email, string $finalidade): bool
    {
        $codigo = (string) random_int(100000, 999999);

        DB::table('codigos_email')->updateOrInsert(
            ['email' => $email, 'finalidade' => $finalidade],
            ['codigo_hash' => Hash::make($codigo), 'tentativas' => 0, 'expira_em' => now()->addMinutes(self::VALIDADE_MINUTOS), 'created_at' => now(), 'updated_at' => now()],
        );

        $envio = RegistoEmail::enviar(new CodigoMail($codigo, $finalidade, self::VALIDADE_MINUTOS), $email, [
            'tipo' => $finalidade === self::VERIFICACAO ? 'codigo_verificacao' : 'codigo_recuperacao',
            'origem' => 'automatico',
            'sem_corpo' => true, // o corpo tem o código: nunca fica à vista na página "Emails enviados"
        ]);

        return $envio->estado === 'enviado';
    }

    /**
     * Confirma o código; se estiver certo, gasta-o. Senão lança o erro (campo `code`).
     *
     * @throws ValidationException
     */
    public static function confirmar(string $email, string $finalidade, string $introduzido): void
    {
        $codigo = preg_replace('/\D+/', '', $introduzido);
        $linha = DB::table('codigos_email')->where('email', $email)->where('finalidade', $finalidade)->first();

        if (! $linha || now()->greaterThan($linha->expira_em)) {
            throw ValidationException::withMessages(['code' => 'O código expirou ou não existe. Peça um novo.']);
        }
        if ($linha->tentativas >= self::MAX_TENTATIVAS) {
            throw ValidationException::withMessages(['code' => 'Número máximo de tentativas atingido. Peça um novo código.']);
        }
        if (! Hash::check($codigo, $linha->codigo_hash)) {
            DB::table('codigos_email')->where('id', $linha->id)->increment('tentativas');

            throw ValidationException::withMessages(['code' => 'Código inválido.']);
        }

        DB::table('codigos_email')->where('id', $linha->id)->delete();
    }
}
