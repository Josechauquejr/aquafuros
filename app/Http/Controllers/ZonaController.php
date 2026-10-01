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
            'zonas' => Zona::withCount('clientes')->orderBy('nome')->get(),
            'semZona' => Cliente::whereNull('zona_id')->count(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate(['nome' => 'required|string|max:100|unique:zonas,nome']);

        Zona::create($data);

        return back()->with('status', 'Zona criada com sucesso.');
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
}
