<?php

namespace App\Http\Controllers;

use App\Models\Factura;
use App\Models\Leitura;
use App\Services\BillingService;
use App\Support\NumeracaoDocumentos;
use App\Models\Cliente;
use App\Support\BuscaDifusa;
use App\Support\ListaQuery;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
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
        $query = Factura::with([
            'cliente' => fn ($q) => $q->withTrashed()->with('tarifa'),
            'leitura' => fn ($q) => $q->withTrashed(),
            'geradaPor' => fn ($q) => $q->withTrashed(),
            'anuladaPor' => fn ($q) => $q->withTrashed(),
            'pagamentos',
        ]);

        $filtros = $this->aplicarFiltros($query, $request);

        [$sort, $dir] = ListaQuery::ordenar($query, $request, [
            'factura' => fn ($q, $d) => $q->orderBy('facturas.created_at', $d)->orderBy('facturas.id', $d),
            'cliente' => fn ($q, $d) => $q->join('clientes', 'clientes.id', '=', 'facturas.cliente_id')
                ->select('facturas.*')->orderBy('clientes.nome', $d),
            'periodo' => fn ($q, $d) => $q->orderBy('facturas.ano', $d)->orderBy('facturas.mes', $d)->orderBy('facturas.id', $d),
            'total' => fn ($q, $d) => $q->orderBy('facturas.total_pagar', $d),
            // Por pagar → parcial → paga → anulada
            'estado' => fn ($q, $d) => $q->orderByRaw(
                "CASE facturas.estado WHEN 'pendente' THEN 0 WHEN 'parcial' THEN 1 WHEN 'paga' THEN 2 ELSE 3 END {$d}",
            )->orderByDesc('facturas.created_at'),
        ], 'factura', 'desc');

        $facturas = $query->paginate(15)->withQueryString();
        $facturas->getCollection()->each(function (Factura $factura) {
            $factura->total_pago = $factura->totalPago();
            $factura->em_falta = $factura->emFalta();
        });

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
            'totais' => $this->totais($request),
            'filtros' => [...$filtros, 'sort' => $sort, 'dir' => $dir],
            ...$this->facturaAlvo($request),
        ]);
    }

    /**
     * Ligação directa a partir de outra página (ex.: ficha do cliente):
     * ?editar=ID ou ?anular=ID abre logo o formulário dessa factura, mesmo
     * que ela não esteja na página actual da lista.
     *
     * @return array{facturaAlvo: ?Factura, accaoAlvo: ?string}
     */
    private function facturaAlvo(Request $request): array
    {
        $accao = $request->filled('editar') ? 'editar' : ($request->filled('anular') ? 'anular' : null);

        if ($accao === null) {
            return ['facturaAlvo' => null, 'accaoAlvo' => null];
        }

        $factura = Factura::with(['cliente' => fn ($q) => $q->withTrashed(), 'leitura' => fn ($q) => $q->withTrashed(), 'pagamentos'])
            ->find((int) $request->query($accao));

        if ($factura) {
            $factura->total_pago = $factura->totalPago();
            $factura->em_falta = $factura->emFalta();
        }

        return ['facturaAlvo' => $factura, 'accaoAlvo' => $factura ? $accao : null];
    }

    /**
     * Pesquisa, estado, período (data de emissão) e mês de facturação — o
     * mesmo conjunto de filtros para a lista e para "imprimir filtradas".
     * As anuladas ficam excluídas por defeito e só o administrador as pode
     * ver, escolhendo "Anulada". "Vencida" não é um estado guardado: é
     * pendente/parcial com a data de vencimento já passada.
     *
     * @return array<string, mixed> os filtros efectivos (para o frontend)
     */
    private function aplicarFiltros(Builder $query, Request $request): array
    {
        $search = $request->query('search');
        $estado = $request->query('estado');
        $mesAno = $request->query('mes_ano'); // "mes/ano", vindo do resumo mensal

        $estadosPermitidos = ['pendente', 'parcial', 'paga', 'vencida'];
        if ($request->user()?->hasRole('administrador')) {
            $estadosPermitidos[] = 'anulada';
        }
        $estado = in_array($estado, $estadosPermitidos, true) ? $estado : 'todos';

        $periodo = ListaQuery::periodo($query, $request, 'facturas.created_at');

        // Pesquisa difusa: nº da factura e nome do cliente.
        $nomes = Cliente::withTrashed()->pluck('nome', 'id');
        $idsPesquisa = BuscaDifusa::ids(
            Factura::get(['id', 'numero_factura', 'cliente_id']),
            $search,
            fn ($f) => $f->numero_factura.' '.($nomes[$f->cliente_id] ?? ''),
        );
        if ($idsPesquisa !== null) {
            $query->whereIn('facturas.id', $idsPesquisa);
        }

        if ($estado === 'vencida') {
            $query->whereIn('facturas.estado', ['pendente', 'parcial'])->where('facturas.data_vencimento', '<', now());
        } elseif ($estado !== 'todos') {
            $query->where('facturas.estado', $estado);
        } else {
            $query->where('facturas.estado', '!=', 'anulada');
        }

        if (is_string($mesAno) && preg_match('#^(\d{1,2})/(\d{4})$#', $mesAno, $m) && checkdate((int) $m[1], 1, (int) $m[2])) {
            // mês de emissão — o mesmo critério do resumo mensal e dos painéis
            $inicioMes = Carbon::create((int) $m[2], (int) $m[1], 1)->startOfMonth();
            $query->whereBetween('facturas.created_at', [$inicioMes, $inicioMes->copy()->endOfMonth()]);
        } else {
            $mesAno = null;
        }

        return [...$periodo, 'search' => $search ?? '', 'estado' => $estado, 'mes_ano' => $mesAno];
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
            // 15 dias corridos após a emissão — o mesmo prazo já documentado
            // em Tarifas > Regras gerais de cobrança.
            'data_vencimento' => now()->addDays(15)->toDateString(),
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
        // Uma factura só pode ser corrigida enquanto ainda não tem nenhum
        // pagamento registado — editar dívida/multa/estado de uma factura já
        // paga ou parcialmente paga desalinharia o que o cliente já recebeu
        // do que o sistema mostra.
        if ($factura->estado !== 'pendente') {
            return back()->with('error', 'Só é possível editar facturas pendentes, sem pagamentos registados.');
        }

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
     * O motivo é obrigatório para ficar sempre registado porquê, por quem
     * e quando.
     */
    public function destroy(Request $request, Factura $factura)
    {
        $data = $request->validate([
            'motivo_anulacao' => 'required|string|min:5|max:1000',
        ]);

        // Não zera nada manualmente na dívida do cliente: o saldo em aberto
        // é sempre calculado a partir das facturas pendentes/parciais
        // actuais (Cliente::saldoEmAberto()), por isso uma factura anulada
        // deixa automaticamente de contar assim que muda de estado.
        $factura->update([
            'estado' => 'anulada',
            'motivo_anulacao' => $data['motivo_anulacao'],
            'anulada_por' => $request->user()->id,
            'anulada_em' => now(),
        ]);

        // A leitura vai para a lixeira junto com a factura — se ficasse
        // activa, voltaria a aparecer como "confirmada sem factura" e podia
        // ser facturada uma segunda vez. Ao ficar apenas na lixeira (nunca
        // apagada de vez), sai de todos os cálculos automaticamente —
        // Leitura::anterior() e Leitura::ehPrimeira() já ignoram registos na
        // lixeira, por isso a leitura seguinte deste cliente volta a usar a
        // última leitura válida como "anterior", não a que foi anulada.
        $factura->leitura?->delete();

        return redirect()->route('facturas.index')->with('status', 'Factura anulada com sucesso. A leitura associada também foi anulada.');
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
            'leitura' => fn ($q) => $q->withTrashed(),
            'geradaPor' => fn ($q) => $q->withTrashed(),
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
        ]);

        $query = Factura::with([
            'cliente' => fn ($q) => $q->withTrashed()->with('tarifa'),
            'leitura' => fn ($q) => $q->withTrashed(),
            'geradaPor' => fn ($q) => $q->withTrashed(),
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
            // Filtros da lista (pesquisa, estado, período...) — "imprimir filtradas".
            $this->aplicarFiltros($query, $request);
        }

        $facturas = $query->orderBy('numero_factura')->get();

        $primeirasLeituras = $facturas->mapWithKeys(
            fn ($factura) => [$factura->id => $factura->leitura?->ehPrimeira() ?? false],
        );

        $consumosAnteriores = $facturas->mapWithKeys(
            fn ($factura) => [$factura->id => $this->consumoAnterior($factura->leitura)],
        );

        $facturasAnteriores = $facturas->mapWithKeys(
            fn ($factura) => [$factura->id => $this->facturaAnterior($factura)],
        );

        $qrUrls = $facturas->mapWithKeys(
            fn ($factura) => [$factura->id => $this->qrUrl($factura)],
        );

        return Inertia::render('Facturas/ImprimirLote', [
            'facturas' => $facturas,
            'primeirasLeituras' => $primeirasLeituras,
            'consumosAnteriores' => $consumosAnteriores,
            'facturasAnteriores' => $facturasAnteriores,
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
        // Por MÊS DE EMISSÃO (como o "Facturado no mês" dos painéis e o
        // filtro de período da lista). Recebido = pagamentos dessas facturas;
        // Em aberto = o que ainda falta pagar. Anuladas de fora de tudo.
        return Factura::where('estado', '!=', 'anulada')
            ->withSum('pagamentos', 'valor_pago')
            ->get(['id', 'total_pagar', 'estado', 'created_at'])
            ->groupBy(fn ($f) => $f->created_at->format('Y-m'))
            ->map(function ($grupo, $chave) {
                [$ano, $mes] = array_map('intval', explode('-', $chave));
                $pago = fn ($f) => (float) ($f->pagamentos_sum_valor_pago ?? 0);

                return [
                    'mes' => $mes,
                    'ano' => $ano,
                    'quantidade' => $grupo->count(),
                    'total' => round((float) $grupo->sum('total_pagar'), 2),
                    'recebido' => round((float) $grupo->sum($pago), 2),
                    'em_aberto' => round((float) $grupo->whereIn('estado', ['pendente', 'parcial'])
                        ->sum(fn ($f) => max(0, (float) $f->total_pagar - $pago($f))), 2),
                ];
            })
            ->sortByDesc(fn ($linha) => $linha['ano'] * 12 + $linha['mes'])
            ->values();
    }

    /**
     * Totais dos cartões do topo — sobre as facturas que os filtros da lista
     * mostram (sem filtros, todas). Mesma lógica das outras páginas:
     * Recebido = dinheiro já recebido dessas facturas (soma dos pagamentos,
     * incluindo pagamentos parciais) e Em aberto = o que ainda FALTA pagar
     * (não o total das facturas por pagar). Anuladas nunca contam.
     */
    private function totais(Request $request): array
    {
        $query = Factura::query();
        $this->aplicarFiltros($query, $request);

        $facturas = $query->where('facturas.estado', '!=', 'anulada')
            ->withSum('pagamentos', 'valor_pago')
            ->get(['facturas.id', 'facturas.total_pagar', 'facturas.estado', 'facturas.data_vencimento']);

        $emAberto = $facturas->whereIn('estado', ['pendente', 'parcial']);
        $faltaDe = fn ($f) => max(0, (float) $f->total_pagar - (float) ($f->pagamentos_sum_valor_pago ?? 0));

        return [
            'totalFacturado' => round((float) $facturas->sum('total_pagar'), 2),
            'totalPago' => round((float) $facturas->sum(fn ($f) => (float) ($f->pagamentos_sum_valor_pago ?? 0)), 2),
            'totalEmAberto' => round((float) $emAberto->sum($faltaDe), 2),
            'pendentesCount' => $facturas->where('estado', 'pendente')->count(),
            // Só as facturas por pagar já fora do prazo justificam o alerta
            // vermelho — uma factura dentro do prazo ainda não é um problema.
            'vencidasCount' => $emAberto->filter(fn ($f) => $f->data_vencimento?->isPast())->count(),
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
        // withTrashed(): uma factura anulada e movida para a lixeira ainda
        // ocupa o número — ignorá-la geraria um número duplicado.
        return NumeracaoDocumentos::proximoNumero(
            Factura::withTrashed()->where('numero_factura', 'like', "FAT-{$ano}-%"),
            'numero_factura',
            "FAT-{$ano}-%04d",
        );
    }
}
