<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Número de telemóvel moçambicano — 9 dígitos a começar por 8[2-7], com ou
 * sem o indicativo +258. Aceita qualquer espaçamento/pontuação de entrada
 * (ex.: "84 000 0000", "+258 84 000 0000"), só a sequência de dígitos é
 * validada.
 */
class TelefoneMocambicano implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (blank($value)) {
            return;
        }

        $digitos = preg_replace('/\D+/', '', (string) $value);
        $semIndicativo = str_starts_with($digitos, '258') ? substr($digitos, 3) : $digitos;

        if (! preg_match('/^8[2-7]\d{7}$/', $semIndicativo)) {
            $fail('O :attribute deve ser um número de telemóvel moçambicano válido, com 9 dígitos (ex.: 84 000 0000).');
        }
    }
}
