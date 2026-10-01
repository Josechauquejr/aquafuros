<?php

namespace App\Support;

use App\Models\User;

/** A novidade do sistema que o utilizador ainda não viu (config/novidades.php). */
class Novidades
{
    /** @return array{id: string, data: string, titulo: string, resumo: ?string, novidades: array<int, array{titulo: string, texto: string}>}|null */
    public static function pendente(?User $user): ?array
    {
        $ultima = collect(config('novidades', []))->last();

        if (! $user || ! $ultima || $user->novidade_vista === $ultima['id']) {
            return null;
        }

        $papeis = $user->getRoleNames();
        $itens = collect($ultima['novidades'])
            ->filter(fn ($n) => empty($n['roles']) || $papeis->intersect($n['roles'])->isNotEmpty())
            ->map(fn ($n) => ['titulo' => $n['titulo'], 'texto' => $n['texto']])
            ->values()
            ->all();

        if ($itens === []) {
            return null;
        }

        return [
            'id' => $ultima['id'],
            'data' => $ultima['data'],
            'titulo' => $ultima['titulo'],
            'resumo' => $ultima['resumo'] ?? null,
            'novidades' => $itens,
        ];
    }

    public static function marcarVista(User $user): void
    {
        $ultima = collect(config('novidades', []))->last();

        if ($ultima) {
            $user->forceFill(['novidade_vista' => $ultima['id']])->saveQuietly();
        }
    }
}
