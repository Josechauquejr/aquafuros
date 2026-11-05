<?php

namespace App\Http\Controllers;

use App\Models\Configuracao;
use App\Models\Factura;
use App\Models\IsencaoMultaMensal;
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
    public function index(Request $request)
    {
        return Inertia::render('Tarifas/Index', [
            'tarifas' => Tarifa::orderBy('nome')->get(),
            'taxaLigacao' => Configuracao::valor('taxa_ligacao_nova', 3250.00),
            'regrasConfig' => Configuracao::regrasDeCobranca(),
            'mesesMulta' => $this->mesesComAlteracaoDeMulta(),
            'detalheMulta' => Inertia::optional(fn (): ?array => $this->detalheMultaMensal((string) $request->query('detalhe', ''))),
            'mesAtual' => MesReferencia::actual()->format('Y-m'),
        ]);
    }

    /**
     * Meses isentos agora, ou que já o foram (com registo de motivo ou com
     * multas dispensadas ainda por repor) — o mais recente primeiro.
     *
     * @return list<array<string, mixed>>
     */
    private function mesesComAlteracaoDeMulta(): array
    {
        $isentos = collect(Configuracao::mesesSemMulta())->keyBy('referencia');
        $dispensadas = Factura::query()
            ->where('multa_dispensa_valor', '>', 0)
            ->get(['created_at', 'multa_dispensa_valor'])
            ->groupBy(fn (Factura $factura): string => $factura->created_at->format('Y-m'));
        $registos = IsencaoMultaMensal::query()
            ->with(['autor:id,name', 'reactivador:id,name'])
            ->get()
            ->keyBy(fn (IsencaoMultaMensal $registo): string => sprintf('%04d-%02d', $registo->ano, $registo->mes));

        return $isentos->keys()
            ->merge($dispensadas->keys())
            ->merge($registos->keys())
            ->unique()
            ->sortDesc()
            ->values()
            ->map(function (string $referencia) use ($isentos, $dispensadas, $registos): array {
                $registo = $registos->get($referencia);
                $facturas = $dispensadas->get($referencia, collect());

                return [
                    'referencia' => $referencia,
                    'isenta' => $isentos->has($referencia),
                    'motivo' => $registo?->motivo,
                    'desactivada_por' => $registo?->autor?->name,
                    'desactivada_em' => $registo?->desactivada_em?->toIso8601String(),
                    'reactivada_por' => $registo?->reactivador?->name,
                    'reactivada_em' => $registo?->reactivada_em?->toIso8601String(),
                    'valor_dispensado' => round((float) $facturas->sum('multa_dispensa_valor'), 2),
                    'facturas_dispensadas' => $facturas->count(),
                ];
            })
            ->all();
    }

    /** Facturas do mês com multas dispensadas, carregadas só quando se abre o detalhe. */
    private function detalheMultaMensal(string $referencia): ?array
    {
        if (! preg_match('/^(\d{4})-(\d{2})$/', $referencia, $partes) || ! checkdate((int) $partes[2], 1, (int) $partes[1])) {
            return null;
        }

        $facturas = Factura::query()
            ->with('cliente:id,nome,numero_cliente')
            ->whereYear('created_at', (int) $partes[1])
            ->whereMonth('created_at', (int) $partes[2])
            ->where('multa_dispensa_valor', '>', 0)
            ->orderByDesc('multa_dispensa_valor')
            ->get(['id', 'numero_factura', 'cliente_id', 'estado', 'multa_dispensa_valor']);

        return [
            'referencia' => $referencia,
            'total' => round((float) $facturas->sum('multa_dispensa_valor'), 2),
            'facturas' => $facturas->map(fn (Factura $factura): array => [
                'id' => $factura->id,
                'numero' => $factura->numero_factura,
                'cliente' => $factura->cliente?->nome,
                'numero_cliente' => $factura->cliente?->numero_cliente,
                'estado' => $factura->estado,
                'valor' => round((float) $factura->multa_dispensa_valor, 2),
            ])->all(),
        ];
    }

    public function actualizarMultaMensal(Request $request)
    {
        $data = $request->validate([
            'mes' => 'required|date_format:Y-m',
            'isenta' => 'required|boolean',
            'repor' => 'sometimes|boolean',
            'motivo' => [
                Rule::requiredIf(fn (): bool => $request->boolean('isenta') && ! $request->boolean('repor')),
                'nullable',
                'string',
                'min:5',
                'max:500',
            ],
        ], [
            'motivo.required' => 'Indique o motivo para desactivar as multas deste mês.',
            'motivo.min' => 'Descreva o motivo com pelo menos 5 caracteres.',
        ]);
        if ($request->boolean('repor')) {
            return $this->restaurarMultasMensais($request);
        }

        [$ano, $mes] = array_map('intval', explode('-', $data['mes']));

        DB::transaction(function () use ($mes, $ano, $data, $request) {
            $isenta = (bool) $data['isenta'];
            Configuracao::definirMultaIsenta($mes, $ano, $isenta);

            if ($isenta) {
                IsencaoMultaMensal::updateOrCreate(['ano' => $ano, 'mes' => $mes], [
                    'motivo' => trim($data['motivo']),
                    'desactivada_por' => $request->user()?->id,
                    'desactivada_em' => now(),
                    'reactivada_em' => null,
                    'reactivada_por' => null,
                ]);

                Factura::query()
                    ->whereYear('created_at', $ano)
                    ->whereMonth('created_at', $mes)
                    ->where('multa', '>', 0)
                    ->lockForUpdate()
                    ->get()
                    ->each(fn (Factura $factura) => $factura->dispensarMultaEmAberto());
            } else {
                $this->marcarReactivada($ano, $mes, $request);
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

        $valorRestaurado = DB::transaction(function () use ($mes, $ano, $request) {
            Configuracao::definirMultaIsenta($mes, $ano, false);
            $this->marcarReactivada($ano, $mes, $request);

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

    private function marcarReactivada(int $ano, int $mes, Request $request): void
    {
        IsencaoMultaMensal::query()
            ->where('ano', $ano)
            ->where('mes', $mes)
            ->whereNull('reactivada_em')
            ->first()
            ?->update(['reactivada_em' => now(), 'reactivada_por' => $request->user()?->id]);
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
