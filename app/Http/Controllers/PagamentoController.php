<?php

namespace App\Http\Controllers;

use App\Models\Factura;
use App\Models\FechoCaixa;
use App\Models\Pagamento;
use App\Models\User;
use App\Models\Cliente;
use App\Support\BuscaDifusa;
use App\Support\ListaQuery;
use App\Support\MesReferencia;
use App\Support\ResumoMensal;
use App\Support\NumeracaoDocumentos;
use App\Support\RegistoEmail;
use App\Mail\ReciboMail;
use Illuminate\Http\Request;
use App\Models\Configuracao;
use App\Models\Credito;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
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
        $mesRef = MesReferencia::resolver($request);

        $search = $request->query('search');
        $metodo = $request->query('metodo');

        $query = Pagamento::with([
            'cliente' => fn ($q) => $q->withTrashed(),
            'factura',
            'recebidoPor' => fn ($q) => $q->withTrashed(),
        ]);

        $periodo = ListaQuery::periodoOuMes($query, $request, 'pagamentos.pago_em', 'mes');

        // Pesquisa difusa: nº do recibo, nº da factura e nome do cliente.
        $nomes = filled($search) ? Cliente::withTrashed()->pluck('nome', 'id') : collect();
        $numerosFactura = filled($search) ? Factura::withTrashed()->pluck('numero_factura', 'id') : collect();
        $idsPesquisa = BuscaDifusa::ids(
            fn () => Pagamento::get(['id', 'numero_recibo', 'factura_id', 'cliente_id']),
            $search,
            fn ($p) => "{$p->numero_recibo} ".($numerosFactura[$p->factura_id] ?? '').' '.($nomes[$p->cliente_id] ?? ''),
        );
        if ($idsPesquisa !== null) {
            $query->whereIn('pagamentos.id', $idsPesquisa);
        }

        if ($metodo && $metodo !== 'todos') {
            $query->where('metodo_pagamento', $metodo);
        }

        [$sort, $dir] = ListaQuery::ordenar($query, $request, [
            'recibo' => fn ($q, $d) => $q->orderBy('pagamentos.created_at', $d),
            'cliente' => fn ($q, $d) => $q->join('clientes', 'clientes.id', '=', 'pagamentos.cliente_id')
                ->select('pagamentos.*')->orderBy('clientes.nome', $d),
            'valor' => fn ($q, $d) => $q->orderBy('pagamentos.valor_pago', $d),
        ], 'recibo', 'desc');

        return Inertia::render('Pagamentos/Index', [
            'pagamentos' => $this->comTotalDoLote($query->paginate(15)->withQueryString()),
            'facturasEmAberto' => Factura::whereIn('estado', ['pendente', 'parcial'])
                ->with(['cliente' => fn ($q) => $q->withTrashed()])
                ->withSum('pagamentos', 'valor_pago')
                ->orderByDesc('ano')->orderByDesc('mes')->get()
                ->each(function (Factura $factura) {
                    // O que falta pagar (uma factura parcial pode receber vários pagamentos).
                    $factura->total_pago = round((float) ($factura->pagamentos_sum_valor_pago ?? 0), 2);
                    $factura->em_falta = max(0, round((float) $factura->total_pagar - $factura->total_pago, 2));
                }),
            'metricas' => ResumoMensal::pagamentos($mesRef->month, $mesRef->year),
            'resumoMes' => ResumoMensal::facturas($mesRef->month, $mesRef->year),
            'clientes' => Cliente::where('estado', '!=', 'inativo')->orderBy('nome')->get(['id', 'nome', 'numero_cliente']),
            'diasRetroactivos' => (int) Configuracao::valor('pagamento_dias_retroactivos', 7),
            'creditos' => Credito::selectRaw('cliente_id, sum(valor) as saldo')->groupBy('cliente_id')->get()
                ->filter(fn ($c) => (float) $c->saldo > 0.004)->mapWithKeys(fn ($c) => [$c->cliente_id => round((float) $c->saldo, 2)]),
            'mesReferencia' => MesReferencia::paraSeletor($mesRef),
            'filtros' => [
                ...$periodo,
                'mes' => MesReferencia::foiPedido($request) ? $mesRef->format('Y-m') : '',
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
     *
     * Crédito do cliente: `usar_credito` abate primeiro o saldo a favor dele
     * (fica como pagamento "de crédito", sem dinheiro novo); se o cliente entrega
     * mais do que falta e `guardar_excesso` está marcado, o excesso fica como crédito.
     */
    public function store(Request $request)
    {
        if ($this->caixaFechadaHoje($request->user()->id)) {
            return back()->with('error', 'Já fechou a caixa hoje — não é possível registar mais pagamentos.');
        }

        $data = $request->validate([
            'factura_id' => 'required|exists:facturas,id',
            'valor_pago' => 'required|numeric|min:0',
            'metodo_pagamento' => 'required|in:dinheiro,banco,mpesa,e-mola',
            'referencia_pagamento' => 'nullable|string|max:255',
            'data_pagamento' => 'nullable|date',
            'usar_credito' => 'nullable|boolean',
            'guardar_excesso' => 'nullable|boolean',
        ]);

        [$pagoEm, $erroData] = $this->resolverPagoEm($data['data_pagamento'] ?? null);
        if ($erroData) {
            return back()->withErrors(['data_pagamento' => $erroData])->withInput();
        }

        $factura = Factura::with('cliente.tarifa')->findOrFail($data['factura_id']);

        if (! in_array($factura->estado, ['pendente', 'parcial'], true)) {
            return back()->with('error', 'Esta factura já não aceita pagamentos.');
        }

        $emFalta = $factura->emFalta();
        $valorCredito = ! empty($data['usar_credito']) ? min(Credito::saldoDe($factura->cliente_id), $emFalta) : 0.0;
        $restante = round($emFalta - $valorCredito, 2);
        $valorPago = round((float) $data['valor_pago'], 2);
        $excesso = 0.0;

        if ($valorPago <= 0 && $valorCredito <= 0) {
            return back()->withErrors(['valor_pago' => 'Indique o valor pago.'])->withInput();
        }

        if ($valorPago > $restante + 0.005) {
            if (empty($data['guardar_excesso'])) {
                // Não aceita mais do que o que falta pagar, a não ser que o excesso fique como crédito do cliente.
                return back()->withErrors([
                    'valor_pago' => 'O valor excede o que falta pagar desta factura (MZN '.number_format($restante, 2, ',', ' ').'). Marque "guardar o excesso como crédito" se o cliente deixa o troco.',
                ])->withInput();
            }
            $excesso = round($valorPago - $restante, 2);
            $valorPago = $restante;
        }

        $principal = DB::transaction(function () use ($factura, $data, $valorCredito, $valorPago, $excesso, $pagoEm, $request) {
            $base = [
                'factura_id' => $factura->id,
                'cliente_id' => $factura->cliente_id,
                'metodo_pagamento' => $data['metodo_pagamento'],
                'referencia_pagamento' => $data['referencia_pagamento'] ?? null,
                'pago_em' => $pagoEm,
                'recebido_por' => $request->user()->id,
            ];

            $comCredito = null;
            if ($valorCredito > 0) {
                $comCredito = Pagamento::create([
                    ...$base,
                    'numero_recibo' => $this->proximoRecibo(now()->year),
                    'valor_pago' => $valorCredito,
                    'origem_credito' => true,
                ]);
                Credito::create([
                    'cliente_id' => $factura->cliente_id, 'tipo' => 'utilizacao', 'valor' => -$valorCredito,
                    'pagamento_id' => $comCredito->id, 'recebido_por' => $request->user()->id,
                    'nota' => 'Usado a pagar a factura '.$factura->numero_factura,
                ]);
            }

            $normal = null;
            if ($valorPago > 0) {
                $normal = Pagamento::create([
                    ...$base,
                    'numero_recibo' => $this->proximoRecibo(now()->year),
                    'valor_pago' => $valorPago,
                ]);
            }

            if ($excesso > 0) {
                Credito::create([
                    'cliente_id' => $factura->cliente_id, 'tipo' => 'entrada', 'valor' => $excesso,
                    'metodo_pagamento' => $data['metodo_pagamento'], 'referencia_pagamento' => $data['referencia_pagamento'] ?? null,
                    'pagamento_id' => $normal?->id, 'recebido_por' => $request->user()->id,
                    'pago_em' => $pagoEm ?? now(), 'nota' => 'Excesso do pagamento da factura '.$factura->numero_factura,
                ]);
            }

            $this->recalcularFacturaEDivida($factura);

            return $normal ?? $comCredito;
        });

        $this->enviarReciboEmail(collect([$principal->fresh(['cliente', 'factura'])]), $request->user()->id);

        // Vai directo para o recibo — evita o passo extra de procurar o
        // pagamento acabado de registar na lista.
        return redirect()->route('pagamentos.imprimir', $principal)
            ->with('status', $excesso > 0
                ? 'Pagamento registado. Excesso de MZN '.number_format($excesso, 2, ',', ' ').' guardado como crédito do cliente.'
                : 'Pagamento registado com sucesso.');
    }

    /**
     * Pagamento de várias facturas do MESMO cliente numa só operação.
     *
     * O caixa escolhe as facturas e a repartição (por omissão a mais antiga
     * primeiro — o ecrã propõe-na). Cada parcela vira um pagamento normal da
     * sua factura, com o seu recibo, e todos partilham o mesmo `lote`; assim
     * o estado de cada factura, a dívida, o fecho de caixa e os estornos
     * continuam a funcionar por factura. Tudo ou nada: se uma parcela for
     * inválida, nenhuma é registada. No fim abrem-se os recibos todos juntos.
     */
    public function storeMultiplo(Request $request)
    {
        if ($this->caixaFechadaHoje($request->user()->id)) {
            return back()->with('error', 'Já fechou a caixa hoje — não é possível registar mais pagamentos.');
        }

        $data = $request->validate([
            'parcelas' => 'required|array|min:2|max:24',
            'parcelas.*.factura_id' => 'required|integer|distinct|exists:facturas,id',
            'parcelas.*.valor_pago' => 'required|numeric|min:0.01',
            'metodo_pagamento' => 'required|in:dinheiro,banco,mpesa,e-mola',
            'referencia_pagamento' => 'nullable|string|max:255',
            'data_pagamento' => 'nullable|date',
        ], [
            'parcelas.min' => 'Escolha pelo menos 2 facturas — para uma só, use "Registar pagamento".',
            'parcelas.*.factura_id.distinct' => 'A mesma factura foi escolhida mais de uma vez.',
        ]);

        [$pagoEm, $erroData] = $this->resolverPagoEm($data['data_pagamento'] ?? null);
        if ($erroData) {
            return back()->withErrors(['data_pagamento' => $erroData])->withInput();
        }

        $facturas = Factura::with('cliente.tarifa')
            ->whereIn('id', collect($data['parcelas'])->pluck('factura_id'))
            ->get()
            ->keyBy('id');

        if ($facturas->pluck('cliente_id')->unique()->count() > 1) {
            return back()->with('error', 'Todas as facturas têm de ser do mesmo cliente.');
        }

        foreach ($data['parcelas'] as $indice => $parcela) {
            $factura = $facturas[$parcela['factura_id']];

            if (! in_array($factura->estado, ['pendente', 'parcial'], true)) {
                return back()->with('error', "A factura {$factura->numero_factura} já não aceita pagamentos.");
            }

            $emFalta = $factura->emFalta();
            if ((float) $parcela['valor_pago'] > $emFalta + 0.005) {
                return back()->withErrors([
                    "parcelas.{$indice}.valor_pago" => "O valor excede o que falta pagar da factura {$factura->numero_factura} (MZN ".number_format($emFalta, 2, ',', ' ').').',
                ])->withInput();
            }
        }

        $lote = (string) Str::uuid();

        $pagamentos = DB::transaction(function () use ($data, $facturas, $lote, $pagoEm, $request) {
            return collect($data['parcelas'])->map(function ($parcela) use ($data, $facturas, $lote, $pagoEm, $request) {
                $factura = $facturas[$parcela['factura_id']];

                $pagamento = Pagamento::create([
                    'numero_recibo' => $this->proximoRecibo(now()->year),
                    'factura_id' => $factura->id,
                    'cliente_id' => $factura->cliente_id,
                    'valor_pago' => $parcela['valor_pago'],
                    'metodo_pagamento' => $data['metodo_pagamento'],
                    'referencia_pagamento' => $data['referencia_pagamento'] ?? null,
                    'lote' => $lote,
                    'pago_em' => $pagoEm,
                    'recebido_por' => $request->user()->id,
                ]);

                $this->recalcularFacturaEDivida($factura);

                return $pagamento;
            });
        });

        $pagamentos->each(fn (Pagamento $pagamento) => $pagamento->load(['cliente', 'factura']));
        $this->enviarReciboEmail($pagamentos, $request->user()->id);

        // Um só recibo com todas as facturas (os recibos individuais continuam a existir).
        return redirect()
            ->route('pagamentos.recibo-lote', ['lote' => $lote])
            ->with('status', "{$pagamentos->count()} pagamentos registados (MZN ".number_format((float) $pagamentos->sum('valor_pago'), 2, ',', ' ').').');
    }

    /**
     * Um só recibo para um pagamento de várias facturas: o cliente leva uma
     * folha com todas as facturas pagas e o total. Os recibos individuais
     * (um por factura) continuam disponíveis.
     */
    public function reciboLote(string $lote)
    {
        $pagamentos = Pagamento::where('lote', $lote)
            ->with(['cliente' => fn ($q) => $q->withTrashed(), 'factura', 'recebidoPor' => fn ($q) => $q->withTrashed()])
            ->orderBy('id')
            ->get();

        abort_if($pagamentos->isEmpty(), 404);

        return Inertia::render('Pagamentos/ReciboLote', [
            'pagamentos' => $pagamentos,
            'total' => round((float) $pagamentos->sum('valor_pago'), 2),
        ]);
    }

    /**
     * Estornar de uma vez TODOS os recibos de um pagamento de várias facturas
     * — para quando o erro foi do pagamento inteiro e não de uma factura.
     */
    public function destroyLote(Request $request, string $lote)
    {
        if (! $request->user()->hasRole('administrador')) {
            return back()->with('error', 'Apenas administradores podem estornar pagamentos.');
        }

        $pagamentos = Pagamento::where('lote', $lote)->get();
        abort_if($pagamentos->isEmpty(), 404);

        DB::transaction(function () use ($pagamentos) {
            foreach ($pagamentos as $pagamento) {
                $factura = $pagamento->factura()->with('cliente.tarifa')->first();
                $pagamento->delete();

                if ($factura) {
                    $this->recalcularFacturaEDivida($factura);
                }
            }
        });

        return redirect()->route('pagamentos.index')->with('status', "{$pagamentos->count()} pagamentos estornados com sucesso.");
    }

    /**
     * Data em que o dinheiro foi realmente pago. Por omissão é agora; pode
     * ser anterior (uma transferência confirmada dias depois), até um limite
     * configurável de dias, e nunca no futuro.
     *
     * @return array{0: ?Carbon, 1: ?string} data (null = agora) e mensagem de erro
     */
    private function resolverPagoEm(?string $data): array
    {
        if (! $data) {
            return [null, null];
        }

        $dia = Carbon::parse($data)->startOfDay();

        if ($dia->isToday()) {
            return [null, null];
        }
        if ($dia->isFuture()) {
            return [null, 'A data do pagamento não pode ser no futuro.'];
        }

        $limite = (int) Configuracao::valor('pagamento_dias_retroactivos', 7);
        if ($dia->lt(now()->subDays($limite)->startOfDay())) {
            return [null, "Só é possível registar pagamentos dos últimos {$limite} dia(s)."];
        }

        return [$dia->setTimeFrom(now()), null];
    }

    /** Acrescenta a cada pagamento da página quantos recibos tem o seu lote (null se não for de lote). */
    private function comTotalDoLote($paginador)
    {
        $lotes = $paginador->getCollection()->pluck('lote')->filter()->unique();
        $contagens = $lotes->isEmpty()
            ? collect()
            : Pagamento::whereIn('lote', $lotes)->selectRaw('lote, count(*) as n')->groupBy('lote')->pluck('n', 'lote');

        $paginador->getCollection()->each(
            fn (Pagamento $p) => $p->lote_total = $p->lote ? (int) ($contagens[$p->lote] ?? 1) : null,
        );

        return $paginador;
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

        // Crédito ligado a este pagamento: o excesso que gerou sai (se ainda não foi usado)
        // e o crédito que usou volta para o cliente.
        $entradas = Credito::where('pagamento_id', $pagamento->id)->where('tipo', 'entrada')->get();
        if ($entradas->isNotEmpty() && Credito::saldoDe($pagamento->cliente_id) + 0.005 < (float) $entradas->sum('valor')) {
            return back()->with('error', 'O crédito que este pagamento gerou já foi usado noutras facturas — estorne primeiro esses pagamentos.');
        }

        $factura = $pagamento->factura()->with('cliente.tarifa')->first();

        DB::transaction(function () use ($pagamento, $entradas) {
            Credito::whereIn('id', $entradas->pluck('id'))->delete();
            Credito::where('pagamento_id', $pagamento->id)->where('tipo', 'utilizacao')->delete();
            $pagamento->delete();
        });

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

        if ($pagamentos->isEmpty()) {
            return redirect()->route('pagamentos.index')->with('error', 'Não há pagamentos para imprimir.');
        }

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
            ->where('origem_credito', false)
            ->whereDate('created_at', $data_referencia)
            ->with(['cliente' => fn ($q) => $q->withTrashed(), 'factura'])
            ->orderBy('created_at')
            ->get();

        // Dinheiro que entrou à parte (adiantamentos e excessos) também está na gaveta.
        $adiantamentos = Credito::where('tipo', 'entrada')->where('recebido_por', $utilizador->id)
            ->whereDate('created_at', $data_referencia)->with('cliente')->get();
        [$totalPorMetodo, $totalGeral] = $this->totaisDoDia($pagamentos, $adiantamentos);

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
            'adiantamentos' => $adiantamentos,
            'totalGeral' => $totalGeral,
            'totalPorMetodo' => $totalPorMetodo,
            'esperadoDinheiro' => (float) ($totalPorMetodo['dinheiro'] ?? 0),
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
        // O dinheiro que o caixa contou na gaveta — a diferença para o registado fica gravada.
        $dados = $request->validate(['valor_contado' => 'required|numeric|min:0']);

        $utilizador = $request->user();
        $hoje = now()->toDateString();

        if (FechoCaixa::where('utilizador_id', $utilizador->id)->where('data', $hoje)->exists()) {
            return back()->with('error', 'A caixa de hoje já está fechada.');
        }

        $pagamentos = Pagamento::where('recebido_por', $utilizador->id)
            ->where('origem_credito', false)
            ->whereDate('created_at', $hoje)
            ->get();
        $adiantamentos = Credito::where('tipo', 'entrada')->where('recebido_por', $utilizador->id)->whereDate('created_at', $hoje)->get();
        [$porMetodo, $geral] = $this->totaisDoDia($pagamentos, $adiantamentos);

        $esperadoDinheiro = (float) ($porMetodo['dinheiro'] ?? 0);

        FechoCaixa::create([
            'utilizador_id' => $utilizador->id,
            'data' => $hoje,
            'valor_contado' => $dados['valor_contado'],
            'diferenca' => round((float) $dados['valor_contado'] - $esperadoDinheiro, 2),
            'total_geral' => $geral,
            'total_por_metodo' => $porMetodo,
            'numero_pagamentos' => $pagamentos->count() + $adiantamentos->count(),
            'fechado_por' => $utilizador->id,
        ]);

        return redirect()->route('pagamentos.fecho-caixa')->with('status', 'Caixa fechada com sucesso.');
    }

    /**
     * Totais de dinheiro do dia por método e no geral: pagamentos (sem os feitos
     * com crédito, que não trazem dinheiro) mais adiantamentos/excessos recebidos.
     *
     * @return array{0: array<string, float>, 1: float}
     */
    private function totaisDoDia($pagamentos, $adiantamentos): array
    {
        $porMetodo = $pagamentos->groupBy('metodo_pagamento')->map(fn ($g) => (float) $g->sum('valor_pago'));

        foreach ($adiantamentos->groupBy('metodo_pagamento') as $metodo => $grupo) {
            $porMetodo[$metodo] = round((float) ($porMetodo[$metodo] ?? 0) + (float) $grupo->sum('valor'), 2);
        }

        return [$porMetodo->all(), round((float) $pagamentos->sum('valor_pago') + (float) $adiantamentos->sum('valor'), 2)];
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

    private function enviarReciboEmail($pagamentos, int $enviadoPor): void
    {
        $pagamentos = collect($pagamentos)->filter(fn (Pagamento $pagamento) => filled($pagamento->cliente?->email))->values();
        $cliente = $pagamentos->first()?->cliente;

        if (! $cliente) {
            return;
        }

        RegistoEmail::enviar(new ReciboMail($pagamentos), $cliente->email, [
            'tipo' => 'recibo',
            'origem' => 'automatico',
            'cliente_id' => $cliente->id,
            'factura_id' => $pagamentos->count() === 1 ? $pagamentos->first()->factura_id : null,
            'enviado_por' => $enviadoPor,
        ]);
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
