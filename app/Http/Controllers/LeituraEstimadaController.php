<?php

namespace App\Http\Controllers;

use App\Models\AcertoLeitura;
use App\Models\Cliente;
use App\Models\LeituraEstimada;
use App\Services\CicloLeiturasEstimadas;
use App\Support\Facturacao;
use Illuminate\Http\Request;
use Inertia\Inertia;

class LeituraEstimadaController extends Controller
{
    public function index()
    {
        return Inertia::render('Leituras/Estimadas', [
            'estimativas' => LeituraEstimada::with([
                'cliente' => fn ($q) => $q->withTrashed(), 'registadoPor', 'confirmadoPor', 'canceladoPor', 'factura', 'leituraReal',
            ])->orderByDesc('ano')->orderByDesc('mes')->orderByDesc('id')->get(),
            'acertos' => AcertoLeitura::with([
                'cliente' => fn ($q) => $q->withTrashed(), 'leituraReal', 'factura', 'credito', 'registadoPor', 'aprovadoPor',
            ])->orderByDesc('created_at')->get(),
            'clientes' => Cliente::with('tarifa')->orderBy('nome')->get(['id', 'numero_cliente', 'nome', 'tarifa_id']),
        ]);
    }

    public function prever(Request $request, CicloLeiturasEstimadas $ciclo)
    {
        $dados = $request->validate([
            'cliente_id' => 'required|integer|exists:clientes,id',
            'mes' => 'required|integer|min:1|max:12',
            'ano' => 'required|integer|min:2000|max:2100',
        ]);

        return response()->json($ciclo->prever((int) $dados['cliente_id'], (int) $dados['mes'], (int) $dados['ano']));
    }

    public function store(Request $request, CicloLeiturasEstimadas $ciclo)
    {
        $dados = $request->validate([
            'cliente_id' => 'required|integer|exists:clientes,id',
            'mes' => 'required|integer|min:1|max:12',
            'ano' => 'required|integer|min:2000|max:2100',
            'consumo_m3' => 'nullable|numeric|min:0|max:99999999',
            'motivo' => 'nullable|string|min:5|max:1000',
        ]);

        $estimativa = $ciclo->registar($dados, $request->user()->id);

        return back()->with('status', 'Estimativa registada como pendente de aprovação.');
    }

    public function confirmar(Request $request, LeituraEstimada $estimativa, CicloLeiturasEstimadas $ciclo)
    {
        $estimativa = $ciclo->confirmar($estimativa, $request->user()->id);

        return back()->with('status', 'Estimativa confirmada. Emita a factura quando estiver pronta.');
    }

    public function emitir(Request $request, LeituraEstimada $estimativa)
    {
        $factura = Facturacao::emitirEstimativa($estimativa, $request->user()->id);
        $leituraReal = \App\Models\Leitura::where('cliente_id', $estimativa->cliente_id)
            ->where(fn ($q) => $q->where('ano', '>', $estimativa->ano)->orWhere(fn ($q) => $q->where('ano', $estimativa->ano)->where('mes', '>', $estimativa->mes)))
            ->where('confirmado', true)->orderBy('ano')->orderBy('mes')->first();
        if ($leituraReal) app(CicloLeiturasEstimadas::class)->reconciliarAoConfirmar($leituraReal, $request->user()->id);

        return back()->with('status', "Factura {$factura->numero_factura} emitida para a leitura estimada.");
    }

    public function aprovarAcerto(Request $request, AcertoLeitura $acerto, CicloLeiturasEstimadas $ciclo)
    {
        $ciclo->aprovarAcerto($acerto, $request->user()->id);

        return back()->with('status', 'Acerto aprovado e registado para a próxima factura ou como crédito do cliente.');
    }

    public function cancelar(Request $request, LeituraEstimada $estimativa, CicloLeiturasEstimadas $ciclo)
    {
        $dados = $request->validate(['motivo_cancelamento' => 'required|string|min:5|max:1000']);
        $ciclo->cancelar($estimativa, $request->user()->id, $dados['motivo_cancelamento']);

        return back()->with('status', 'Estimativa cancelada. Pode registar a leitura real deste período.');
    }
}
