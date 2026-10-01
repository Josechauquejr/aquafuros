<?php

namespace App\Support;

use App\Models\Cliente;
use App\Models\ContactoCobranca;
use App\Models\Credito;
use App\Models\Factura;
use App\Models\Leitura;
use App\Models\Notificacao;
use App\Models\Ocorrencia;
use App\Models\Pagamento;
use App\Models\ProducaoAgua;
use App\Models\PromessaPagamento;
use App\Models\Zona;
use Illuminate\Support\Carbon;

/**
 * Indicadores da Fase 3: perdas de água, resultado por zona, cobrança
 * (contactos e promessas), ocorrências, crédito de clientes e mensagens.
 */
class AnaliseOperacional
{
    private static function consumoDe(Leitura $l): float
    {
        return max(0.0, (float) $l->leitura_actual - (float) $l->leitura_anterior);
    }

    /**
     * Perdas = água produzida − água facturada (m³ das leituras com factura válida).
     * Se houver registo do sistema todo usa-o; senão soma o das zonas. Por zona
     * só se compara onde há produção registada nessa zona.
     */
    public static function perdas(Carbon $mes): array
    {
        $producoes = ProducaoAgua::where('mes', $mes->month)->where('ano', $mes->year)->with('zona')->get();
        $leituras = Leitura::where('mes', $mes->month)->where('ano', $mes->year)
            ->whereHas('factura', fn ($q) => $q->where('estado', '!=', 'anulada'))
            ->with('cliente:id,zona_id')->get();

        $facturadoTotal = (float) $leituras->sum(fn ($l) => self::consumoDe($l));
        $global = $producoes->whereNull('zona_id')->first();
        $porZona = $producoes->whereNotNull('zona_id');

        $produzido = $global ? (float) $global->volume_m3 : (float) $porZona->sum('volume_m3');
        // Sem registo do sistema todo, só se compara a água das zonas com produção registada.
        $facturadoComparavel = $global ? $facturadoTotal
            : (float) $leituras->filter(fn ($l) => $porZona->pluck('zona_id')->contains($l->cliente?->zona_id))->sum(fn ($l) => self::consumoDe($l));

        $detalhe = $porZona->map(function ($p) use ($leituras) {
            $fact = (float) $leituras->filter(fn ($l) => $l->cliente?->zona_id === $p->zona_id)->sum(fn ($l) => self::consumoDe($l));
            $prod = (float) $p->volume_m3;

            return [
                'zona' => $p->zona?->nome ?? 'Zona removida',
                'produzidoM3' => round($prod, 2),
                'facturadoM3' => round($fact, 2),
                'perdasPct' => $prod > 0 ? round(($prod - $fact) / $prod * 100, 1) : null,
            ];
        })->values()->all();

        return [
            'temDados' => $produzido > 0,
            'produzidoM3' => round($produzido, 2),
            'facturadoM3' => round($facturadoTotal, 2),
            'perdasM3' => $produzido > 0 ? round($produzido - $facturadoComparavel, 2) : null,
            'perdasPct' => $produzido > 0 ? round(($produzido - $facturadoComparavel) / $produzido * 100, 1) : null,
            'porZona' => $detalhe,
        ];
    }

    /** Resultado do mês por zona: clientes, facturado, recebido, consumo, dívida em atraso e ocorrências abertas. */
    public static function porZona(Carbon $mes): array
    {
        $inicio = $mes->copy()->startOfMonth();
        $fim = $mes->copy()->endOfMonth();
        $nomes = Zona::orderBy('nome')->pluck('nome', 'id');
        $clientes = Cliente::get(['id', 'zona_id', 'estado'])->keyBy('id');
        $zonaDe = fn ($clienteId) => $clientes->get($clienteId)?->zona_id;

        $facturas = Factura::whereBetween('created_at', [$inicio, $fim])->where('estado', '!=', 'anulada')
            ->get(['cliente_id', 'total_pagar', 'divida_anterior', 'divida_anterior_incluida']);
        $pagamentos = Pagamento::whereBetween('pago_em', [$inicio, $fim])->get(['cliente_id', 'valor_pago']);
        $consumos = Leitura::where('mes', $mes->month)->where('ano', $mes->year)->get(['cliente_id', 'leitura_anterior', 'leitura_actual']);
        $vencidas = Factura::whereIn('estado', ['pendente', 'parcial'])->where('data_vencimento', '<', now()->toDateString())
            ->withSum('pagamentos', 'valor_pago')->get(['id', 'cliente_id', 'total_pagar']);
        $ocorrencias = Ocorrencia::where('estado', '!=', 'resolvida')->get(['zona_id']);

        $linha = fn (?int $zonaId, string $nome) => [
            'zona' => $nome,
            'clientes' => $clientes->filter(fn ($c) => $c->zona_id === $zonaId && $c->estado === 'ativo')->count(),
            'facturado' => round((float) $facturas->filter(fn ($f) => $zonaDe($f->cliente_id) === $zonaId)->sum(fn ($f) => $f->valorProprio()), 2),
            'recebido' => round((float) $pagamentos->filter(fn ($p) => $zonaDe($p->cliente_id) === $zonaId)->sum('valor_pago'), 2),
            'consumoM3' => round((float) $consumos->filter(fn ($l) => $zonaDe($l->cliente_id) === $zonaId)->sum(fn ($l) => max(0, (float) $l->leitura_actual - (float) $l->leitura_anterior)), 2),
            'emAtraso' => round((float) $vencidas->filter(fn ($f) => $zonaDe($f->cliente_id) === $zonaId)
                ->sum(fn ($f) => max(0, (float) $f->total_pagar - (float) ($f->pagamentos_sum_valor_pago ?? 0))), 2),
            'ocorrenciasAbertas' => $ocorrencias->where('zona_id', $zonaId)->count(),
        ];

        $linhas = $nomes->map(fn ($nome, $id) => $linha((int) $id, $nome))->values();
        $semZona = $linha(null, 'Sem zona');
        if ($semZona['clientes'] + $semZona['facturado'] + $semZona['recebido'] > 0) {
            $linhas->push($semZona);
        }

        return $linhas->all();
    }

    /** Contactos de cobrança e promessas de pagamento. */
    public static function cobranca(Carbon $mes): array
    {
        PromessaPagamento::avaliarPendentes();
        $inicio = $mes->copy()->startOfMonth();
        $fim = $mes->copy()->endOfMonth();

        $contactos = ContactoCobranca::whereBetween('created_at', [$inicio, $fim])->get();
        $promessas = PromessaPagamento::whereBetween('created_at', [$inicio, $fim])->get();
        $cumpridas = $promessas->where('estado', 'cumprida')->count();
        $falhadas = $promessas->where('estado', 'falhada')->count();

        // Clientes em atraso sem contacto nos últimos 15 dias.
        $emAtraso = Factura::whereIn('estado', ['pendente', 'parcial'])->where('data_vencimento', '<', now()->toDateString())->pluck('cliente_id')->unique();
        $contactados = ContactoCobranca::where('created_at', '>=', now()->subDays(15))->pluck('cliente_id')->unique();

        return [
            'contactos' => $contactos->count(),
            'porResultado' => $contactos->groupBy('resultado')->map->count()->all(),
            'promessasFeitas' => $promessas->count(),
            'promessasCumpridas' => $cumpridas,
            'promessasFalhadas' => $falhadas,
            'promessasPendentes' => $promessas->where('estado', 'pendente')->count(),
            'taxaCumprimento' => ($cumpridas + $falhadas) > 0 ? round($cumpridas / ($cumpridas + $falhadas) * 100, 1) : null,
            'semContacto15d' => $emAtraso->diff($contactados)->count(),
        ];
    }

    /** Ocorrências: abertas, tempos de resposta e onde acontecem. */
    public static function ocorrencias(Carbon $mes): array
    {
        $inicio = $mes->copy()->startOfMonth();
        $fim = $mes->copy()->endOfMonth();

        $doMes = Ocorrencia::whereBetween('reportada_em', [$inicio, $fim])->with('zona')->get();
        $resolvidas = $doMes->where('estado', 'resolvida')->filter(fn ($o) => $o->resolvida_em);
        $iniciadas = $doMes->filter(fn ($o) => $o->iniciada_em);
        $horas = fn ($a, $b) => $a->diffInMinutes($b) / 60;

        return [
            'reportadas' => $doMes->count(),
            'resolvidas' => $resolvidas->count(),
            'abertasAgora' => Ocorrencia::where('estado', '!=', 'resolvida')->count(),
            'maisDe48h' => Ocorrencia::where('estado', '!=', 'resolvida')->where('reportada_em', '<', now()->subHours(48))->count(),
            'horasAteIniciar' => $iniciadas->isEmpty() ? null : round((float) $iniciadas->avg(fn ($o) => $horas($o->reportada_em, $o->iniciada_em)), 1),
            'horasAteResolver' => $resolvidas->isEmpty() ? null : round((float) $resolvidas->avg(fn ($o) => $horas($o->reportada_em, $o->resolvida_em)), 1),
            'porTipo' => $doMes->groupBy('tipo')->map->count()->all(),
            'porZona' => $doMes->groupBy(fn ($o) => $o->zona?->nome ?? 'Sem zona')->map->count()->sortDesc()->all(),
        ];
    }

    /** Crédito de clientes (passivo: dinheiro recebido por conta de facturas futuras) e mensagens. */
    public static function credito(Carbon $mes): array
    {
        $inicio = $mes->copy()->startOfMonth();
        $fim = $mes->copy()->endOfMonth();

        $saldos = Credito::selectRaw('cliente_id, sum(valor) as saldo')->groupBy('cliente_id')->get()->filter(fn ($s) => (float) $s->saldo > 0.004);

        return [
            'saldoTotal' => round((float) $saldos->sum('saldo'), 2),
            'clientesComCredito' => $saldos->count(),
            'entradasMes' => round((float) Credito::where('tipo', 'entrada')->whereBetween('pago_em', [$inicio, $fim])->sum('valor'), 2),
            'usadoMes' => round(abs((float) Credito::where('tipo', 'utilizacao')->whereBetween('created_at', [$inicio, $fim])->sum('valor')), 2),
        ];
    }

    public static function mensagens(Carbon $mes): array
    {
        return [
            'pendentes' => Notificacao::where('estado', 'pendente')->count(),
            'enviadasMes' => Notificacao::where('estado', 'enviada')->whereBetween('enviada_em', [$mes->copy()->startOfMonth(), $mes->copy()->endOfMonth()])->count(),
            'falhadas' => Notificacao::where('estado', 'falhou')->count(),
        ];
    }
}
