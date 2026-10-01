<?php

namespace App\Support;

use App\Models\Cliente;
use App\Models\DevAuditoria;
use App\Models\DevSnapshot;
use App\Models\ErroSistema;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Operações em massa do Desenvolvedor: uma lista FECHADA. Cada uma tem
 * pré-visualização (quantos e quais) e só se executa sobre o MESMO conjunto
 * que foi pré-visualizado: se os dados mudaram entretanto, aborta. As que
 * alteram linhas guardam um snapshot e podem ser desfeitas; as que apagam
 * registos de log são irreversíveis e dizem-no.
 */
class OperacoesMassa
{
    /** Máximo de linhas que uma operação que ALTERA pode tocar de uma vez. */
    public const LIMITE_ALTERAR = 1000;

    public static function todas(): array
    {
        return [
            'limpar_emails_invalidos' => [
                'titulo' => 'Limpar emails de clientes com aspecto inválido',
                'descricao' => 'Põe em branco o email dos clientes activos cujo email não tem a forma nome@dominio.tld (esses envios falham sempre).',
                'tabela' => 'clientes', 'reversivel' => true, 'parametros' => [],
            ],
            'resolver_erros' => [
                'titulo' => 'Marcar erros antigos como resolvidos',
                'descricao' => 'Marca como resolvidos os erros da aplicação ainda por resolver com mais de N dias.',
                'tabela' => 'erros_sistema', 'reversivel' => true,
                'parametros' => [['nome' => 'dias', 'rotulo' => 'Mais antigos que (dias)', 'min' => 1, 'max' => 3650, 'omissao' => 7]],
            ],
            'limpar_acessos' => [
                'titulo' => 'Apagar registos antigos de acessos',
                'descricao' => 'Apaga do registo de acessos (um por pedido) os mais antigos que N dias. Mantém a tabela pequena. IRREVERSÍVEL.',
                'tabela' => 'acessos_sistema', 'reversivel' => false,
                'parametros' => [['nome' => 'dias', 'rotulo' => 'Mais antigos que (dias)', 'min' => 30, 'max' => 3650, 'omissao' => 90]],
            ],
            'limpar_erros_resolvidos' => [
                'titulo' => 'Apagar erros já resolvidos e antigos',
                'descricao' => 'Apaga os erros marcados como resolvidos há mais de N dias. IRREVERSÍVEL.',
                'tabela' => 'erros_sistema', 'reversivel' => false,
                'parametros' => [['nome' => 'dias', 'rotulo' => 'Mais antigos que (dias)', 'min' => 30, 'max' => 3650, 'omissao' => 90]],
            ],
        ];
    }

    /** Valida os parâmetros da operação (limites incluídos). */
    public static function parametros(string $chave, array $entrada): array
    {
        $def = self::todas()[$chave] ?? null;
        abort_if($def === null, 404);

        $regras = [];
        foreach ($def['parametros'] as $p) {
            $regras["parametros.{$p['nome']}"] = "required|integer|min:{$p['min']}|max:{$p['max']}";
        }
        $validos = validator(['parametros' => $entrada], $regras)->validate();

        return array_map('intval', $validos['parametros'] ?? []);
    }

    /** @return QueryBuilder|Builder */
    private static function afectados(string $chave, array $p)
    {
        return match ($chave) {
            'limpar_emails_invalidos' => Cliente::query()->whereNotNull('email')->where('email', '<>', '')->where('email', 'not like', '%_@_%._%'),
            'resolver_erros' => ErroSistema::query()->where('resolvido', false)->where('created_at', '<', now()->subDays($p['dias'])),
            'limpar_acessos' => DB::table('acessos_sistema')->where('created_at', '<', now()->subDays($p['dias'])),
            'limpar_erros_resolvidos' => DB::table('erros_sistema')->where('resolvido', true)->where('created_at', '<', now()->subDays($p['dias'])),
        };
    }

    /** O que vai ser afectado, sem tocar em nada. */
    public static function previa(string $chave, array $p): array
    {
        $def = self::todas()[$chave];
        $q = self::afectados($chave, $p);
        $total = (clone $q)->count();
        $minimo = (clone $q)->min('id');
        $maximo = (clone $q)->max('id');

        $amostra = (clone $q)->orderBy('id')->limit(50)->get()->map(fn ($l) => ['id' => $l->id, 'resumo' => self::resumoDe($chave, $l)])->all();

        return [
            'chave' => $chave,
            'titulo' => $def['titulo'],
            'reversivel' => $def['reversivel'],
            'parametros' => $p,
            'total' => $total,
            'amostra' => $amostra,
            // Impressão digital do conjunto: se mudar até à confirmação, a execução aborta.
            'marca' => sha1(json_encode([$chave, $p, $total, $minimo, $maximo])),
            'recusada' => $def['reversivel'] && $total > self::LIMITE_ALTERAR ? 'São mais de '.self::LIMITE_ALTERAR.' registos: refine os parâmetros para alterar menos de cada vez.' : null,
        ];
    }

    /** Executa SÓ se o conjunto for o mesmo da pré-visualização (mesma marca). */
    public static function executar(string $chave, array $p, string $marca, int $userId): array
    {
        $atual = self::previa($chave, $p);
        if ($atual['marca'] !== $marca) {
            throw ValidationException::withMessages(['marca' => 'Os dados mudaram desde a pré-visualização. Pré-visualize outra vez.']);
        }
        if ($atual['recusada']) {
            throw ValidationException::withMessages(['marca' => $atual['recusada']]);
        }

        $def = self::todas()[$chave];

        return DB::transaction(function () use ($chave, $p, $def, $userId, $atual) {
            if ($def['reversivel']) {
                return self::alterar($chave, $p, $def, $userId);
            }

            $apagados = self::apagarEmLotes($chave, $p);
            $snapshot = DevSnapshot::create([
                'user_id' => $userId, 'acao' => $chave, 'tabela' => $def['tabela'], 'total' => $apagados, 'reversivel' => false,
                'resumo' => ['apagados' => $apagados, 'parametros' => $p],
            ]);
            DevAuditoria::registar("dev.massa.{$chave}.resultado", $def['tabela'], ['apagados' => $apagados, 'parametros' => $p, 'snapshot' => $snapshot->id]);

            return ['total' => $apagados, 'snapshot' => $snapshot->id, 'mensagem' => "{$apagados} registo(s) apagado(s). Não é reversível."];
        });
    }

    private static function alterar(string $chave, array $p, array $def, int $userId): array
    {
        $linhas = [];
        foreach (self::afectados($chave, $p)->orderBy('id')->get() as $registo) {
            [$antes, $depois] = match ($chave) {
                'limpar_emails_invalidos' => [['email' => $registo->email], ['email' => null]],
                'resolver_erros' => [['resolvido' => false], ['resolvido' => true]],
            };
            $registo->update($depois); // via modelo (eventos e registo de actividade)
            $linhas[] = ['id' => $registo->id, 'antes' => $antes, 'depois' => $depois];
        }

        $snapshot = DevSnapshot::create(['user_id' => $userId, 'acao' => $chave, 'tabela' => $def['tabela'], 'total' => count($linhas), 'linhas' => $linhas]);
        DevAuditoria::registar("dev.massa.{$chave}.resultado", $def['tabela'], ['alterados' => count($linhas), 'ids' => array_slice(array_column($linhas, 'id'), 0, 200), 'parametros' => $p, 'snapshot' => $snapshot->id]);

        return ['total' => count($linhas), 'snapshot' => $snapshot->id, 'mensagem' => count($linhas).' registo(s) alterado(s). Pode desfazer no histórico.'];
    }

    private static function apagarEmLotes(string $chave, array $p): int
    {
        $apagados = 0;
        for ($i = 0; $i < 400; $i++) { // no máximo ~2 milhões de linhas por execução
            $ids = self::afectados($chave, $p)->orderBy('id')->limit(5000)->pluck('id');
            if ($ids->isEmpty()) {
                break;
            }
            $tabela = $chave === 'limpar_acessos' ? 'acessos_sistema' : 'erros_sistema';
            $apagados += DB::table($tabela)->whereIn('id', $ids)->delete();
        }

        return $apagados;
    }

    private static function resumoDe(string $chave, object $l): string
    {
        return match ($chave) {
            'limpar_emails_invalidos' => "{$l->numero_cliente}: {$l->nome} ({$l->email})",
            'resolver_erros', 'limpar_erros_resolvidos' => $l->created_at.' · '.mb_substr((string) $l->mensagem, 0, 120),
            'limpar_acessos' => $l->created_at.' · '.$l->metodo.' '.mb_substr((string) parse_url($l->url, PHP_URL_PATH), 0, 80),
        };
    }
}
