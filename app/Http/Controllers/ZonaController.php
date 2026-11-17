<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use App\Models\Zona;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/** Zonas / bairros de abastecimento (só administrador). */
class ZonaController extends Controller
{
    public function index()
    {
        return Inertia::render('Zonas/Index', [
            'zonas' => $this->zonasComResumo(),
            'mesCiclo' => \App\Support\MesReferencia::actual()->month,
            'semZona' => Cliente::whereNull('zona_id')->count(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate(['nome' => 'required|string|max:100|unique:zonas,nome']);

        $zona = Zona::create($data);

        return back()->with('status', 'Zona criada com sucesso.')
            ->with('zonaCriada', ['id' => $zona->id, 'nome' => $zona->nome]);
    }

    public function update(Request $request, Zona $zona)
    {
        $data = $request->validate(['nome' => ['required', 'string', 'max:100', Rule::unique('zonas', 'nome')->ignore($zona->id)]]);

        $zona->update($data);
        // O bairro de texto dos clientes acompanha o nome da zona.
        Cliente::where('zona_id', $zona->id)->update(['bairro' => $zona->nome]);

        return back()->with('status', 'Zona actualizada com sucesso.');
    }

    public function destroy(Zona $zona)
    {
        if ($zona->clientes()->exists()) {
            return back()->with('error', 'Esta zona tem clientes — mude-os de zona antes de a apagar.');
        }

        $zona->delete();

        return back()->with('status', 'Zona apagada com sucesso.');
    }

    /**
     * Cada zona com o que importa para a ronda: clientes activos, lidos no
     * mês do ciclo, clientes em atraso e ocorrências abertas.
     */
    private function zonasComResumo()
    {
        $mes = \App\Support\MesReferencia::actual();
        $doMes = fn ($q) => $q->where('mes', $mes->month)->where('ano', $mes->year);
        $emAtraso = \App\Models\Factura::whereIn('facturas.estado', ['pendente', 'parcial'])
            ->where('facturas.data_vencimento', '<', now()->toDateString())
            ->join('clientes', 'clientes.id', '=', 'facturas.cliente_id')
            ->selectRaw('clientes.zona_id, COUNT(DISTINCT facturas.cliente_id) as total')
            ->groupBy('clientes.zona_id')->pluck('total', 'zona_id');
        $ocorrencias = \App\Models\Ocorrencia::where('estado', '!=', 'resolvida')
            ->selectRaw('zona_id, COUNT(*) as total')->groupBy('zona_id')->pluck('total', 'zona_id');

        return Zona::withCount([
            'clientes',
            'clientes as activos' => fn ($q) => $q->where('estado', 'ativo'),
            'clientes as lidos' => fn ($q) => $q->where('estado', 'ativo')->whereHas('leituras', $doMes),
        ])->orderBy('nome')->get()->each(function (Zona $zona) use ($emAtraso, $ocorrencias) {
            $zona->em_atraso = (int) ($emAtraso[$zona->id] ?? 0);
            $zona->ocorrencias_abertas = (int) ($ocorrencias[$zona->id] ?? 0);
        });
    }
}
