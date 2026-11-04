<?php

namespace App\Http\Controllers;

use App\Models\Configuracao;
use App\Models\Factura;
use App\Models\Tarifa;
use App\Support\MesReferencia;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
            'regrasConfig' => Configuracao::regrasDeCobranca(),
            'mesesSemMulta' => Configuracao::mesesSemMulta(),
            'multasDispensadas' => Factura::query()->where('multa_dispensa_valor', '>', 0)->get(['created_at', 'multa_dispensa_valor'])->groupBy(fn (Factura $factura): string => $factura->created_at->format('Y-m'))->map(fn ($facturas, string $referencia): array => ['referencia' => $referencia, 'valor' => round($facturas->sum('multa_dispensa_valor'), 2), 'quantidade' => $facturas->count()])->values(),
            'mesAtual' => MesReferencia::actual()->format('Y-m'),
        ]);
    }

    public function actualizarMultaMensal(Request $request)
    {
        $data = $request->validate([
            'mes' => 'required|date_format:Y-m',
            'isenta' => 'required|boolean',
            'repor' => 'sometimes|boolean',
        ]);
        if ($request->boolean('repor')) {
            return $this->restaurarMultasMensais($request);
        }

        [$ano, $mes] = array_map('intval', explode('-', $data['mes']));

        DB::transaction(function () use ($mes, $ano, $data) {
            $isenta = (bool) $data['isenta'];
            Configuracao::definirMultaIsenta($mes, $ano, $isenta);

            if ($isenta) {
                Factura::query()
                    ->whereYear('created_at', $ano)
                    ->whereMonth('created_at', $mes)
                    ->where('multa', '>', 0)
                    ->lockForUpdate()
                    ->get()
                    ->each(fn (Factura $factura) => $factura->dispensarMultaEmAberto());
            }
        });

        return redirect()->route('tarifas.index')->with(
            'status',
            $data['isenta'] ? 'Multas desactivadas para o mês seleccionado; saldos de multas em aberto dispensados.' : 'Multas reactivadas para o mês seleccionado.',
        );
    }

    public function restaurarMultasMensais(Request $request)
    {
        $data = $request->validate(['mes' => 'required|date_format:Y-m']);
        [$ano, $mes] = array_map('intval', explode('-', $data['mes']));

        $valorRestaurado = DB::transaction(function () use ($mes, $ano) {
            Configuracao::definirMultaIsenta($mes, $ano, false);

            return Factura::query()
                ->whereYear('created_at', $ano)
                ->whereMonth('created_at', $mes)
                ->where('multa_dispensa_valor', '>', 0)
                ->lockForUpdate()
                ->get()
                ->sum(fn (Factura $factura): float => $factura->restaurarMultaDispensada());
        });

        $mensagem = $valorRestaurado > 0
            ? 'Multas repostas com sucesso. O mês também voltou a permitir novas multas.'
            : 'Não havia multas dispensadas para repor neste mês. As novas multas foram reactivadas.';

        return redirect()->route('tarifas.index')->with('status', $mensagem);
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
     * Limites gerais da cobrança e quantos dias para trás se pode datar um pagamento.
     */
    public function actualizarRegras(Request $request)
    {
        $data = $request->validate([
            'leituras_dia_limite' => 'required|integer|min:1|max:28',
            'pagamento_dias_retroactivos' => 'required|integer|min:0|max:60',
        ]);

        foreach ($data as $chave => $valor) {
            Configuracao::definir($chave, $valor);
        }

        return redirect()->route('tarifas.index')->with('status', 'Regras de cobrança actualizadas com sucesso.');
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
