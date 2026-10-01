<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Verificações de integridade dos dados (SÓ LEITURA): cada uma é uma consulta
 * nomeada que devolve os registos suspeitos. Não corrigem nada — mostram o
 * que está errado e onde, para decidir com calma. Em PostgreSQL cada consulta
 * tem um limite de tempo, para nunca pesar sobre a produção.
 */
class VerificacoesIntegridade
{
    private const LIMITE_MS = 10000;

    private const AMOSTRA = 100;

    /** Soma dos pagamentos activos (não estornados) de uma factura. */
    private const PAGO = '(select coalesce(sum(p.valor_pago), 0) from pagamentos p where p.factura_id = facturas.id and p.deleted_at is null)';

    /** @return array<string, array{titulo: string, descricao: string, gravidade: string, tabela: string, consulta: \Closure, formato: \Closure}> */
    public static function todas(): array
    {
        $dinheiro = fn ($v) => number_format((float) $v, 2, ',', ' ').' MZN';

        return [
            'pagamentos_sem_factura' => [
                'titulo' => 'Pagamentos sem factura', 'gravidade' => 'alto', 'tabela' => 'pagamentos',
                'descricao' => 'Pagamentos activos que apontam para uma factura que não existe.',
                'consulta' => fn () => DB::table('pagamentos')->whereNull('deleted_at')->whereNotNull('factura_id')
                    ->whereRaw('not exists (select 1 from facturas f where f.id = pagamentos.factura_id)')
                    ->select('id', 'numero_recibo', 'valor_pago', 'factura_id'),
                'formato' => fn ($r) => "Recibo {$r->numero_recibo}, {$dinheiro($r->valor_pago)}, factura #{$r->factura_id} inexistente",
            ],
            'pagamentos_de_factura_removida' => [
                'titulo' => 'Pagamentos de facturas na lixeira', 'gravidade' => 'alto', 'tabela' => 'pagamentos',
                'descricao' => 'Pagamentos activos cuja factura foi para a lixeira: o dinheiro entrou mas a factura "desapareceu".',
                'consulta' => fn () => DB::table('pagamentos')->whereNull('deleted_at')
                    ->whereRaw('exists (select 1 from facturas f where f.id = pagamentos.factura_id and f.deleted_at is not null)')
                    ->select('id', 'numero_recibo', 'valor_pago', 'factura_id'),
                'formato' => fn ($r) => "Recibo {$r->numero_recibo}, {$dinheiro($r->valor_pago)}, factura #{$r->factura_id} na lixeira",
            ],
            'pagamentos_sem_cliente' => [
                'titulo' => 'Pagamentos sem cliente', 'gravidade' => 'alto', 'tabela' => 'pagamentos',
                'descricao' => 'Pagamentos activos cujo cliente não existe.',
                'consulta' => fn () => DB::table('pagamentos')->whereNull('deleted_at')
                    ->whereRaw('not exists (select 1 from clientes c where c.id = pagamentos.cliente_id)')
                    ->select('id', 'numero_recibo', 'cliente_id'),
                'formato' => fn ($r) => "Recibo {$r->numero_recibo}, cliente #{$r->cliente_id} inexistente",
            ],
            'pagamentos_valor_invalido' => [
                'titulo' => 'Pagamentos com valor zero ou negativo', 'gravidade' => 'alto', 'tabela' => 'pagamentos',
                'descricao' => 'Um pagamento activo tem de ter valor positivo.',
                'consulta' => fn () => DB::table('pagamentos')->whereNull('deleted_at')->where('valor_pago', '<=', 0)->select('id', 'numero_recibo', 'valor_pago'),
                'formato' => fn ($r) => "Recibo {$r->numero_recibo}, valor {$dinheiro($r->valor_pago)}",
            ],
            'recibos_em_varios_clientes' => [
                'titulo' => 'Mesmo recibo em clientes diferentes', 'gravidade' => 'alto', 'tabela' => 'pagamentos',
                'descricao' => 'O mesmo número de recibo só pode repetir-se dentro do mesmo pagamento em lote, do mesmo cliente.',
                'consulta' => fn () => DB::table('pagamentos')->whereNotNull('numero_recibo')
                    ->groupBy('numero_recibo')->havingRaw('count(distinct cliente_id) > 1')
                    ->select(DB::raw('min(id) as id'), 'numero_recibo', DB::raw('count(distinct cliente_id) as clientes')),
                'formato' => fn ($r) => "Recibo {$r->numero_recibo} usado por {$r->clientes} clientes",
            ],
            'facturas_sem_cliente' => [
                'titulo' => 'Facturas sem cliente', 'gravidade' => 'alto', 'tabela' => 'facturas',
                'descricao' => 'Facturas activas cujo cliente não existe.',
                'consulta' => fn () => DB::table('facturas')->whereNull('deleted_at')
                    ->whereRaw('not exists (select 1 from clientes c where c.id = facturas.cliente_id)')
                    ->select('id', 'numero_factura', 'cliente_id'),
                'formato' => fn ($r) => "Factura {$r->numero_factura}, cliente #{$r->cliente_id} inexistente",
            ],
            'facturas_de_cliente_removido' => [
                'titulo' => 'Facturas activas de clientes na lixeira', 'gravidade' => 'medio', 'tabela' => 'facturas',
                'descricao' => 'Ao remover um cliente as facturas deviam ir com ele; estas ficaram activas.',
                'consulta' => fn () => DB::table('facturas')->whereNull('deleted_at')
                    ->whereRaw('exists (select 1 from clientes c where c.id = facturas.cliente_id and c.deleted_at is not null)')
                    ->select('id', 'numero_factura', 'cliente_id', 'estado'),
                'formato' => fn ($r) => "Factura {$r->numero_factura} ({$r->estado}), cliente #{$r->cliente_id} na lixeira",
            ],
            'facturas_consumo_sem_leitura' => [
                'titulo' => 'Facturas de consumo sem leitura', 'gravidade' => 'medio', 'tabela' => 'facturas',
                'descricao' => 'Uma factura de consumo devia nascer sempre de uma leitura.',
                'consulta' => fn () => DB::table('facturas')->whereNull('deleted_at')->where('tipo', 'consumo')
                    ->where(fn ($q) => $q->whereNull('leitura_id')->orWhereRaw('not exists (select 1 from leituras l where l.id = facturas.leitura_id)'))
                    ->select('id', 'numero_factura', 'leitura_id'),
                'formato' => fn ($r) => "Factura {$r->numero_factura}, leitura ".($r->leitura_id ? "#{$r->leitura_id} inexistente" : 'não indicada'),
            ],
            'facturas_total_nao_bate' => [
                'titulo' => 'Total da factura não bate com as parcelas', 'gravidade' => 'alto', 'tabela' => 'facturas',
                'descricao' => 'Numa factura de consumo, o total deve ser consumo + multa (mais a dívida anterior só nas facturas antigas que a incluíam).',
                'consulta' => fn () => DB::table('facturas')->whereNull('deleted_at')->where('tipo', 'consumo')
                    ->whereRaw('abs(total_pagar - (valor_consumo + multa + (case when divida_anterior_incluida then divida_anterior else 0 end))) > 0.01')
                    ->select('id', 'numero_factura', 'total_pagar', 'valor_consumo', 'multa'),
                'formato' => fn ($r) => "Factura {$r->numero_factura}: total {$dinheiro($r->total_pagar)} ≠ consumo {$dinheiro($r->valor_consumo)} + multa {$dinheiro($r->multa)}",
            ],
            'facturas_total_negativo' => [
                'titulo' => 'Facturas com total negativo', 'gravidade' => 'alto', 'tabela' => 'facturas',
                'descricao' => 'Nenhuma factura devia ter total negativo.',
                'consulta' => fn () => DB::table('facturas')->whereNull('deleted_at')->where('total_pagar', '<', 0)->select('id', 'numero_factura', 'total_pagar'),
                'formato' => fn ($r) => "Factura {$r->numero_factura}, total {$dinheiro($r->total_pagar)}",
            ],
            'facturas_paga_sem_pagamento' => [
                'titulo' => 'Facturas "paga" com pagamentos a menos', 'gravidade' => 'alto', 'tabela' => 'facturas',
                'descricao' => 'Estado "paga" mas a soma dos pagamentos activos é inferior ao total.',
                'consulta' => fn () => DB::table('facturas')->whereNull('deleted_at')->where('estado', 'paga')
                    ->whereRaw(self::PAGO.' < total_pagar - 0.01')
                    ->select('id', 'numero_factura', 'total_pagar', DB::raw(self::PAGO.' as pago')),
                'formato' => fn ($r) => "Factura {$r->numero_factura}: total {$dinheiro($r->total_pagar)}, pago {$dinheiro($r->pago)}",
            ],
            'facturas_pendente_com_pagamentos' => [
                'titulo' => 'Facturas "pendente" que já têm pagamentos', 'gravidade' => 'medio', 'tabela' => 'facturas',
                'descricao' => 'Estado "pendente" mas existem pagamentos activos: devia estar parcial ou paga.',
                'consulta' => fn () => DB::table('facturas')->whereNull('deleted_at')->where('estado', 'pendente')
                    ->whereRaw(self::PAGO.' > 0')
                    ->select('id', 'numero_factura', 'total_pagar', DB::raw(self::PAGO.' as pago')),
                'formato' => fn ($r) => "Factura {$r->numero_factura}: total {$dinheiro($r->total_pagar)}, pago {$dinheiro($r->pago)}",
            ],
            'facturas_parcial_incoerente' => [
                'titulo' => 'Facturas "parcial" incoerentes', 'gravidade' => 'medio', 'tabela' => 'facturas',
                'descricao' => 'Estado "parcial" sem pagamentos, ou com pagamentos que já cobrem o total.',
                'consulta' => fn () => DB::table('facturas')->whereNull('deleted_at')->where('estado', 'parcial')
                    ->whereRaw('('.self::PAGO.' <= 0 or '.self::PAGO.' >= total_pagar - 0.01)')
                    ->select('id', 'numero_factura', 'total_pagar', DB::raw(self::PAGO.' as pago')),
                'formato' => fn ($r) => "Factura {$r->numero_factura}: total {$dinheiro($r->total_pagar)}, pago {$dinheiro($r->pago)}",
            ],
            'facturas_anuladas_com_pagamentos' => [
                'titulo' => 'Facturas anuladas com pagamentos activos', 'gravidade' => 'alto', 'tabela' => 'facturas',
                'descricao' => 'Uma factura anulada não pode ter pagamentos por estornar.',
                'consulta' => fn () => DB::table('facturas')->whereNull('deleted_at')->where('estado', 'anulada')
                    ->whereRaw(self::PAGO.' > 0')
                    ->select('id', 'numero_factura', DB::raw(self::PAGO.' as pago')),
                'formato' => fn ($r) => "Factura {$r->numero_factura} anulada, com {$dinheiro($r->pago)} em pagamentos",
            ],
            'facturas_numero_duplicado' => [
                'titulo' => 'Números de factura duplicados', 'gravidade' => 'alto', 'tabela' => 'facturas',
                'descricao' => 'Cada número de factura deve ser único (a lixeira conta).',
                'consulta' => fn () => DB::table('facturas')->groupBy('numero_factura')->havingRaw('count(*) > 1')
                    ->select(DB::raw('min(id) as id'), 'numero_factura', DB::raw('count(*) as vezes')),
                'formato' => fn ($r) => "Número {$r->numero_factura} usado {$r->vezes} vezes",
            ],
            'leituras_duplicadas' => [
                'titulo' => 'Leituras duplicadas no mesmo mês', 'gravidade' => 'alto', 'tabela' => 'leituras',
                'descricao' => 'Mais de uma leitura activa do mesmo cliente no mesmo mês e ano.',
                'consulta' => fn () => DB::table('leituras')->whereNull('deleted_at')->groupBy('cliente_id', 'mes', 'ano')->havingRaw('count(*) > 1')
                    ->select(DB::raw('min(id) as id'), 'cliente_id', 'mes', 'ano', DB::raw('count(*) as vezes')),
                'formato' => fn ($r) => "Cliente #{$r->cliente_id}, {$r->mes}/{$r->ano}: {$r->vezes} leituras",
            ],
            'leituras_invalidas' => [
                'titulo' => 'Leituras com valor actual menor que o anterior', 'gravidade' => 'alto', 'tabela' => 'leituras',
                'descricao' => 'O contador não anda para trás: o consumo calculado seria negativo.',
                'consulta' => fn () => DB::table('leituras')->whereNull('deleted_at')->whereRaw('leitura_actual < leitura_anterior')
                    ->select('id', 'cliente_id', 'mes', 'ano', 'leitura_anterior', 'leitura_actual'),
                'formato' => fn ($r) => "Cliente #{$r->cliente_id}, {$r->mes}/{$r->ano}: {$r->leitura_anterior} → {$r->leitura_actual}",
            ],
            'leituras_de_cliente_removido' => [
                'titulo' => 'Leituras activas de clientes na lixeira', 'gravidade' => 'medio', 'tabela' => 'leituras',
                'descricao' => 'Ao remover um cliente as leituras deviam ir com ele.',
                'consulta' => fn () => DB::table('leituras')->whereNull('deleted_at')
                    ->whereRaw('exists (select 1 from clientes c where c.id = leituras.cliente_id and c.deleted_at is not null)')
                    ->select('id', 'cliente_id', 'mes', 'ano'),
                'formato' => fn ($r) => "Leitura {$r->mes}/{$r->ano}, cliente #{$r->cliente_id} na lixeira",
            ],
            'leituras_por_facturar' => [
                'titulo' => 'Leituras confirmadas há mais de 7 dias sem factura', 'gravidade' => 'baixo', 'tabela' => 'leituras',
                'descricao' => 'Confirmada e à espera de factura há demasiado tempo: dinheiro por cobrar.',
                'consulta' => fn () => DB::table('leituras')->whereNull('deleted_at')->where('confirmado', true)->where('created_at', '<', now()->subDays(7))
                    ->whereRaw('not exists (select 1 from facturas f where f.leitura_id = leituras.id and f.deleted_at is null)')
                    ->select('id', 'cliente_id', 'mes', 'ano'),
                'formato' => fn ($r) => "Leitura {$r->mes}/{$r->ano} do cliente #{$r->cliente_id}",
            ],
            'clientes_sem_tarifa' => [
                'titulo' => 'Clientes sem tarifa válida', 'gravidade' => 'alto', 'tabela' => 'clientes',
                'descricao' => 'Sem tarifa não é possível calcular o consumo.',
                'consulta' => fn () => DB::table('clientes')->whereNull('deleted_at')
                    ->where(fn ($q) => $q->whereNull('tarifa_id')->orWhereRaw('not exists (select 1 from tarifas t where t.id = clientes.tarifa_id)'))
                    ->select('id', 'numero_cliente', 'nome'),
                'formato' => fn ($r) => "{$r->numero_cliente}: {$r->nome}",
            ],
            'clientes_numero_duplicado' => [
                'titulo' => 'Números de cliente duplicados', 'gravidade' => 'alto', 'tabela' => 'clientes',
                'descricao' => 'Dois clientes activos com o mesmo número.',
                'consulta' => fn () => DB::table('clientes')->whereNull('deleted_at')->groupBy('numero_cliente')->havingRaw('count(*) > 1')
                    ->select(DB::raw('min(id) as id'), 'numero_cliente', DB::raw('count(*) as vezes')),
                'formato' => fn ($r) => "{$r->numero_cliente} usado {$r->vezes} vezes",
            ],
            'clientes_email_invalido' => [
                'titulo' => 'Clientes com email de aspecto inválido', 'gravidade' => 'baixo', 'tabela' => 'clientes',
                'descricao' => 'Os emails de cobrança e de facturas vão falhar para estes clientes.',
                'consulta' => fn () => DB::table('clientes')->whereNull('deleted_at')->whereNotNull('email')->where('email', '<>', '')
                    ->where('email', 'not like', '%_@_%._%')->select('id', 'numero_cliente', 'nome', 'email'),
                'formato' => fn ($r) => "{$r->numero_cliente}: {$r->nome} ({$r->email})",
            ],
            'utilizadores_sem_papel' => [
                'titulo' => 'Utilizadores sem papel', 'gravidade' => 'alto', 'tabela' => 'users',
                'descricao' => 'Utilizadores activos sem nenhum papel: entram mas não conseguem fazer nada.',
                'consulta' => fn () => DB::table('users')->whereNull('deleted_at')
                    ->whereRaw('not exists (select 1 from model_has_roles m where m.model_id = users.id and m.model_type = ?)', [User::class])
                    ->select('id', 'name', 'username'),
                'formato' => fn ($r) => "{$r->name} ({$r->username})",
            ],
        ];
    }

    /** Corre todas as verificações (só contagens). @return array<int, array> */
    public static function resumo(): array
    {
        return collect(self::todas())->map(function ($v, $chave) {
            [$total, $erro] = self::contar($v['consulta']);

            return ['chave' => $chave, 'titulo' => $v['titulo'], 'descricao' => $v['descricao'], 'gravidade' => $v['gravidade'], 'tabela' => $v['tabela'], 'total' => $total, 'erro' => $erro];
        })->values()->all();
    }

    /** Os registos afectados por uma verificação (até AMOSTRA). @return array{verificacao: array, total: ?int, registos: array, erro: ?string}|null */
    public static function detalhe(string $chave): ?array
    {
        $v = self::todas()[$chave] ?? null;
        if (! $v) {
            return null;
        }

        [$total, $erro] = self::contar($v['consulta']);
        $registos = [];
        if (! $erro && $total > 0) {
            [$linhas, $erro] = self::limitado(fn () => $v['consulta']()->limit(self::AMOSTRA)->get());
            foreach ($linhas ?? [] as $linha) {
                $registos[] = ['id' => $linha->id, 'resumo' => ($v['formato'])($linha)];
            }
        }

        return [
            'verificacao' => ['chave' => $chave, 'titulo' => $v['titulo'], 'descricao' => $v['descricao'], 'gravidade' => $v['gravidade'], 'tabela' => $v['tabela']],
            'total' => $total,
            'registos' => $registos,
            'amostra' => self::AMOSTRA,
            'erro' => $erro,
        ];
    }

    /** @return array{0: ?int, 1: ?string} */
    private static function contar(\Closure $consulta): array
    {
        [$total, $erro] = self::limitado(fn () => DB::query()->fromSub($consulta(), 'x')->count());

        return [$total, $erro];
    }

    /** Corre a consulta com limite de tempo (PostgreSQL) e sem nunca partir a página. @return array{0: mixed, 1: ?string} */
    private static function limitado(\Closure $fn): array
    {
        try {
            if (DB::getDriverName() === 'pgsql') {
                return [DB::transaction(function () use ($fn) {
                    DB::statement('set local statement_timeout = '.self::LIMITE_MS);

                    return $fn();
                }), null];
            }

            return [$fn(), null];
        } catch (\Throwable $e) {
            return [null, str_contains($e->getMessage(), 'statement timeout') ? 'A consulta excedeu o limite de tempo.' : 'Não foi possível verificar: '.mb_substr($e->getMessage(), 0, 160)];
        }
    }
}
