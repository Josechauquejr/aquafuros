<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use App\Models\Leitura;
use Illuminate\Http\Request;
use Inertia\Inertia;

class LeituraController extends Controller
{
    /**
     * Listar leituras paginadas, com pesquisa por cliente e filtro de
     * estado (confirmada/pendente) aplicados no servidor.
     */
    public function index(Request $request)
    {
        $search = $request->query('search');
        $estado = $request->query('estado');

        // withTrashed() no cliente: uma leitura antiga não deve perder o
        // nome do cliente só porque este foi entretanto removido.
        $query = Leitura::with(['cliente' => fn ($q) => $q->withTrashed(), 'registadoPor', 'factura']);

        if ($search) {
            $query->whereHas('cliente', fn ($c) => $c->withTrashed()->where('nome', 'like', "%{$search}%"));
        }

        if ($estado === 'confirmada') {
            $query->where('confirmado', true);
        } elseif ($estado === 'pendente') {
            $query->where('confirmado', false);
        }

        return Inertia::render('Leituras/Index', [
            'leituras' => $query->orderByDesc('ano')->orderByDesc('mes')->paginate(15)->withQueryString(),
            'clientes' => Cliente::where('estado', 'ativo')->orderBy('nome')->get(['id', 'nome']),
            'totais' => [
                'total' => Leitura::count(),
                'confirmadas' => Leitura::where('confirmado', true)->count(),
                'pendentes' => Leitura::where('confirmado', false)->count(),
                'semFactura' => Leitura::where('confirmado', true)->whereDoesntHave('factura')->count(),
            ],
            'filtros' => [
                'search' => $search ?? '',
                'estado' => $estado ?? 'todos',
            ],
        ]);
    }

    /**
     * Guardar uma nova leitura na base de dados.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'cliente_id' => 'required|exists:clientes,id',
            'mes' => 'required|integer|min:1|max:12',
            'ano' => 'required|integer|min:2000|max:2100',
            'leitura_actual' => 'required|numeric|min:0',
        ]);

        $existe = Leitura::where('cliente_id', $data['cliente_id'])
            ->where('mes', $data['mes'])
            ->where('ano', $data['ano'])
            ->exists();

        if ($existe) {
            return back()->withErrors(['leitura_actual' => 'Já existe uma leitura para este cliente neste período.'])->withInput();
        }

        $ultima = Leitura::where('cliente_id', $data['cliente_id'])
            ->orderByDesc('ano')->orderByDesc('mes')->first();

        $leituraAnterior = $ultima->leitura_actual ?? 0;

        if ($data['leitura_actual'] < $leituraAnterior) {
            return back()->withErrors([
                'leitura_actual' => "A leitura actual não pode ser menor que a leitura anterior ({$leituraAnterior}).",
            ])->withInput();
        }

        Leitura::create([
            'cliente_id' => $data['cliente_id'],
            'mes' => $data['mes'],
            'ano' => $data['ano'],
            'leitura_anterior' => $leituraAnterior,
            'leitura_actual' => $data['leitura_actual'],
            'confirmado' => false,
            'registado_por' => $request->user()->id,
        ]);

        return redirect()->route('leituras.index')->with('status', 'Leitura registada com sucesso.');
    }

    /**
     * Actualizar (ou confirmar) uma leitura — bloqueado depois de confirmada.
     */
    public function update(Request $request, Leitura $leitura)
    {
        if ($leitura->confirmado) {
            return back()->with('error', 'Esta leitura já foi confirmada e não pode ser alterada.');
        }

        $data = $request->validate([
            'leitura_actual' => "required|numeric|min:{$leitura->leitura_anterior}",
            'confirmado' => 'boolean',
        ]);

        $leitura->update($data);

        return redirect()->route('leituras.index')->with('status', 'Leitura actualizada com sucesso.');
    }

    /**
     * Eliminar uma leitura — bloqueado se confirmada ou com factura associada.
     */
    public function destroy(Leitura $leitura)
    {
        if ($leitura->factura) {
            return back()->with('error', 'Não é possível eliminar uma leitura com factura associada.');
        }

        if ($leitura->confirmado) {
            return back()->with('error', 'Não é possível eliminar uma leitura já confirmada.');
        }

        $leitura->delete();

        return redirect()->route('leituras.index')->with('status', 'Leitura eliminada com sucesso.');
    }
}
