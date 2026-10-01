<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use App\Models\Ocorrencia;
use App\Models\Zona;
use Illuminate\Http\Request;
use Inertia\Inertia;

/** Avarias, fugas, falta de água e reclamações — do aviso à resolução. */
class OcorrenciaController extends Controller
{
    public function index(Request $request)
    {
        $estado = $request->query('estado', 'abertas'); // abertas | todas | aberta | em_curso | resolvida
        $tipo = $request->query('tipo', 'todos');
        $zona = $request->query('zona', 'todas');

        $query = Ocorrencia::with(['cliente', 'zona', 'registadoPor', 'resolvidoPor'])->orderByRaw("CASE estado WHEN 'resolvida' THEN 1 ELSE 0 END")->orderByDesc('reportada_em');

        if ($estado === 'abertas') {
            $query->where('estado', '!=', 'resolvida');
        } elseif (in_array($estado, ['aberta', 'em_curso', 'resolvida'], true)) {
            $query->where('estado', $estado);
        }
        if (in_array($tipo, Ocorrencia::TIPOS, true)) {
            $query->where('tipo', $tipo);
        }
        if ($zona !== 'todas') {
            $query->where('zona_id', (int) $zona);
        }

        $pagina = $query->paginate(15)->withQueryString();
        $pagina->getCollection()->each(function (Ocorrencia $o) {
            $o->horas_aberta = $o->estado === 'resolvida' ? null : (int) $o->reportada_em->diffInHours(now());
        });

        return Inertia::render('Ocorrencias/Index', [
            'ocorrencias' => $pagina,
            'zonas' => Zona::orderBy('nome')->get(['id', 'nome']),
            'clientes' => Cliente::where('estado', '!=', 'inativo')->orderBy('nome')->get(['id', 'nome', 'numero_cliente', 'zona_id']),
            'tipos' => Ocorrencia::TIPOS,
            'totais' => [
                'abertas' => Ocorrencia::where('estado', 'aberta')->count(),
                'emCurso' => Ocorrencia::where('estado', 'em_curso')->count(),
                'maisDe48h' => Ocorrencia::where('estado', '!=', 'resolvida')->where('reportada_em', '<', now()->subHours(48))->count(),
            ],
            'filtros' => ['estado' => $estado, 'tipo' => $tipo, 'zona' => $zona],
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'tipo' => 'required|in:'.implode(',', Ocorrencia::TIPOS),
            'descricao' => 'required|string|min:5|max:2000',
            'cliente_id' => 'nullable|exists:clientes,id',
            'zona_id' => 'nullable|exists:zonas,id',
            'reportada_em' => 'nullable|date|before_or_equal:now',
        ]);

        // Sem zona indicada, usa a do cliente.
        if (empty($data['zona_id']) && ! empty($data['cliente_id'])) {
            $data['zona_id'] = Cliente::find($data['cliente_id'])?->zona_id;
        }

        Ocorrencia::create([
            ...$data,
            'reportada_em' => $data['reportada_em'] ?? now(),
            'registado_por' => $request->user()->id,
        ]);

        return back()->with('status', 'Ocorrência registada com sucesso.');
    }

    /** Muda o estado: iniciar (em curso), resolver (com a resolução) ou reabrir. */
    public function update(Request $request, Ocorrencia $ocorrencia)
    {
        $data = $request->validate([
            'accao' => 'required|in:iniciar,resolver,reabrir',
            'resolucao' => 'nullable|required_if:accao,resolver|string|min:3|max:2000',
        ], ['resolucao.required_if' => 'Indique o que foi feito para resolver.']);

        match ($data['accao']) {
            'iniciar' => $ocorrencia->update(['estado' => 'em_curso', 'iniciada_em' => $ocorrencia->iniciada_em ?? now()]),
            'resolver' => $ocorrencia->update([
                'estado' => 'resolvida', 'resolvida_em' => now(), 'resolvido_por' => $request->user()->id,
                'iniciada_em' => $ocorrencia->iniciada_em ?? now(), 'resolucao' => $data['resolucao'],
            ]),
            'reabrir' => $ocorrencia->update(['estado' => 'aberta', 'resolvida_em' => null, 'resolvido_por' => null]),
        };

        return back()->with('status', 'Ocorrência actualizada.');
    }

    public function destroy(Request $request, Ocorrencia $ocorrencia)
    {
        if (! $request->user()->hasRole('administrador')) {
            return back()->with('error', 'Apenas administradores podem apagar ocorrências.');
        }

        $ocorrencia->delete();

        return back()->with('status', 'Ocorrência apagada.');
    }
}
