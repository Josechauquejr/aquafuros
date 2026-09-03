<?php

namespace App\Http\Controllers;

use App\Models\Factura;
use App\Models\Pagamento;
use App\Models\User;
use App\Support\NumeracaoDocumentos;
use App\Support\ResolvedorPeriodo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use Inertia\Inertia;

class PagamentoController extends Controller
{
    /**
     * Listar pagamentos paginados, filtrados por período (hoje/semana/
     * mês/personalizado/todos), pesquisa livre e método — tudo resolvido
     * no servidor.
     */
    public function index(Request $request)
    {
        $periodo = $request->query('periodo', 'mes');
        $dataInicio = $request->query('data_inicio');
        $dataFim = $request->query('data_fim');
        $search = $request->query('search');
        $metodo = $request->query('metodo');

        $intervalo = ResolvedorPeriodo::resolver($periodo, $dataInicio, $dataFim);

        $query = Pagamento::with(['cliente' => fn ($q) => $q->withTrashed(), 'factura', 'recebidoPor']);

        if ($periodo !== 'todos') {
            $query->whereBetween('created_at', [$intervalo['inicio'], $intervalo['fim']]);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('numero_recibo', 'like', "%{$search}%")
                    ->orWhereHas('cliente', fn ($c) => $c->withTrashed()->where('nome', 'like', "%{$search}%"))
                    ->orWhereHas('factura', fn ($f) => $f->where('numero_factura', 'like', "%{$search}%"));
            });
        }

        if ($metodo && $metodo !== 'todos') {
            $query->where('metodo_pagamento', $metodo);
        }

        $totalRecebido = (float) (clone $query)->sum('valor_pago');
        $totalRegistados = (clone $query)->count();
        $metodoMaisUsado = (clone $query)
            ->select('metodo_pagamento')
            ->selectRaw('COUNT(*) as quantidade')
            ->groupBy('metodo_pagamento')
            ->orderByDesc('quantidade')
            ->first();

        return Inertia::render('Pagamentos/Index', [
            'pagamentos' => $query->orderByDesc('created_at')->paginate(15)->withQueryString(),
            'facturasEmAberto' => Factura::whereIn('estado', ['pendente', 'parcial'])
                ->with(['cliente' => fn ($q) => $q->withTrashed()])
                ->orderByDesc('ano')->orderByDesc('mes')->get(),
            'metricas' => [
                'totalRecebido' => $totalRecebido,
                'totalRegistados' => $totalRegistados,
                'metodoMaisUsado' => $metodoMaisUsado?->metodo_pagamento,
                'valorMedio' => $totalRegistados > 0 ? $totalRecebido / $totalRegistados : 0,
            ],
            'filtros' => [
                'periodo' => $periodo,
                'data_inicio' => $dataInicio,
                'data_fim' => $dataFim,
                'search' => $search ?? '',
                'metodo' => $metodo ?? 'todos',
            ],
        ]);
    }

    /**
     * Guardar um novo pagamento e actualizar o estado da factura e a
     * dívida do cliente em conformidade.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'factura_id' => 'required|exists:facturas,id',
            'valor_pago' => 'required|numeric|min:0.01',
            'metodo_pagamento' => 'required|in:dinheiro,banco,mpesa,e-mola',
            'referencia_pagamento' => 'nullable|string|max:255',
        ]);

        $factura = Factura::with('cliente.divida', 'cliente.tarifa')->findOrFail($data['factura_id']);

        if (! in_array($factura->estado, ['pendente', 'parcial'], true)) {
            return back()->with('error', 'Esta factura já não aceita pagamentos.');
        }

        $pagamento = Pagamento::create([
            'numero_recibo' => $this->proximoRecibo(now()->year),
            'factura_id' => $factura->id,
            'cliente_id' => $factura->cliente_id,
            'valor_pago' => $data['valor_pago'],
            'metodo_pagamento' => $data['metodo_pagamento'],
            'referencia_pagamento' => $data['referencia_pagamento'] ?? null,
            'recebido_por' => $request->user()->id,
        ]);

        $this->recalcularFacturaEDivida($factura);

        // Vai directo para o recibo — evita o passo extra de procurar o
        // pagamento acabado de registar na lista.
        return redirect()->route('pagamentos.imprimir', $pagamento)
            ->with('status', 'Pagamento registado com sucesso.');
    }

    /**
     * Actualizar um pagamento — por integridade financeira, apenas o método
     * e a referência podem ser corrigidos; valor e factura são imutáveis.
     */
    public function update(Request $request, Pagamento $pagamento)
    {
        $data = $request->validate([
            'metodo_pagamento' => 'required|in:dinheiro,banco,mpesa,e-mola',
            'referencia_pagamento' => 'nullable|string|max:255',
        ]);

        $pagamento->update($data);

        return redirect()->route('pagamentos.index')->with('status', 'Pagamento actualizado com sucesso.');
    }

    /**
     * Estornar um pagamento — operação sensível, restrita a administradores.
     */
    public function destroy(Request $request, Pagamento $pagamento)
    {
        if (! $request->user()->hasRole('administrador')) {
            return back()->with('error', 'Apenas administradores podem estornar pagamentos.');
        }

        $factura = $pagamento->factura()->with('cliente.divida', 'cliente.tarifa')->first();
        $pagamento->delete();

        if ($factura) {
            $this->recalcularFacturaEDivida($factura);
        }

        return redirect()->route('pagamentos.index')->with('status', 'Pagamento estornado com sucesso.');
    }

    /**
     * Vista de impressão do recibo, incluindo os dados da leitura actual e
     * anterior da factura relacionada.
     */
    public function imprimir(Pagamento $pagamento)
    {
        $pagamento->load([
            'cliente' => fn ($q) => $q->withTrashed()->with('tarifa'),
            'factura.leitura',
            'recebidoPor',
        ]);

        return Inertia::render('Pagamentos/Imprimir', [
            'pagamento' => $pagamento,
            'primeiraLeitura' => $pagamento->factura?->leitura?->ehPrimeira() ?? false,
            'qrUrl' => $this->qrUrl($pagamento),
        ]);
    }

    /**
     * Impressão em lote de recibos seleccionados manualmente na lista.
     */
    public function imprimirLote(Request $request)
    {
        $data = $request->validate(['ids' => 'required|string']);

        $ids = array_filter(array_map('intval', explode(',', $data['ids'])));

        $pagamentos = Pagamento::whereIn('id', $ids)
            ->with([
                'cliente' => fn ($q) => $q->withTrashed()->with('tarifa'),
                'factura.leitura',
                'recebidoPor',
            ])
            ->orderBy('numero_recibo')
            ->get();

        $primeirasLeituras = $pagamentos->mapWithKeys(
            fn ($p) => [$p->id => $p->factura?->leitura?->ehPrimeira() ?? false],
        );

        $qrUrls = $pagamentos->mapWithKeys(
            fn ($p) => [$p->id => $this->qrUrl($p)],
        );

        return Inertia::render('Pagamentos/ImprimirLote', [
            'pagamentos' => $pagamentos,
            'primeirasLeituras' => $primeirasLeituras,
            'qrUrls' => $qrUrls,
        ]);
    }

    /**
     * Fecho de caixa: todos os recibos emitidos por um utilizador (por
     * omissão, o utilizador actual) numa data, com totais por método.
     */
    public function fechoCaixa(Request $request)
    {
        $data = $request->validate([
            'data' => 'nullable|date',
            'utilizador_id' => 'nullable|exists:users,id',
        ]);

        $utilizador = ! empty($data['utilizador_id']) && $request->user()->hasRole('administrador')
            ? User::find($data['utilizador_id'])
            : $request->user();

        $data_referencia = $data['data'] ?? now()->toDateString();

        $pagamentos = Pagamento::where('recebido_por', $utilizador->id)
            ->whereDate('created_at', $data_referencia)
            ->with(['cliente' => fn ($q) => $q->withTrashed(), 'factura'])
            ->orderBy('created_at')
            ->get();

        $totalPorMetodo = $pagamentos->groupBy('metodo_pagamento')
            ->map(fn ($grupo) => (float) $grupo->sum('valor_pago'));

        return Inertia::render('Pagamentos/FechoCaixa', [
            'pagamentos' => $pagamentos,
            'utilizador' => $utilizador,
            'data' => $data_referencia,
            'totalGeral' => (float) $pagamentos->sum('valor_pago'),
            'totalPorMetodo' => $totalPorMetodo,
            'caixas' => $request->user()->hasRole('administrador')
                ? User::whereHas('roles', fn ($q) => $q->where('name', 'caixa'))->get(['id', 'name'])
                : [],
        ]);
    }

    private function recalcularFacturaEDivida(Factura $factura): void
    {
        $totalPago = (float) $factura->pagamentos()->sum('valor_pago');

        $novoEstado = match (true) {
            $totalPago <= 0 => 'pendente',
            $totalPago >= $factura->total_pagar => 'paga',
            default => 'parcial',
        };

        $factura->update(['estado' => $novoEstado]);

        $cliente = $factura->cliente;
        $divida = $cliente?->divida;
        $tarifa = $cliente?->tarifa;

        if ($divida && $tarifa) {
            $saldoRestante = max(0, (float) $factura->total_pagar - $totalPago);

            $divida->update([
                'valor_divida' => $saldoRestante,
                'meses_atraso' => $saldoRestante > 0 ? max(1, $divida->meses_atraso) : 0,
                'em_corte' => $saldoRestante >= (float) $tarifa->limiar_corte,
                'data_ultimo_pagamento' => $totalPago > 0 ? now() : $divida->data_ultimo_pagamento,
            ]);
        }
    }

    /**
     * URL assinada (Laravel signed route) para a página pública de
     * verificação de autenticidade deste recibo — codificada no QR code
     * impresso no documento.
     */
    private function qrUrl(Pagamento $pagamento): string
    {
        return URL::signedRoute('verificacao.pagamento', ['pagamento' => $pagamento->id]);
    }

    private function proximoRecibo(int $ano): string
    {
        return NumeracaoDocumentos::proximoNumero(
            Pagamento::where('numero_recibo', 'like', "REC-{$ano}-%"),
            'numero_recibo',
            "REC-{$ano}-%04d",
        );
    }
}
