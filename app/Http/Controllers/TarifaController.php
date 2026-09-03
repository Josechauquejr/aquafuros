<?php

namespace App\Http\Controllers;

use App\Models\Configuracao;
use App\Models\Tarifa;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class TarifaController extends Controller
{
    /**
     * Listar todas as tarifas.
     */
    public function index()
    {
        return Inertia::render('Tarifas/Index', [
            'tarifas' => Tarifa::orderBy('nome')->get(),
            'taxaLigacao' => Configuracao::valor('taxa_ligacao_nova', 3250.00),
        ]);
    }

    /**
     * Actualizar o valor da taxa de ligação de novo contrato — cobrada
     * automaticamente ao criar um cliente como "novo contrato".
     */
    public function actualizarTaxaLigacao(Request $request)
    {
        $data = $request->validate([
            'valor' => 'required|numeric|min:0',
        ]);

        Configuracao::definir('taxa_ligacao_nova', $data['valor']);

        return redirect()->route('tarifas.index')->with('status', 'Taxa de ligação actualizada com sucesso.');
    }

    /**
     * Guardar uma nova tarifa na base de dados.
     */
    public function store(Request $request)
    {
        $data = $this->validarTarifa($request);

        Tarifa::create($data);

        return redirect()->route('tarifas.index')->with('status', 'Tarifa criada com sucesso.');
    }

    /**
     * Actualizar os dados de uma tarifa.
     */
    public function update(Request $request, Tarifa $tarifa)
    {
        $data = $this->validarTarifa($request, $tarifa);

        $tarifa->update($data);

        return redirect()->route('tarifas.index')->with('status', 'Tarifa actualizada com sucesso.');
    }

    /**
     * Eliminar uma tarifa (bloqueado se houver clientes associados).
     */
    public function destroy(Tarifa $tarifa)
    {
        try {
            $tarifa->delete();
        } catch (QueryException) {
            return back()->with('error', 'Não é possível eliminar esta tarifa: existem clientes associados a ela.');
        }

        return redirect()->route('tarifas.index')->with('status', 'Tarifa eliminada com sucesso.');
    }

    private function validarTarifa(Request $request, ?Tarifa $tarifa = null): array
    {
        return $request->validate([
            'nome' => ['required', 'string', 'max:255', Rule::unique('tarifas', 'nome')->ignore($tarifa?->id)],
            'preco_m3' => 'required|numeric|min:0',
            'taxa_minima' => 'required|numeric|min:0',
            'consumo_minimo_m3' => 'required|numeric|min:0',
            'percentagem_multa' => 'required|numeric|min:0|max:1',
            'limiar_corte' => 'required|numeric|min:0',
            'is_active' => 'boolean',
        ]);
    }
}
