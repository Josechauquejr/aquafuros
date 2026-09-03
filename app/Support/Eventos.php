<?php

namespace App\Support;

/**
 * Traduz os nomes de evento do Spatie Activitylog ("created"/"updated"/
 * "deleted"/"restored") para o verbo em português usado nas descrições do
 * registo de actividade, mostradas ao administrador.
 */
class Eventos
{
    public static function verbo(string $evento): string
    {
        return match ($evento) {
            'created' => 'criado',
            'updated' => 'actualizado',
            'deleted' => 'eliminado',
            'restored' => 'restaurado',
            default => $evento,
        };
    }
}
