<?php

namespace App\Support;

use App\Models\Cliente;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * Pesquisa difusa (fuzzy) para as barras de pesquisa das listas: ignora
 * maiúsculas e acentos, aceita palavras parciais ("anto" → "Antonio") e
 * pequenos erros de escrita ("antonjo", "matsinhee"). Todas as palavras
 * escritas têm de encontrar correspondência (E lógico).
 *
 * Independente do motor de base de dados (a pesquisa corre em PHP sobre as
 * linhas candidatas), por isso dá o mesmo resultado em PostgreSQL e SQLite.
 * O mesmo algoritmo existe no browser em resources/js/lib/busca.js.
 */
class BuscaDifusa
{
    /** Máximo de ids devolvidos — protege o `whereIn` de listas enormes. */
    private const LIMITE = 2000;

    public static function normalizar(?string $texto): string
    {
        $ascii = Str::ascii(mb_strtolower((string) $texto));

        return trim(preg_replace('/[^a-z0-9]+/', ' ', $ascii));
    }

    /**
     * Ids das linhas que correspondem à pesquisa, da melhor para a pior.
     * `null` quando não há pesquisa (nada a filtrar).
     *
     * @param  Collection<int, mixed>  $linhas  modelos/objectos com `id`
     * @param  callable(mixed): string  $texto  texto pesquisável de cada linha
     * @return array<int, int|string>|null
     */
    public static function ids(Collection $linhas, ?string $pesquisa, callable $texto): ?array
    {
        $tokens = array_values(array_filter(explode(' ', self::normalizar($pesquisa))));

        if ($tokens === []) {
            return null;
        }

        $pontuadas = [];

        foreach ($linhas as $linha) {
            $pontuacao = self::pontuar($tokens, self::normalizar($texto($linha)));

            if ($pontuacao !== null) {
                $pontuadas[] = [$linha->id, $pontuacao];
            }
        }

        usort($pontuadas, fn ($a, $b) => $a[1] <=> $b[1]);

        return array_slice(array_column($pontuadas, 0), 0, self::LIMITE);
    }

    /** Ids dos clientes (incluindo os da lixeira) cujo nome corresponde à pesquisa. */
    public static function idsClientes(?string $pesquisa): ?array
    {
        return self::ids(Cliente::withTrashed()->get(['id', 'nome']), $pesquisa, fn ($c) => $c->nome);
    }

    /** Soma das distâncias por palavra pesquisada; `null` se alguma não corresponder. */
    private static function pontuar(array $tokens, string $texto): ?int
    {
        if ($texto === '') {
            return null;
        }

        $palavras = explode(' ', $texto);
        $total = 0;

        foreach ($tokens as $token) {
            $melhor = null;

            foreach ($palavras as $palavra) {
                $distancia = self::distancia($token, $palavra);

                if ($distancia !== null && ($melhor === null || $distancia < $melhor)) {
                    $melhor = $distancia;
                    if ($melhor === 0) {
                        break;
                    }
                }
            }

            if ($melhor === null) {
                return null;
            }

            $total += $melhor;
        }

        return $total;
    }

    private static function tolerancia(string $token): int
    {
        // Números (nº de factura, telefone) e palavras curtas: sem erros.
        if (ctype_digit($token) || strlen($token) <= 3) {
            return 0;
        }

        return strlen($token) <= 6 ? 1 : 2;
    }

    private static function distancia(string $token, string $palavra): ?int
    {
        if (str_contains($palavra, $token)) {
            return 0;
        }

        $tolerancia = self::tolerancia($token);

        if ($tolerancia === 0) {
            return null;
        }

        // Erro de escrita na palavra inteira ou no início dela (pesquisa parcial).
        $tamanho = strlen($token);
        $melhor = levenshtein($token, $palavra);
        $melhor = min($melhor, levenshtein($token, substr($palavra, 0, $tamanho)));

        return $melhor <= $tolerancia ? $melhor : null;
    }
}
