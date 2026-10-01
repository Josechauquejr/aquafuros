<?php

namespace App\Support;

use App\Models\Cliente;
use App\Models\Configuracao;
use App\Models\Factura;
use App\Models\FechoCaixa;
use App\Models\Leitura;
use App\Models\Pagamento;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Spatie\Activitylog\Models\Activity;

/**
 * Risco de cobrança, cobertura operacional e controlo (auditoria) — tudo
 * calculado com dados que já existem. O risco e a cobertura são do gestor e
 * do administrador; o controlo é só do administrador.
 */
class AnaliseRisco
{
    /**
     * Clientes com facturas vencidas por pagar: quantos, quantos com 2+ / 3+,
     * quem está a ponto de ser cortado (dívida em atraso ≥ limiar da tarifa)
     * e quem deixou de pagar há 3 meses. Situação de agora.
     */
    public static function risco(): array
    {
        $vencidas = Factura::whereIn('estado', ['pendente', 'parcial'])
            ->where('data_vencimento', '<', now()->toDateString())
            ->withSum('pagamentos', 'valor_pago')
            ->get(['id', 'cliente_id', 'total_pagar']);

        $porCliente = $vencidas->groupBy('cliente_id')->map(fn ($facturas) => [
            'facturas' => $facturas->count(),
            'valor' => round((float) $facturas->sum(fn ($f) => max(0, (float) $f->total_pagar - (float) ($f->pagamentos_sum_valor_pago ?? 0))), 2),
        ]);

        $activos = Cliente::where('estado', 'ativo')->count();
        $clientes = Cliente::withTrashed()->with('tarifa')->whereIn('id', $porCliente->keys())->get()->keyBy('id');

        $emRisco = $porCliente
            ->filter(fn ($dados, $id) => ($c = $clientes->get($id))
                && $c->estado === 'ativo' && $c->tarifa && $dados['valor'] >= (float) $c->tarifa->limiar_corte)
            ->map(fn ($dados, $id) => ['cliente' => $clientes[$id]->nome, 'valor' => $dados['valor'], 'facturas' => $dados['facturas']])
            ->sortByDesc('valor')->values();

        $limite = now()->subMonths(3);
        $semPagar = Cliente::where('estado', 'ativo')
            ->where(fn ($q) => $q->whereNull('data_adesao')->orWhere('data_adesao', '<=', $limite->toDateString()))
            ->whereHas('facturas', fn ($q) => $q->whereIn('estado', ['pendente', 'parcial']))
            ->whereDoesntHave('pagamentos', fn ($q) => $q->where('pago_em', '>=', $limite))
            ->orderBy('nome')->get(['id', 'nome']);

        return [
            'clientesEmAtraso' => $porCliente->count(),
            'percentagemEmAtraso' => $activos > 0 ? round($porCliente->count() / $activos * 100, 1) : null,
            'com2Vencidas' => $porCliente->where('facturas', '>=', 2)->count(),
            'com3Vencidas' => $porCliente->where('facturas', '>=', 3)->count(),
            'emRiscoCorte' => ['total' => $emRisco->count(), 'valor' => round((float) $emRisco->sum('valor'), 2), 'clientes' => $emRisco->take(10)->all()],
            'semPagar3Meses' => ['total' => $semPagar->count(), 'clientes' => $semPagar->take(10)->pluck('nome')->all()],
        ];
    }

    /**
     * Do mês: eficácia da cobrança por "coorte" (quanto das facturas DESTE mês
     * já foi recebido, até hoje), incumprimento e a cobertura do ciclo
     * leitura → factura.
     */
    public static function mensal(Carbon $mes): array
    {
        $inicio = $mes->copy()->startOfMonth();
        $fim = $mes->copy()->endOfMonth();

        $emitidas = Factura::whereBetween('created_at', [$inicio, $fim])->where('estado', '!=', 'anulada')
            ->withSum('pagamentos', 'valor_pago')
            ->get(['id', 'tipo', 'total_pagar', 'divida_anterior', 'divida_anterior_incluida', 'estado', 'data_vencimento']);

        $facturado = (float) $emitidas->sum(fn ($f) => $f->valorProprio());
        // Cada factura conta no máximo o seu próprio valor (o que pagou a mais por dívida antiga não é desta coorte).
        $recebido = (float) $emitidas->sum(fn ($f) => min((float) ($f->pagamentos_sum_valor_pago ?? 0), $f->valorProprio()));
        $emAtraso = $emitidas->filter(fn ($f) => in_array($f->estado, ['pendente', 'parcial'], true)
            && $f->data_vencimento && $f->data_vencimento->lt(now()->startOfDay()))->count();

        $activosNoMes = Cliente::where('estado', 'ativo')
            ->where(fn ($q) => $q->whereNull('data_adesao')->orWhere('data_adesao', '<=', $fim->toDateString()))->count();
        $leituras = Leitura::where('mes', $mes->month)->where('ano', $mes->year)->count();
        $confirmadas = Leitura::where('mes', $mes->month)->where('ano', $mes->year)->where('confirmado', true)->count();
        $facturasConsumo = $emitidas->where('tipo', 'consumo')->count();

        return [
            'eficaciaCoorte' => $facturado > 0 ? round($recebido / $facturado * 100, 1) : null,
            'recebidoCoorte' => round($recebido, 2),
            'facturadoCoorte' => round($facturado, 2),
            'incumprimento' => $emitidas->isEmpty() ? null : round($emAtraso / $emitidas->count() * 100, 1),
            'facturasEmAtraso' => $emAtraso,
            'cobertura' => [
                'clientesActivos' => $activosNoMes,
                'leituras' => $leituras,
                'percentagemLeituras' => $activosNoMes > 0 ? round($leituras / $activosNoMes * 100, 1) : null,
                'leiturasConfirmadas' => $confirmadas,
                'facturasConsumo' => $facturasConsumo,
                'percentagemFacturadas' => $confirmadas > 0 ? round($facturasConsumo / $confirmadas * 100, 1) : null,
            ],
        ];
    }

    /**
     * Ciclo leitura → confirmação → factura: leituras feitas depois do dia
     * limite, tempo que demora cada passo e se quem registou também confirmou.
     */
    public static function ciclo(Carbon $mes): array
    {
        $diaLimite = (int) Configuracao::valor('leituras_dia_limite', 25);
        $limite = Carbon::create($mes->year, $mes->month, min($diaLimite, $mes->daysInMonth))->endOfDay();

        $leituras = Leitura::where('mes', $mes->month)->where('ano', $mes->year)->with('factura')->get();
        $fora = $leituras->filter(fn ($l) => $l->created_at->gt($limite));

        $confirmadas = $leituras->filter(fn ($l) => $l->confirmado_em);
        $horasConfirmar = $confirmadas->map(fn ($l) => $l->created_at->diffInMinutes($l->confirmado_em) / 60);
        $horasFacturar = $confirmadas->filter(fn ($l) => $l->factura)
            ->map(fn ($l) => $l->confirmado_em->diffInMinutes($l->factura->created_at) / 60);

        $comConfirmador = $leituras->filter(fn ($l) => $l->confirmado_por);
        $mesmoUtilizador = $comConfirmador->filter(fn ($l) => $l->confirmado_por === $l->registado_por);

        // Depois do dia limite, quem ainda falta ler.
        $activos = Cliente::where('estado', 'ativo')->pluck('id');
        $semLeitura = now()->gt($limite) && $mes->isSameMonth(now())
            ? $activos->diff($leituras->pluck('cliente_id'))->count()
            : 0;

        return [
            'diaLimite' => $diaLimite,
            'leituras' => $leituras->count(),
            'foraDoPrazo' => $fora->count(),
            'percentagemForaDoPrazo' => $leituras->isEmpty() ? null : round($fora->count() / $leituras->count() * 100, 1),
            'semLeituraAposLimite' => $semLeitura,
            'horasLeituraAteConfirmar' => $horasConfirmar->isEmpty() ? null : round((float) $horasConfirmar->avg(), 1),
            'horasConfirmarAteFacturar' => $horasFacturar->isEmpty() ? null : round((float) $horasFacturar->avg(), 1),
            'mesmoUtilizador' => [
                'quantidade' => $mesmoUtilizador->count(),
                'percentagem' => $comConfirmador->isEmpty() ? null : round($mesmoUtilizador->count() / $comConfirmador->count() * 100, 1),
            ],
        ];
    }

    /** Do início do ano até ao fim do mês escolhido, face ao mesmo período do ano anterior. */
    public static function acumuladoAno(Carbon $mes): array
    {
        $periodo = function (Carbon $fim) {
            $inicio = $fim->copy()->startOfYear();
            $fim = $fim->copy()->endOfMonth();

            return [
                'facturado' => round((float) Factura::whereBetween('created_at', [$inicio, $fim])->where('estado', '!=', 'anulada')
                    ->sum(DB::raw(Factura::SQL_VALOR_PROPRIO)), 2),
                'recebido' => round((float) Pagamento::whereBetween('pago_em', [$inicio, $fim])->sum('valor_pago'), 2),
            ];
        };

        $actual = $periodo($mes);
        $anterior = $periodo($mes->copy()->subYearNoOverflow());

        return [
            'actual' => $actual,
            'anoPassado' => $anterior,
            'variacaoFacturado' => AnaliseMensal::variacao($actual['facturado'], $anterior['facturado']),
            'variacaoRecebido' => AnaliseMensal::variacao($actual['recebido'], $anterior['recebido']),
        ];
    }

    /**
     * Controlo e auditoria do mês (só administrador): quem anula, quem estorna,
     * pagamentos electrónicos sem referência, edições manuais de facturas e
     * caixas sem fecho. "Anuladas com pagamentos" é histórico — já não se
     * consegue criar, mas pode haver casos antigos.
     */
    public static function controlo(Carbon $mes): array
    {
        $inicio = $mes->copy()->startOfMonth();
        $fim = $mes->copy()->endOfMonth();
        $nome = fn (?int $id) => $id ? (User::withTrashed()->find($id)?->name ?? 'Utilizador removido') : 'Sistema';

        $anuladas = Factura::where('estado', 'anulada')->whereBetween('anulada_em', [$inicio, $fim])
            ->get(['anulada_por', 'total_pagar', 'divida_anterior', 'divida_anterior_incluida']);
        $anulacoes = $anuladas->groupBy('anulada_por')->map(fn ($g, $id) => [
            'utilizador' => $nome($id ?: null), 'quantidade' => $g->count(), 'valor' => round((float) $g->sum(fn ($f) => $f->valorProprio()), 2),
        ])->sortByDesc('quantidade')->values()->all();

        $anuladasComPagamentos = Factura::where('estado', 'anulada')->whereHas('pagamentos')
            ->withSum('pagamentos', 'valor_pago')->with(['cliente' => fn ($q) => $q->withTrashed()])
            ->get(['id', 'numero_factura', 'cliente_id']);

        $estornos = Activity::where('log_name', 'pagamento')->where('event', 'deleted')
            ->whereBetween('created_at', [$inicio, $fim])->get();
        $valoresEstornados = Pagamento::onlyTrashed()->whereIn('id', $estornos->pluck('subject_id'))->pluck('valor_pago', 'id');
        $estornosPorUtilizador = $estornos->groupBy('causer_id')->map(fn ($g, $id) => [
            'utilizador' => $nome($id ?: null),
            'quantidade' => $g->count(),
            'valor' => round((float) $g->sum(fn ($a) => (float) ($valoresEstornados[$a->subject_id] ?? 0)), 2),
        ])->sortByDesc('quantidade')->values()->all();

        $electronicos = Pagamento::whereBetween('pago_em', [$inicio, $fim])->where('origem_credito', false)->where('metodo_pagamento', '!=', 'dinheiro')->get();
        $semReferencia = $electronicos->filter(fn ($p) => trim((string) $p->referencia_pagamento) === '');

        $edicoes = Activity::where('log_name', 'factura')->where('event', 'updated')
            ->whereBetween('created_at', [$inicio, $fim])->get()
            ->filter(fn ($a) => array_intersect(array_keys($a->properties['attributes'] ?? []), ['multa', 'total_pagar', 'divida_anterior']))
            ->groupBy('causer_id')->map(fn ($g, $id) => ['utilizador' => $nome($id ?: null), 'quantidade' => $g->count()])
            ->sortByDesc('quantidade')->values()->all();

        $hoje = now()->toDateString();
        $fechosDoMes = FechoCaixa::whereBetween('data', [$inicio->toDateString(), $fim->toDateString()])->get()
            ->map(fn ($f) => $f->utilizador_id.'|'.$f->data->toDateString())->all();
        $semFecho = Pagamento::whereBetween('created_at', [$inicio, $fim])->where('origem_credito', false)->whereNotNull('recebido_por')->get()
            ->groupBy(fn ($p) => $p->recebido_por.'|'.$p->created_at->toDateString())
            ->reject(fn ($g, $chave) => in_array($chave, $fechosDoMes, true) || str_ends_with($chave, '|'.$hoje))
            ->map(fn ($g, $chave) => [
                'utilizador' => $nome((int) explode('|', $chave)[0]), 'data' => explode('|', $chave)[1],
                'total' => round((float) $g->sum('valor_pago'), 2),
            ])->sortBy('data')->values();

        $fechos = FechoCaixa::whereBetween('data', [$inicio->toDateString(), $fim->toDateString()])->whereNotNull('diferenca')
            ->where('diferenca', '!=', 0)->with('utilizador')->orderBy('data')->get();
        $diferencasCaixa = [
            'total' => $fechos->count(),
            'soma' => round((float) $fechos->sum('diferenca'), 2),
            'fechos' => $fechos->take(10)->map(fn ($f) => [
                'utilizador' => $f->utilizador?->name ?? 'Utilizador removido',
                'data' => $f->data->toDateString(),
                'contado' => round((float) $f->valor_contado, 2),
                'diferenca' => round((float) $f->diferenca, 2),
            ])->values()->all(),
        ];

        return [
            'diferencasCaixa' => $diferencasCaixa,
            'anulacoes' => $anulacoes,
            'anuladasComPagamentos' => [
                'total' => $anuladasComPagamentos->count(),
                'valor' => round((float) $anuladasComPagamentos->sum('pagamentos_sum_valor_pago'), 2),
                'facturas' => $anuladasComPagamentos->take(5)->map(fn ($f) => [
                    'factura' => $f->numero_factura, 'cliente' => $f->cliente?->nome ?? 'Cliente removido',
                    'pago' => round((float) $f->pagamentos_sum_valor_pago, 2),
                ])->all(),
            ],
            'estornos' => $estornosPorUtilizador,
            'electronicosSemReferencia' => [
                'quantidade' => $semReferencia->count(),
                'valor' => round((float) $semReferencia->sum('valor_pago'), 2),
                'percentagem' => $electronicos->isEmpty() ? null : round($semReferencia->count() / $electronicos->count() * 100, 1),
                'recibos' => $semReferencia->take(5)->pluck('numero_recibo')->all(),
            ],
            'edicoesManuais' => $edicoes,
            'caixasSemFecho' => ['total' => $semFecho->count(), 'dias' => $semFecho->take(10)->all()],
        ];
    }
}
