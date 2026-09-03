<?php

namespace App\Http\Controllers\Dev;

use App\Http\Controllers\Controller;
use App\Models\AcessoSistema;
use App\Models\ErroSistema;
use App\Models\Factura;
use App\Models\Pagamento;
use App\Models\User;
use App\Support\ResolvedorPeriodo;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;

/**
 * Painel técnico do Desenvolvedor: utilizadores mais activos, documentos
 * gerados ao longo do tempo, comparação facturas vs. recibos, e uso por
 * secção do sistema (para saber se uma funcionalidade é ou não usada).
 */
class PainelController extends Controller
{
    public function index(Request $request)
    {
        $periodo = $request->query('periodo', 'mes');
        $intervalo = ResolvedorPeriodo::resolver($periodo, $request->query('data_inicio'), $request->query('data_fim'));

        $acessosPeriodo = AcessoSistema::whereBetween('created_at', [$intervalo['inicio'], $intervalo['fim']]);
        $acessosComTempo = (clone $acessosPeriodo)->whereNotNull('duracao_ms')->get(['duracao_ms', 'tempo_bd_ms']);

        return Inertia::render('Dev/Painel', [
            'utilizadoresMaisActivos' => $this->utilizadoresMaisActivos($intervalo['inicio'], $intervalo['fim']),
            'documentosGerados' => $this->documentosGerados(Carbon::now(), 6),
            'facturasVsRecibos' => $this->facturasVsRecibos(Carbon::now(), 6),
            'usoPorSeccao' => $this->usoPorSeccao($intervalo['inicio'], $intervalo['fim']),
            'desempenhoBaseDados' => $this->desempenhoBaseDados(Carbon::now(), 14),
            'totalAcessosPeriodo' => (clone $acessosPeriodo)->count(),
            // KPIs do desenvolvedor: só sobre a saúde/performance da app, nunca
            // sobre o negócio (facturação, clientes, etc.).
            'tempoMedioResposta' => $acessosComTempo->isEmpty() ? null : round((float) $acessosComTempo->avg('duracao_ms'), 1),
            'tempoMedioBd' => $acessosComTempo->isEmpty() ? null : round((float) $acessosComTempo->avg('tempo_bd_ms'), 1),
            'errosPorResolver' => ErroSistema::where('resolvido', false)->count(),
            'filtros' => [
                'periodo' => $periodo,
                'data_inicio' => $request->query('data_inicio'),
                'data_fim' => $request->query('data_fim'),
            ],
        ]);
    }

    private function utilizadoresMaisActivos(Carbon $inicio, Carbon $fim, int $limite = 8): array
    {
        return AcessoSistema::whereBetween('created_at', [$inicio, $fim])
            ->whereNotNull('user_id')
            ->selectRaw('user_id, COUNT(*) as total')
            ->groupBy('user_id')
            ->orderByDesc('total')
            ->limit($limite)
            ->get()
            ->map(function ($linha) {
                $user = User::find($linha->user_id);

                return ['utilizador' => $user?->name ?? 'Utilizador removido', 'total' => (int) $linha->total];
            })
            ->toArray();
    }

    /**
     * Total de documentos (facturas + pagamentos) gerados por mês, últimos
     * N meses — série única para o gráfico de linha.
     */
    private function documentosGerados(Carbon $referencia, int $meses): array
    {
        $base = $referencia->copy()->startOfMonth();

        $periodos = collect(range(0, $meses - 1))
            ->map(fn ($i) => $base->copy()->subMonths($i))
            ->reverse()
            ->values();

        return $periodos->map(function (Carbon $periodo) {
            $inicio = $periodo->copy()->startOfMonth();
            $fim = $periodo->copy()->endOfMonth();

            $facturas = Factura::whereBetween('created_at', [$inicio, $fim])->count();
            $pagamentos = Pagamento::whereBetween('created_at', [$inicio, $fim])->count();

            return ['mes' => $periodo->month, 'ano' => $periodo->year, 'valor' => $facturas + $pagamentos];
        })->toArray();
    }

    /**
     * Facturas emitidas vs. recibos registados, por mês — duas séries, para
     * o AreaChart genérico.
     */
    private function facturasVsRecibos(Carbon $referencia, int $meses): array
    {
        $base = $referencia->copy()->startOfMonth();

        $periodos = collect(range(0, $meses - 1))
            ->map(fn ($i) => $base->copy()->subMonths($i))
            ->reverse()
            ->values();

        return $periodos->map(function (Carbon $periodo) {
            $inicio = $periodo->copy()->startOfMonth();
            $fim = $periodo->copy()->endOfMonth();

            return [
                'mes' => $periodo->month,
                'ano' => $periodo->year,
                'facturas' => Factura::whereBetween('created_at', [$inicio, $fim])->count(),
                'recibos' => Pagamento::whereBetween('created_at', [$inicio, $fim])->count(),
            ];
        })->toArray();
    }

    /**
     * Tempo médio de pedido e tempo médio gasto em consultas à base de
     * dados, por dia, últimos N dias — indicador de performance do
     * sistema. Medido pelo middleware RegistarAcesso (query log do
     * Laravel para o tempo de BD, cronómetro do pedido para o total).
     */
    private function desempenhoBaseDados(Carbon $referencia, int $dias): array
    {
        $periodos = collect(range(0, $dias - 1))
            ->map(fn ($i) => $referencia->copy()->subDays($i)->startOfDay())
            ->reverse()
            ->values();

        return $periodos->map(function (Carbon $dia) {
            $registos = AcessoSistema::whereBetween('created_at', [$dia->copy()->startOfDay(), $dia->copy()->endOfDay()])
                ->whereNotNull('duracao_ms')
                ->get(['duracao_ms', 'tempo_bd_ms']);

            return [
                'rotulo' => $dia->format('d/m'),
                'duracaoMedia' => $registos->isEmpty() ? 0 : round((float) $registos->avg('duracao_ms'), 1),
                'tempoBdMedio' => $registos->isEmpty() ? 0 : round((float) $registos->avg('tempo_bd_ms'), 1),
            ];
        })->toArray();
    }

    /**
     * Contagem de acessos por secção (primeiro segmento do URL) no
     * intervalo — responde "esta funcionalidade é usada ou não".
     */
    private function usoPorSeccao(Carbon $inicio, Carbon $fim): array
    {
        return AcessoSistema::whereBetween('created_at', [$inicio, $fim])
            ->get(['url'])
            ->map(function ($linha) {
                $caminho = parse_url($linha->url, PHP_URL_PATH) ?? '/';
                $segmentos = array_values(array_filter(explode('/', $caminho)));

                return $segmentos[0] ?? '(raiz)';
            })
            ->countBy()
            ->sortDesc()
            ->map(fn ($total, $seccao) => ['seccao' => $seccao, 'total' => $total])
            ->values()
            ->take(10)
            ->toArray();
    }
}
