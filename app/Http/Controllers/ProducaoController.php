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
            'zonas' => Zona::orderBy('nome')->get(['id', 'nome']),
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
