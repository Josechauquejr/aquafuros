<?php

namespace App\Support\IA;

use App\Models\Cliente;
use App\Models\Factura;
use App\Models\Leitura;
use App\Models\Ocorrencia;
use App\Models\Pagamento;
use App\Models\ProducaoAgua;
use App\Models\User;
use App\Support\MesReferencia;
use Illuminate\Support\Carbon;

/** Fornece à Aqua apenas indicadores agregados da área actual, sem dados pessoais. */
class ContextoAssistente
{
    private const PAPEIS_POR_PAGINA = [
        'leituras' => ['administrador', 'gestor', 'tecnico'],
        'facturas' => ['administrador', 'gestor'],
        'cobranca' => ['administrador', 'gestor'],
        'pagamentos' => ['administrador', 'gestor', 'caixa'],
        'clientes' => ['administrador', 'gestor'],
        'ocorrencias' => ['administrador', 'gestor', 'tecnico'],
        'producao' => ['administrador', 'gestor', 'tecnico'],
    ];

    public static function construir(User $user, string $pagina, ?string $periodo = null): array
    {
        $permitidos = self::PAPEIS_POR_PAGINA[$pagina] ?? [];
        if ($permitidos && ! $user->hasAnyRole($permitidos)) {
            $pagina = 'geral';
        }

        $mes = MesReferencia::actual();
        $usaMesSeleccionado = in_array($pagina, ['geral', 'leituras', 'facturas', 'producao'], true);
        if ($usaMesSeleccionado && $periodo && preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $periodo)) {
            $pedido = Carbon::createFromFormat('Y-m-d', "{$periodo}-01")->startOfMonth();
            if ($pedido->lessThanOrEqualTo($mes) && $pedido->greaterThanOrEqualTo($mes->copy()->subYears(5))) {
                $mes = $pedido;
            }
        }
        $periodo = $mes->format('m/Y');

        $resultado = match ($pagina) {
            'leituras' => self::leituras($mes),
            'facturas' => self::facturas($mes),
            'cobranca' => self::cobranca(),
            'pagamentos' => self::pagamentos(),
            'clientes' => self::clientes(),
            'ocorrencias' => self::ocorrencias(),
            'producao' => self::producao($mes),
            default => self::ciclo($mes),
        };
        $referenciasLocais = $resultado['referencias_locais'] ?? [];
        unset($resultado['referencias_locais']);

        return [
            'contexto' => [
                'area' => $pagina,
                'referencia' => $usaMesSeleccionado ? $mes->format('m/Y') : 'estado em '.today()->format('d/m/Y'),
                'indicadores' => $resultado,
            ],
            // Os nomes e números ficam no servidor; só as referências entram no prompt.
            'referencias_locais' => $referenciasLocais,
        ];
    }

    private static function ciclo(Carbon $mes): array
    {
        return [
            'clientes_activos' => Cliente::where('estado', 'ativo')->count(),
            'leituras_registadas' => Leitura::where('mes', $mes->month)->where('ano', $mes->year)
                ->whereHas('cliente', fn ($q) => $q->where('estado', 'ativo'))
                ->distinct('cliente_id')->count('cliente_id'),
            'leituras_por_confirmar' => Leitura::where('mes', $mes->month)->where('ano', $mes->year)
                ->where('confirmado', false)->whereHas('cliente', fn ($q) => $q->where('estado', 'ativo'))->count(),
        ];
    }

    private static function leituras(Carbon $mes): array
    {
        $dados = self::ciclo($mes);
        $dados['leituras_confirmadas'] = Leitura::where('mes', $mes->month)->where('ano', $mes->year)
            ->where('confirmado', true)->whereHas('cliente', fn ($q) => $q->where('estado', 'ativo'))->count();
        $dados['clientes_sem_leitura'] = max(0, $dados['clientes_activos'] - $dados['leituras_registadas']);

        return $dados;
    }

    private static function facturas(Carbon $mes): array
    {
        $query = Factura::where('mes', $mes->month)->where('ano', $mes->year)->where('estado', '!=', 'anulada');

        return [
            'facturas_emitidas' => (clone $query)->count(),
            'facturas_pendentes' => (clone $query)->where('estado', 'pendente')->count(),
            'facturas_parciais' => (clone $query)->where('estado', 'parcial')->count(),
            'total_facturado_mzn' => round((float) (clone $query)->sum('total_pagar'), 2),
        ];
    }

    private static function cobranca(): array
    {
        $vencidas = Factura::whereIn('estado', ['pendente', 'parcial'])
            ->whereDate('data_vencimento', '<', now()->toDateString())
            ->withSum('pagamentos', 'valor_pago')
            ->get(['id', 'cliente_id', 'total_pagar']);

        $porCliente = $vencidas->groupBy('cliente_id')->map(function ($facturas, $clienteId) {
            $maisAntiga = $facturas->min('data_vencimento');

            return [
                'cliente_id' => (int) $clienteId,
                'saldo_vencido_mzn' => round((float) $facturas->sum(
                    fn (Factura $factura) => max(0, (float) $factura->total_pagar - (float) ($factura->pagamentos_sum_valor_pago ?? 0)),
                ), 2),
                'facturas_vencidas' => $facturas->count(),
                'dias_em_atraso' => $maisAntiga ? (int) Carbon::parse($maisAntiga)->diffInDays(today()) : 0,
            ];
        })->sortByDesc('saldo_vencido_mzn')->take(5)->values();

        $clientes = Cliente::withTrashed()->whereIn('id', $porCliente->pluck('cliente_id'))
            ->get(['id', 'numero_cliente', 'nome'])->keyBy('id');
        $referenciasLocais = [];
        $ranking = $porCliente->values()->map(function (array $item, int $indice) use ($clientes, &$referenciasLocais) {
            $referencia = 'cliente_'.($indice + 1);
            $cliente = $clientes->get($item['cliente_id']);
            $referenciasLocais[$referencia] = [
                'nome' => $cliente?->nome ?? 'Cliente removido',
                'numero' => $cliente?->numero_cliente,
            ];

            unset($item['cliente_id']);

            return ['referencia' => $referencia, ...$item];
        });

        return [
            'facturas_vencidas' => $vencidas->count(),
            'clientes_com_factura_vencida' => $vencidas->unique('cliente_id')->count(),
            'saldo_vencido_mzn' => round((float) $vencidas->sum(
                fn (Factura $factura) => max(0, (float) $factura->total_pagar - (float) ($factura->pagamentos_sum_valor_pago ?? 0)),
            ), 2),
            'maiores_saldos_vencidos' => $ranking->all(),
            'referencias_locais' => $referenciasLocais,
        ];
    }

    private static function pagamentos(): array
    {
        $hoje = Pagamento::whereDate('pago_em', today());

        return [
            'pagamentos_registados_hoje' => (clone $hoje)->count(),
            'total_recebido_hoje_mzn' => round((float) (clone $hoje)->sum('valor_pago'), 2),
        ];
    }

    private static function clientes(): array
    {
        return [
            'clientes_activos' => Cliente::where('estado', 'ativo')->count(),
            'clientes_inactivos' => Cliente::where('estado', 'inativo')->count(),
            'clientes_cortados' => Cliente::where('estado', 'cortado')->count(),
        ];
    }

    private static function ocorrencias(): array
    {
        return [
            'ocorrencias_abertas' => Ocorrencia::where('estado', 'aberta')->count(),
            'ocorrencias_em_curso' => Ocorrencia::where('estado', 'em_curso')->count(),
            'ocorrencias_resolvidas_este_mes' => Ocorrencia::where('estado', 'resolvida')
                ->whereMonth('resolvida_em', now()->month)->whereYear('resolvida_em', now()->year)->count(),
        ];
    }

    private static function producao(Carbon $mes): array
    {
        $producao = ProducaoAgua::where('mes', $mes->month)->where('ano', $mes->year);

        return [
            'registos_de_producao' => (clone $producao)->count(),
            'volume_registado_m3' => round((float) (clone $producao)->sum('volume_m3'), 2),
        ];
    }
}
