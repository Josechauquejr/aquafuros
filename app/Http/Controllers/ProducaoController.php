<?php

namespace App\Http\Controllers;

use App\Models\ProducaoAgua;
use App\Models\Zona;
use App\Support\AnaliseOperacional;
use App\Support\MesReferencia;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * Água captada/bombeada por mês (do sistema todo ou por zona) e as perdas:
 * o que se produziu menos o que se facturou.
 */
class ProducaoController extends Controller
{
    public function index(Request $request)
    {
        $mesRef = MesReferencia::resolver($request);

        return Inertia::render('Producao/Index', [
            'mesReferencia' => MesReferencia::paraSeletor($mesRef),
            'registos' => ProducaoAgua::with(['zona', 'registadoPor'])
                ->where('ano', $mesRef->year)->where('mes', $mesRef->month)->orderBy('id')->get(),
            'perdas' => AnaliseOperacional::perdas($mesRef),
            // Água facturada por zona no mês (leituras com factura válida), para a coluna "Facturada".
            'facturadoPorZona' => \App\Models\Leitura::where('mes', $mesRef->month)->where('ano', $mesRef->year)
                ->with(['cliente:id,zona_id', 'factura:id,leitura_id,estado'])->get()
                ->filter(fn ($l) => $l->factura && $l->factura->estado !== 'anulada' && $l->cliente)
                ->groupBy(fn ($l) => $l->cliente->zona_id)
                ->map(fn ($g) => round((float) $g->sum(fn ($l) => $l->consumo()), 2)),
            'zonas' => Zona::orderBy('nome')->withCount(['clientes as clientes_activos' => fn ($q) => $q->where('estado', 'ativo')])->get(['id', 'nome']),
            'historico' => collect(range(5, 0))->map(function ($atras) use ($mesRef) {
                $m = $mesRef->copy()->startOfMonth()->subMonthsNoOverflow($atras);
                $p = AnaliseOperacional::perdas($m);

                return ['mes' => $m->month, 'ano' => $m->year, 'produzido' => $p['produzidoM3'], 'facturado' => $p['facturadoM3'], 'perdasPct' => $p['perdasPct']];
            })->all(),
            'filtros' => MesReferencia::foiPedido($request) ? ['mes' => $mesRef->format('Y-m')] : [],
        ]);
    }

    public function store(Request $request)
    {
        // Várias zonas de uma vez (tabela "Registar a água captada").
        if ($request->has('registos')) {
            $data = $request->validate([
                'mes' => 'required|integer|min:1|max:12',
                'ano' => 'required|integer|min:2000|max:2100',
                'registos' => 'required|array|min:1',
                'registos.*.zona_id' => 'required|exists:zonas,id',
                'registos.*.volume_m3' => 'required|numeric|min:0|max:999999999',
            ]);
            foreach ($data['registos'] as $registo) {
                ProducaoAgua::updateOrCreate(
                    ['zona_id' => $registo['zona_id'], 'mes' => $data['mes'], 'ano' => $data['ano']],
                    ['volume_m3' => $registo['volume_m3'], 'registado_por' => $request->user()->id],
                );
            }
            $n = count($data['registos']);

            return back()->with('status', $n === 1 ? 'Produção de 1 zona registada.' : "Produção de {$n} zonas registada.");
        }

        $data = $request->validate([
            'mes' => 'required|integer|min:1|max:12',
            'ano' => 'required|integer|min:2000|max:2100',
            'zona_id' => 'nullable|exists:zonas,id',
            'volume_m3' => 'required|numeric|min:0|max:999999999',
        ]);

        // Um registo por mês e zona (o sistema todo = sem zona): voltar a registar corrige o valor.
        ProducaoAgua::updateOrCreate(
            ['zona_id' => $data['zona_id'] ?? null, 'mes' => $data['mes'], 'ano' => $data['ano']],
            ['volume_m3' => $data['volume_m3'], 'registado_por' => $request->user()->id],
        );

        return back()->with('status', 'Produção de água registada com sucesso.');
    }

    public function destroy(ProducaoAgua $producao)
    {
        $producao->delete();

        return back()->with('status', 'Registo apagado.');
    }
}
