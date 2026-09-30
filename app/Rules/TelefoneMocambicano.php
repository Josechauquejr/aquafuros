<?php

namespace App\Rules;

use App\Support\Telefone;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Telefone moçambicano — móvel com 9 dígitos a começar por 82–87, ou fixo
 * com 8 dígitos a começar por 2, com ou sem o indicativo +258. Aceita
 * qualquer espaçamento/pontuação de entrada; só a sequência de dígitos é
 * validada.
 */
class TelefoneMocambicano implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (blank($value)) {
            return;
        }

        if (! Telefone::valido(Telefone::normalizar($value))) {
            $fail('O :attribute deve ser um telemóvel de 9 dígitos (ex.: 84 000 0000) ou um fixo de 8 dígitos (ex.: 21 000 000).');
        }
    }
}
