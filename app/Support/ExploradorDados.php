<?php

namespace App\Support;

use Illuminate\Support\Facades\Schema;

/**
 * Metadados da base de dados para o explorador do Desenvolvedor (só leitura).
 * Nunca recebe SQL de ninguém: os nomes de tabelas e colunas que chegam do
 * pedido são sempre validados contra o que o esquema realmente tem.
 */
class ExploradorDados
{
    /** Colunas cujo valor nunca sai da base de dados por esta ferramenta. */
    private const SENSIVEIS = ['password', 'remember_token', 'token', 'secret', 'api_key', 'payload', 'refresh_token'];

    public const MASCARA = '••••';

    private static ?array $tabelas = null;

    private static array $colunas = [];

    private static array $chavesEstrangeiras = [];

    /** @return array<int, array{name: string, size: ?int}> */
    public static function tabelas(): array
    {
        return self::$tabelas ??= collect(Schema::getTables())
            ->filter(fn ($t) => ! isset($t['schema']) || in_array($t['schema'], [null, '', 'public', 'main'], true))
            ->map(fn ($t) => ['name' => $t['name'], 'size' => $t['size'] ?? null])
            ->sortBy('name')->values()->all();
    }

    public static function existe(string $tabela): bool
    {
        return collect(self::tabelas())->contains('name', $tabela);
    }

    /** @return array<int, array{name: string, type: string, nullable: bool, sensivel: bool}> */
    public static function colunas(string $tabela): array
    {
        return self::$colunas[$tabela] ??= collect(Schema::getColumns($tabela))
            ->map(fn ($c) => [
                'name' => $c['name'],
                'type' => $c['type_name'] ?? $c['type'],
                'nullable' => (bool) $c['nullable'],
                'sensivel' => self::ehSensivel($tabela, $c['name']),
            ])->all();
    }

    public static function ehSensivel(string $tabela, string $coluna): bool
    {
        $nome = mb_strtolower($coluna);
        foreach (self::SENSIVEIS as $palavra) {
            if (str_contains($nome, $palavra)) {
                return true;
            }
        }

        return $tabela === 'cache' && $nome === 'value';
    }

    /** Colunas que se podem mostrar, pesquisar, ordenar e exportar. */
    public static function colunasVisiveis(string $tabela): array
    {
        return array_values(array_map(fn ($c) => $c['name'], array_filter(self::colunas($tabela), fn ($c) => ! $c['sensivel'])));
    }

    /** Colunas de texto (ou convertíveis para texto) onde a pesquisa procura. */
    public static function colunasPesquisaveis(string $tabela): array
    {
        return array_values(array_map(
            fn ($c) => $c['name'],
            array_filter(self::colunas($tabela), fn ($c) => ! $c['sensivel'] && ! preg_match('/json|blob|bytea|binary/i', $c['type'])),
        ));
    }

    /** Chave primária de uma só coluna, se existir. */
    public static function chavePrimaria(string $tabela): ?string
    {
        $pk = collect(Schema::getIndexes($tabela))->firstWhere('primary', true);

        return $pk && count($pk['columns']) === 1 ? $pk['columns'][0] : null;
    }

    /** @return array<int, array{coluna: string, tabela: string, destino: string}> chaves estrangeiras DESTA tabela */
    public static function chavesEstrangeiras(string $tabela): array
    {
        return self::$chavesEstrangeiras[$tabela] ??= collect(Schema::getForeignKeys($tabela))
            ->filter(fn ($fk) => count($fk['columns']) === 1)
            ->map(fn ($fk) => ['coluna' => $fk['columns'][0], 'tabela' => $fk['foreign_table'], 'destino' => $fk['foreign_columns'][0]])
            ->values()->all();
    }

    /** Todas as relações da base de dados: tabela.coluna → tabela_destino.coluna. */
    public static function relacoes(): array
    {
        $todas = [];
        foreach (self::tabelas() as $t) {
            foreach (self::chavesEstrangeiras($t['name']) as $fk) {
                $todas[] = ['origem' => $t['name'], 'coluna' => $fk['coluna'], 'destino' => $fk['tabela'], 'chave' => $fk['destino']];
            }
        }

        return $todas;
    }

    /** Valor pronto a mostrar: segredos mascarados e textos longos cortados (a menos que $completo). */
    public static function valor(string $tabela, string $coluna, mixed $valor, bool $completo = false): mixed
    {
        if (self::ehSensivel($tabela, $coluna)) {
            return $valor === null ? null : self::MASCARA;
        }
        if (is_string($valor) && ! $completo && mb_strlen($valor) > 160) {
            return mb_substr($valor, 0, 160).'…';
        }

        return $valor;
    }
}
