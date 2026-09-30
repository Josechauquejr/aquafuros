<?php

namespace App\Support;

/**
 * Telefones moçambicanos: guardados só com dígitos, sem indicativo (+258).
 * Móvel = 9 dígitos a começar por 82–87; fixo = 8 dígitos a começar por 2.
 */
class Telefone
{
    public static function normalizar(mixed $valor): ?string
    {
        if (blank($valor)) {
            return null;
        }

        $digitos = preg_replace('/\D+/', '', (string) $valor);

        if (str_starts_with($digitos, '258') && strlen($digitos) > 9) {
            $digitos = substr($digitos, 3);
        }

        return $digitos === '' ? null : $digitos;
    }

    public static function valido(?string $digitos): bool
    {
        if ($digitos === null) {
            return true;
        }

        return (bool) preg_match('/^8[2-7]\d{7}$/', $digitos)
            || (bool) preg_match('/^2\d{7}$/', $digitos);
    }
}
