<?php

namespace App\Http\Controllers;

use App\Models\Factura;
use App\Models\Leitura;
use App\Services\BillingService;
use App\Support\NumeracaoDocumentos;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use Inertia\Inertia;

class FacturaController extends Controller
{
    /**
     * Listar facturas paginadas e filtradas no servidor, com o resumo
     * mensal e os totais gerais calculados sobre o conjunto completo (não
     * apenas a página actual).
     */
    public function index(Request $request)
    {
        $search = $request->query('search');
        $estado = $request->query('estado');
        $periodo = $request->query('periodo'); // "mes/ano"

        $query = Factura::with([
            'cliente' => fn ($q) => $q->withTrashed()->with('tarifa'),
            'leitura',
            'geradaPor',
            'pagamentos',
        ]);

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('numero_factura', 'like', "%{$search}%")
                    ->orWhereHas('cliente', fn ($c) => $c->withTrashed()->where('nome', 'like', "%{$search}%"));
            });
        }

        if ($estado && $estado !== 'todos') {
            $query->where('estado', $estado);
        }

        if ($periodo && $periodo !== 'todos' && str_contains($periodo, '/')) {
            [$mes, $ano] = explode('/', $periodo);
            $query->where('mes', (int) $mes)->where('ano', (int) $ano);
        }

        $facturas = $query->orderByDesc('ano')->orderByDesc('mes')->paginate(15)->withQueryString();

        return Inertia::render('Facturas/Index', [
            'facturas' => $facturas,
            'primeirasLeituras' => collect($facturas->items())->mapWithKeys(
                fn ($factura) => [$factura->id => $factura->leitura?->ehPrimeira() ?? false],
            ),
            'consumosAnteriores' => collect($facturas->items())->mapWithKeys(
                fn ($factura) => [$factura->id => $this->consumoAnterior($factura->leitura)],
            ),
            'facturasAnteriores' => collect($facturas->items())->mapWithKeys(
                fn ($factura) => [$factura->id => $this->facturaAnterior($factura)],
            ),
            'qrUrls' => collect($facturas->items())->mapWithKeys(
                fn ($factura) => [$factura->id => $this->qrUrl($factura)],
            ),
            'leiturasDisponiveis' => Leitura::whereDoesntHave('factura')
                ->where('confirmado', true)
                ->with(['cliente' => fn ($q) => $q->withTrashed()])
                ->orderByDesc('ano')->orderByDesc('mes')->get(),
            'resumoMensal' => $this->resumoMensal(),
            'periodosDisponiveis' => Factura::selectRaw('DISTINCT mes, ano')
                ->orderByDesc('ano')->orderByDesc('mes')->get(),
            'totais' => $this->totaisGerais(),
            'filtros' => [
                'search' => $search ?? '',
                'estado' => $estado ?? 'todos',
                'periodo' => $periodo ?? 'todos',
            ],
        ]);
    }

    /**
     * Gerar uma factura a partir de uma leitura confirmada, usando o
     * BillingService para calcular consumo, dívida anterior, multa e total.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'leitura_id' => 'required|exists:leituras,id|unique:facturas,leitura_id',
        ]);

        $leitura = Leitura::with('cliente.tarifa', 'cliente.divida')->findOrFail($data['leitura_id']);

        if (! $leitura->confirmado) {
            return back()->with('error', 'A leitura seleccionada ainda não foi confirmada.');
        }

        $factura = $this->criarFactura($leitura, $request->user()->id);

        return redirect()->route('facturas.index')
            ->with('status', 'Factura emitida com sucesso.')
            // Permite ao frontend perguntar "deseja efectuar o pagamento
            // agora?" logo a seguir, sem precisar de adivinhar o id criado.
            ->with('novaFactura', [
                'id' => $factura->id,
                'numero_factura' => $factura->numero_factura,
                'total_pagar' => (float) $factura->total_pagar,
            ]);
    }

    /**
     * Facturação em lote: gera uma factura para cada leitura confirmada e
     * ainda por facturar de um período (mês/ano), num único passo — para o
     * ciclo mensal real, em vez de emitir leitura a leitura.
     */
    public function emitirLote(Request $request)
    {
        $data = $request->validate([
            'mes' => 'required|integer|min:1|max:12',
            'ano' => 'required|integer|min:2000|max:2100',
        ]);

        $leituras = Leitura::whereDoesntHave('factura')
            ->where('confirmado', true)
            ->where('mes', $data['mes'])
            ->where('ano', $data['ano'])
            ->with('cliente.tarifa', 'cliente.divida')
            ->get();

        if ($leituras->isEmpty()) {
            return back()->with('error', 'Não há leituras confirmadas por facturar nesse período.');
        }

        $geradaPor = $request->user()->id;

        DB::transaction(function () use ($leituras, $geradaPor) {
            foreach ($leituras as $leitura) {
                $this->criarFactura($leitura, $geradaPor);
            }
        });

        return redirect()->route('facturas.index')
            ->with('status', "{$leituras->count()} factura(s) emitida(s) com sucesso.");
    }

    private function criarFactura(Leitura $leitura, int $geradaPor): Factura
    {
        $calculo = app(BillingService::class)->calcular($leitura, $leitura->cliente);

        return Factura::create([
            'numero_factura' => $this->proximoNumero($leitura->ano),
            'cliente_id' => $leitura->cliente_id,
            'leitura_id' => $leitura->id,
            'tipo' => 'consumo',
            'mes' => $leitura->mes,
            'ano' => $leitura->ano,
            'valor_consumo' => $calculo['valor_consumo'],
            'divida_anterior' => $calculo['divida_anterior'],
            'multa' => $calculo['multa'],
            'total_pagar' => $calculo['total_pagar'],
            'estado' => 'pendente',
            'gerada_por' => $geradaPor,
        ]);
    }

    /**
     * Actualizar uma factura — apenas dívida anterior, multa e estado podem
     * ser corrigidos manualmente; o valor do consumo vem sempre da leitura.
     */
    public function update(Request $request, Factura $factura)
    {
        $data = $request->validate([
            'divida_anterior' => 'required|numeric|min:0',
            'multa' => 'required|numeric|min:0',
            'estado' => 'required|in:pendente,paga,parcial,anulada',
        ]);

        $data['total_pagar'] = $factura->valor_consumo + $data['divida_anterior'] + $data['multa'];

        $factura->update($data);

        return redirect()->route('facturas.index')->with('status', 'Factura actualizada com sucesso.');
    }

    /**
     * Anular uma factura — nunca é apagada, apenas marcada como anulada.
     */
    public function destroy(Factura $factura)
    {
        $factura->update(['estado' => 'anulada']);

        return redirect()->route('facturas.index')->with('status', 'Factura anulada com sucesso.');
    }

    /**
     * Vista de impressão da factura, com os dados da leitura actual e
     * anterior. Se for a primeira leitura do cliente, assinala-se para o
     * layout não tratar a leitura anterior (0) como um período real.
     */
    public function imprimir(Factura $factura)
    {
        $factura->load([
            'cliente' => fn ($q) => $q->withTrashed()->with('tarifa'),
            'leitura',
            'geradaPor',
            'pagamentos' => fn ($q) => $q->orderBy('created_at'),
        ]);

        return Inertia::render('Facturas/Imprimir', [
            'factura' => $factura,
            'primeiraLeitura' => $factura->leitura?->ehPrimeira() ?? false,
            'consumoAnterior' => $this->consumoAnterior($factura->leitura),
            'qrUrl' => $this->qrUrl($factura),
        ]);
    }

    /**
     * Vista de impressão em lote: por período (mes/ano, com filtro opcional
     * de estado) ou por uma lista de IDs seleccionados manualmente na lista.
     */
    public function imprimirLote(Request $request)
    {
        $data = $request->validate([
            'ids' => 'nullable|string',
            'mes' => 'nullable|integer|min:1|max:12',
            'ano' => 'nullable|integer|min:2000|max:2100',
            'estado' => 'nullable|in:pendente,paga,parcial,anulada',
        ]);

        $query = Factura::with([
            'cliente' => fn ($q) => $q->withTrashed()->with('tarifa'),
            'leitura',
            'geradaPor',
        ]);

        if (! empty($data['ids'])) {
            $ids = array_filter(array_map('intval', explode(',', $data['ids'])));
            $query->whereIn('id', $ids);
        } else {
            if (! empty($data['mes'])) {
                $query->where('mes', $data['mes']);
            }
            if (! empty($data['ano'])) {
                $query->where('ano', $data['ano']);
            }
            if (! empty($data['estado'])) {
                $query->where('estado', $data['estado']);
            }
        }

        $facturas = $query->orderBy('numero_factura')->get();

        $primeirasLeituras = $facturas->mapWithKeys(
            fn ($factura) => [$factura->id => $factura->leitura?->ehPrimeira() ?? false],
        );

        $consumosAnteriores = $facturas->mapWithKeys(
            fn ($factura) => [$factura->id => $this->consumoAnterior($factura->leitura)],
        );

        $qrUrls = $facturas->mapWithKeys(
            fn ($factura) => [$factura->id => $this->qrUrl($factura)],
        );

        return Inertia::render('Facturas/ImprimirLote', [
            'facturas' => $facturas,
            'primeirasLeituras' => $primeirasLeituras,
            'consumosAnteriores' => $consumosAnteriores,
            'qrUrls' => $qrUrls,
        ]);
    }

    /**
     * Consumo (m³) do período de facturação imediatamente anterior do
     * mesmo cliente — para comparação directa na factura impressa.
     */
    private function consumoAnterior(?Leitura $leitura): ?float
    {
        $anterior = $leitura?->anterior();

        return $anterior ? round($anterior->consumo(), 2) : null;
    }

    /**
     * Factura do período de facturação imediatamente anterior do mesmo
     * cliente (dados mínimos para comparação) — evita depender do
     * conjunto completo de facturas carregado no browser, agora que a
     * lista é paginada.
     */
    private function facturaAnterior(Factura $factura): ?Factura
    {
        return Factura::where('cliente_id', $factura->cliente_id)
            ->where('id', '!=', $factura->id)
            ->where(function ($q) use ($factura) {
                $q->where('ano', '<', $factura->ano)
                    ->orWhere(function ($q2) use ($factura) {
                        $q2->where('ano', $factura->ano)->where('mes', '<', $factura->mes);
                    });
            })
            ->orderByDesc('ano')->orderByDesc('mes')
            ->first(['id', 'mes', 'ano', 'valor_consumo', 'multa', 'total_pagar']);
    }

    /**
     * Resumo agrupado por mês/ano sobre TODAS as facturas (não filtrado
     * pelos filtros da lista) — usado no painel "Resumo e comparação
     * mensal", que é uma visão analítica estável, independente da procura
     * pontual de uma factura específica.
     */
    private function resumoMensal()
    {
        return Factura::selectRaw(
            'mes, ano, COUNT(*) as quantidade, SUM(total_pagar) as total,'
            .' SUM(CASE WHEN estado = \'paga\' THEN total_pagar ELSE 0 END) as recebido,'
            .' SUM(CASE WHEN estado IN (\'pendente\', \'parcial\') THEN total_pagar ELSE 0 END) as em_aberto',
        )
            ->groupBy('mes', 'ano')
            ->orderByDesc('ano')->orderByDesc('mes')
            ->get();
    }

    /**
     * Totais gerais (não filtrados) para os cartões de métricas no topo da
     * lista de facturas.
     */
    private function totaisGerais(): array
    {
        return [
            'totalFacturado' => (float) Factura::sum('total_pagar'),
            'totalPago' => (float) Factura::where('estado', 'paga')->sum('total_pagar'),
            'totalEmAberto' => (float) Factura::whereIn('estado', ['pendente', 'parcial'])->sum('total_pagar'),
            'pendentesCount' => Factura::where('estado', 'pendente')->count(),
        ];
    }

    /**
     * URL assinada (Laravel signed route) para a página pública de
     * verificação de autenticidade desta factura — codificada no QR code
     * impresso no documento.
     */
    private function qrUrl(Factura $factura): string
    {
        return URL::signedRoute('verificacao.factura', ['factura' => $factura->id]);
    }

    private function proximoNumero(int $ano): string
    {
        return NumeracaoDocumentos::proximoNumero(
            Factura::where('numero_factura', 'like', "FAT-{$ano}-%"),
            'numero_factura',
            "FAT-{$ano}-%04d",
        );
    }
}
