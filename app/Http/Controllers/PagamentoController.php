<?php

namespace App\Http\Controllers;

use App\Models\Factura;
use App\Models\FechoCaixa;
use App\Models\Pagamento;
use App\Models\User;
use App\Models\Cliente;
use App\Support\BuscaDifusa;
use App\Support\ListaQuery;
use App\Support\NumeracaoDocumentos;
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
        $search = $request->query('search');
        $metodo = $request->query('metodo');

        $query = Pagamento::with([
            'cliente' => fn ($q) => $q->withTrashed(),
            'factura',
            'recebidoPor' => fn ($q) => $q->withTrashed(),
        ]);

        $periodo = ListaQuery::periodo($query, $request, 'pagamentos.created_at', 'mes');

        // Pesquisa difusa: nº do recibo, nº da factura e nome do cliente.
        $nomes = Cliente::withTrashed()->pluck('nome', 'id');
        $numerosFactura = Factura::withTrashed()->pluck('numero_factura', 'id');
        $idsPesquisa = BuscaDifusa::ids(
            Pagamento::get(['id', 'numero_recibo', 'factura_id', 'cliente_id']),
            $search,
            fn ($p) => "{$p->numero_recibo} ".($numerosFactura[$p->factura_id] ?? '').' '.($nomes[$p->cliente_id] ?? ''),
        );
        if ($idsPesquisa !== null) {
            $query->whereIn('pagamentos.id', $idsPesquisa);
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

        [$sort, $dir] = ListaQuery::ordenar($query, $request, [
            'recibo' => fn ($q, $d) => $q->orderBy('pagamentos.created_at', $d),
            'cliente' => fn ($q, $d) => $q->join('clientes', 'clientes.id', '=', 'pagamentos.cliente_id')
                ->select('pagamentos.*')->orderBy('clientes.nome', $d),
            'valor' => fn ($q, $d) => $q->orderBy('pagamentos.valor_pago', $d),
        ], 'recibo', 'desc');

        return Inertia::render('Pagamentos/Index', [
            'pagamentos' => $query->paginate(15)->withQueryString(),
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
                ...$periodo,
                'search' => $search ?? '',
                'metodo' => $metodo ?: 'todos',
                'sort' => $sort,
                'dir' => $dir,
            ],
        ]);
    }

    /**
     * Guardar um novo pagamento e actualizar o estado da factura e a
     * dívida do cliente em conformidade.
     */
    public function store(Request $request)
    {
        if ($this->caixaFechadaHoje($request->user()->id)) {
            return back()->with('error', 'Já fechou a caixa hoje — não é possível registar mais pagamentos.');
        }

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
            'recebidoPor' => fn ($q) => $q->withTrashed(),
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
                'recebidoPor' => fn ($q) => $q->withTrashed(),
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

        $fecho = FechoCaixa::where('utilizador_id', $utilizador->id)
            ->where('data', $data_referencia)
            ->with('fechadoPor')
            ->first();

        $ultimoFecho = FechoCaixa::where('utilizador_id', $utilizador->id)
            ->orderByDesc('data')
            ->first();

        return Inertia::render('Pagamentos/FechoCaixa', [
            'pagamentos' => $pagamentos,
            'utilizador' => $utilizador,
            'data' => $data_referencia,
            'totalGeral' => (float) $pagamentos->sum('valor_pago'),
            'totalPorMetodo' => $totalPorMetodo,
            'fecho' => $fecho,
            'ultimoFecho' => $ultimoFecho,
            'podeConfirmar' => $data_referencia === now()->toDateString(),
            'caixas' => $request->user()->hasRole('administrador')
                ? User::whereHas('roles', fn ($q) => $q->where('name', 'caixa'))->get(['id', 'name'])
                : [],
        ]);
    }

    /**
     * Confirmar o fecho de caixa do dia — depois disto, o próprio
     * utilizador não pode registar mais pagamentos nesse dia. Só o próprio
     * dia de hoje pode ser fechado (não faz sentido "fechar" um dia
     * passado que nunca foi fechado, nem um dia futuro).
     */
    public function confirmarFecho(Request $request)
    {
        $utilizador = $request->user();
        $hoje = now()->toDateString();

        if (FechoCaixa::where('utilizador_id', $utilizador->id)->where('data', $hoje)->exists()) {
            return back()->with('error', 'A caixa de hoje já está fechada.');
        }

        $pagamentos = Pagamento::where('recebido_por', $utilizador->id)
            ->whereDate('created_at', $hoje)
            ->get();

        FechoCaixa::create([
            'utilizador_id' => $utilizador->id,
            'data' => $hoje,
            'total_geral' => (float) $pagamentos->sum('valor_pago'),
            'total_por_metodo' => $pagamentos->groupBy('metodo_pagamento')
                ->map(fn ($grupo) => (float) $grupo->sum('valor_pago')),
            'numero_pagamentos' => $pagamentos->count(),
            'fechado_por' => $utilizador->id,
        ]);

        return redirect()->route('pagamentos.fecho-caixa')->with('status', 'Caixa fechada com sucesso.');
    }

    private function caixaFechadaHoje(int $utilizadorId): bool
    {
        return FechoCaixa::where('utilizador_id', $utilizadorId)
            ->where('data', now()->toDateString())
            ->exists();
    }

    /**
     * Actualiza apenas o estado da própria factura consoante o total
     * recebido contra ela. A dívida do cliente já não é um valor guardado
     * à parte — Cliente::saldoEmAberto()/dividaEmAtraso() recalculam-na
     * sempre a partir das facturas pendentes/parciais actuais, por isso não
     * há aqui nenhum registo para manter sincronizado.
     */
    /**
     * Público porque também é chamado a partir da lixeira (recalcular o
     * estado da factura depois de recuperar um pagamento estornado).
     */
    public function recalcularFacturaEDivida(Factura $factura): void
    {
        $totalPago = (float) $factura->pagamentos()->sum('valor_pago');

        $novoEstado = match (true) {
            $totalPago <= 0 => 'pendente',
            $totalPago >= $factura->total_pagar => 'paga',
            default => 'parcial',
        };

        $factura->update(['estado' => $novoEstado]);

        if ($totalPago > 0 && $factura->cliente?->divida) {
            $factura->cliente->divida->update(['data_ultimo_pagamento' => now()]);
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
        // withTrashed(): mesma razão do numero_factura — um recibo na
        // lixeira ainda ocupa o número.
        return NumeracaoDocumentos::proximoNumero(
            Pagamento::withTrashed()->where('numero_recibo', 'like', "REC-{$ano}-%"),
            'numero_recibo',
            "REC-{$ano}-%04d",
        );
    }
}
