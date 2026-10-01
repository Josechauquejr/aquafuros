<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Confirmação reforçada de uma acção destrutiva: o Desenvolvedor tem de
 * escrever a palavra pedida. Validada no servidor — o botão desactivado no
 * ecrã nunca é a única barreira.
 */
class ConfirmacaoReforcada
{
    public static function exigir(Request $request, string $palavra): void
    {
        if (trim((string) $request->input('confirmacao')) !== $palavra) {
            throw ValidationException::withMessages(['confirmacao' => "Escreva {$palavra} para confirmar."]);
        }
    }
}
