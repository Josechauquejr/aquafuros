<?php

namespace App\Http\Controllers;

use App\Models\Factura;
use App\Models\EmpresaPerfil;
use App\Models\Leitura;
use App\Services\BillingService;
use App\Support\NumeracaoDocumentos;
use App\Models\Cliente;
use App\Models\Configuracao;
use App\Support\BuscaDifusa;
use App\Support\Facturacao;
use App\Support\FacturaPdf;
use App\Support\ListaQuery;
use App\Support\MesReferencia;
use App\Support\ResumoMensal;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
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
        $mesRef = MesReferencia::resolver($request);

        $query = Factura::with([
            'cliente' => fn ($q) => $q->withTrashed()->with('tarifa'),
            'leitura' => fn ($q) => $q->withTrashed(),
            'leituraEstimada',
            'geradaPor' => fn ($q) => $q->withTrashed(),
            'anuladaPor' => fn ($q) => $q->withTrashed(),
            'pagamentos',
            'facturaSeguinte',
            'origensSaldo' => fn ($q) => $q->with(['pagamentos', 'cliente.tarifa'])
                ->orderBy('ano')->orderBy('mes')->orderBy('facturas.id'),
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
                "CASE facturas.estado WHEN 'pendente' THEN 0 WHEN 'parcial' THEN 1 WHEN 'transferida' THEN 2 WHEN 'paga' THEN 3 ELSE 4 END {$d}",
            )->orderByDesc('facturas.created_at'),
        ], 'factura', 'desc');

        $facturas = $query->paginate(15)->withQueryString();
        $historico = $this->historicoParaPagina($facturas->getCollection());
        $facturas->getCollection()->each(function (Factura $factura) {
            $factura->total_pago = $factura->totalPago();
            $factura->em_falta = $factura->emFalta();
            $factura->multa_prevista = $factura->multaAtrasoPrevista();
            $factura->prepararDocumento();
        });

        return Inertia::render('Facturas/Index', [
            'facturas' => $facturas,
            'primeirasLeituras' => collect($facturas->items())->mapWithKeys(
                fn ($factura) => [$factura->id => $historico[$factura->id]['primeira']],
            ),
            'consumosAnteriores' => collect($facturas->items())->mapWithKeys(
                fn ($factura) => [$factura->id => $historico[$factura->id]['consumo_anterior']],
            ),
            'facturasAnteriores' => collect($facturas->items())->mapWithKeys(
                fn ($factura) => [$factura->id => $historico[$factura->id]['factura_anterior']],
            ),
            'facturasIniciaisEditaveis' => collect($facturas->items())->mapWithKeys(
                fn ($factura) => [$factura->id => $historico[$factura->id]['factura_inicial_editavel']],
            ),
            'qrUrls' => collect($facturas->items())->mapWithKeys(
                fn ($factura) => [$factura->id => $this->qrUrl($factura)],
            ),
            'leiturasDisponiveis' => Leitura::whereDoesntHave('factura')
                ->where('confirmado', true)
                ->with(['cliente' => fn ($q) => $q->withTrashed()])
                ->orderByDesc('ano')->orderByDesc('mes')->get(),
            'resumoMensal' => $this->resumoMensal(),
            'totais' => ResumoMensal::facturas($mesRef->month, $mesRef->year),
            'mesReferencia' => MesReferencia::paraSeletor($mesRef),
            'filtros' => [...$filtros, 'mes' => MesReferencia::foiPedido($request) ? $mesRef->format('Y-m') : '', 'sort' => $sort, 'dir' => $dir],
            ...$this->facturaAlvo($request),
        ]);
    }

    /** Calcula em lote o histórico usado por cada factura da página. */
    private function historicoParaPagina(Collection $facturas): array
    {
        if ($facturas->isEmpty()) {
            return [];
        }

        $clienteIds = $facturas->pluck('cliente_id')->unique()->values();
        $leiturasPorCliente = Leitura::whereIn('cliente_id', $clienteIds)
            ->get(['id', 'cliente_id', 'ano', 'mes', 'leitura_actual', 'leitura_anterior'])
            ->groupBy('cliente_id');
        $clientesComLeituras = Leitura::withTrashed()->whereIn('cliente_id', $clienteIds)
            ->distinct()->pluck('cliente_id')->flip();
        $facturasPorCliente = Factura::whereIn('cliente_id', $clienteIds)
            ->get(['id', 'cliente_id', 'ano', 'mes', 'valor_consumo', 'multa', 'total_pagar'])
            ->groupBy('cliente_id');

        return $facturas->mapWithKeys(function (Factura $factura) use ($leiturasPorCliente, $clientesComLeituras, $facturasPorCliente) {
            $leitura = $factura->leitura;
            $periodo = fn ($registo) => sprintf('%04d-%02d', $registo->ano, $registo->mes);
            $anterioresLeitura = $leitura
                ? $leiturasPorCliente->get($factura->cliente_id, collect())
                    ->filter(fn ($anterior) => $periodo($anterior) < $periodo($leitura))
                    ->sortByDesc($periodo)
                : collect();
            $leituraAnterior = $anterioresLeitura->first();
            $facturaAnterior = $facturasPorCliente->get($factura->cliente_id, collect())
                ->filter(fn ($anterior) => $periodo($anterior) < $periodo($factura))
                ->sortByDesc($periodo)
                ->first();
            $cliente = $factura->cliente;

            return [$factura->id => [
                'primeira' => $leitura !== null && $leituraAnterior === null,
                'consumo_anterior' => $leituraAnterior ? $leituraAnterior->consumo() : null,
                'factura_anterior' => $facturaAnterior,
                'factura_inicial_editavel' => $cliente !== null
                    && $factura->tipo !== 'ligacao'
                    && $factura->leitura_id === null
                    && $factura->leitura_estimada_id === null
                    && ! $clientesComLeituras->has($factura->cliente_id),
            ]];
        })->all();
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

        $factura = Factura::with(['cliente' => fn ($q) => $q->withTrashed(), 'leitura' => fn ($q) => $q->withTrashed(), 'leituraEstimada', 'pagamentos'])
            ->find((int) $request->query($accao));

        if ($factura) {
            $factura->total_pago = $factura->totalPago();
            $factura->em_falta = $factura->emFalta();
            $factura->multa_prevista = $factura->multaAtrasoPrevista();
            $factura->prepararDocumento();
        }

        return [
            'facturaAlvo' => $factura,
            'accaoAlvo' => $factura ? $accao : null,
            'facturaAlvoInicialEditavel' => $factura ? $this->podeEditarFacturaInicial($factura) : false,
        ];
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
        $comMulta = $request->query('com_multa') === '1';

        $estadosPermitidos = ['pendente', 'parcial', 'paga', 'transferida', 'vencida'];
        if ($request->user()?->hasRole('administrador')) {
            $estadosPermitidos[] = 'anulada';
        }
        $estado = in_array($estado, $estadosPermitidos, true) ? $estado : 'todos';

        $periodo = ListaQuery::periodoOuMes($query, $request, 'facturas.created_at');

        // Pesquisa difusa: nº da factura e nome do cliente.
        $nomes = filled($search) ? Cliente::withTrashed()->pluck('nome', 'id') : collect();
        $idsPesquisa = BuscaDifusa::ids(
            fn () => Factura::get(['id', 'numero_factura', 'cliente_id']),
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

        if ($comMulta) {
            $query->where('facturas.multa', '>', 0);
        }

        if (is_string($mesAno) && preg_match('#^(\d{1,2})/(\d{4})$#', $mesAno, $m) && checkdate((int) $m[1], 1, (int) $m[2])) {
            // mês de emissão — o mesmo critério do resumo mensal e dos painéis
            $inicioMes = Carbon::create((int) $m[2], (int) $m[1], 1)->startOfMonth();
            $query->whereBetween('facturas.created_at', [$inicioMes, $inicioMes->copy()->endOfMonth()]);
        } else {
            $mesAno = null;
        }

        return [...$periodo, 'search' => $search ?? '', 'estado' => $estado, 'mes_ano' => $mesAno, 'com_multa' => $comMulta ? '1' : '0'];
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

        $leitura = Leitura::with('cliente.tarifa')->findOrFail($data['leitura_id']);

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

        $geradaPor = $request->user()->id;
        $criadas = DB::transaction(function () use ($geradaPor, $data) {
            $emitidas = collect();
            $candidatas = Leitura::where('confirmado', true)
                ->where('mes', $data['mes'])
                ->where('ano', $data['ano'])
                ->orderBy('id')
                ->get(['id', 'cliente_id']);

            foreach ($candidatas as $candidata) {
                // Serializa lotes concorrentes pelo cliente e pela leitura.
                // A verificação é repetida depois dos bloqueios para que uma
                // segunda execução simplesmente ignore o que já foi emitido.
                $cliente = Cliente::with('tarifa')->lockForUpdate()->find($candidata->cliente_id);
                $leitura = Leitura::whereKey($candidata->id)->lockForUpdate()->first();

                if (! $cliente || ! $leitura
                    || ! $leitura->confirmado
                    || (int) $leitura->mes !== (int) $data['mes']
                    || (int) $leitura->ano !== (int) $data['ano']
                    || Factura::withTrashed()->where('leitura_id', $leitura->id)->exists()) {
                    continue;
                }

                $leitura->setRelation('cliente', $cliente);
                $emitidas->push($this->criarFactura($leitura, $geradaPor));
            }

            return $emitidas;
        });

        if ($criadas->isEmpty()) {
            return back()->with('error', 'Não há leituras confirmadas por facturar nesse período.');
        }

        $mensagem = "{$criadas->count()} factura(s) emitida(s) com sucesso.";

        return redirect()->route('facturas.index')->with('status', $mensagem);
    }

    private function criarFactura(Leitura $leitura, int $geradaPor): Factura
    {
        return Facturacao::emitir($leitura, $geradaPor);
    }

    /**
     * Actualizar valores de uma factura pendente. O estado só muda através
     * dos fluxos próprios de pagamento e anulação.
     */
    public function update(Request $request, Factura $factura)
    {
        $inicialEditavel = $this->podeEditarFacturaInicial($factura);
        $data = $request->validate([
            'divida_anterior' => 'nullable|numeric|min:0',
            'multa' => 'required|numeric|min:0',
            'valor_consumo' => $inicialEditavel ? 'required|numeric|min:0' : 'nullable|numeric|min:0',
            'estado' => 'prohibited',
        ]);

        $resultado = DB::transaction(function () use ($factura, $data) {
            $bloqueada = Factura::whereKey($factura->id)->lockForUpdate()->firstOrFail();
            if ($bloqueada->estado !== 'pendente') {
                return 'estado';
            }
            if ($bloqueada->pagamentos()->exists()) {
                return 'pagamentos';
            }
            if ($bloqueada->tipo === 'consumo_estimado') {
                return 'consumo_estimado';
            }

            $inicialEditavel = $this->podeEditarFacturaInicial($bloqueada);
            if (array_key_exists('valor_consumo', $data)
                && ! $inicialEditavel
                && (float) $data['valor_consumo'] !== (float) $bloqueada->valor_consumo) {
                return 'consumo';
            }

            $valorConsumo = $inicialEditavel
                ? (float) ($data['valor_consumo'] ?? $bloqueada->valor_consumo)
                : (float) $bloqueada->valor_consumo;
            $multa = (float) $data['multa'];
            $dividaAnterior = $bloqueada->divida_anterior_incluida && isset($data['divida_anterior'])
                ? (float) $data['divida_anterior']
                : (float) $bloqueada->divida_anterior;

            $bloqueada->update([
                'valor_consumo' => $valorConsumo,
                'multa' => $multa,
                'divida_anterior' => $dividaAnterior,
                'total_pagar' => $valorConsumo + (float) $bloqueada->saldo_inicial + $multa + (float) $bloqueada->multa_anterior
                    + ($bloqueada->divida_anterior_incluida ? $dividaAnterior : 0) + (float) $bloqueada->valor_acerto_leitura,
            ]);

            return 'actualizada';
        });

        if ($resultado === 'estado') {
            return back()->with('error', 'Só é possível editar facturas pendentes, sem pagamentos registados.');
        }
        if ($resultado === 'pagamentos') {
            return back()->with('error', 'Esta factura já tem pagamentos registados e não pode ser editada.');
        }
        if ($resultado === 'consumo') {
            return back()->with('error', 'O valor do consumo só pode ser alterado na factura inicial do cliente, antes da primeira leitura.');
        }
        if ($resultado === 'consumo_estimado') {
            return back()->with('error', 'A factura estimada preserva o valor aprovado. Anule-a com motivo e registe uma nova estimativa se ainda não tiver pagamentos.');
        }

        return redirect()->route('facturas.index')->with('status', 'Factura actualizada com sucesso.');
    }
    /** Facturas de consumo ainda sem leitura podem ser corrigidas antes do primeiro registo de leitura. */
    private function podeEditarFacturaInicial(Factura $factura): bool
    {
        $cliente = $factura->cliente()->withTrashed()->first();

        return $cliente !== null
            && $factura->tipo !== 'ligacao'
            && $factura->leitura_id === null
            && $factura->leitura_estimada_id === null
            && ! $cliente->leituras()->withTrashed()->exists();
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

        // A anulacao iniciada pela factura usa a mesma ordem dos locks da
        // anulacao iniciada pela leitura: leitura e depois factura.
        $leituraId = $factura->leitura_id;
        $resultado = DB::transaction(function () use ($factura, $leituraId, $data, $request) {
            $leitura = $leituraId
                ? Leitura::withTrashed()->whereKey($leituraId)->lockForUpdate()->first()
                : null;

            $facturaBloqueada = Factura::whereKey($factura->id)->lockForUpdate()->firstOrFail();

            if ($leitura && \App\Models\AcertoLeitura::where('cliente_id', $facturaBloqueada->cliente_id)
                ->whereHas('leituraReal', fn ($q) => $q->where(fn ($q) => $q->where('ano', '>', $leitura->ano)
                    ->orWhere(fn ($q) => $q->where('ano', $leitura->ano)->where('mes', '>=', $leitura->mes))))
                ->exists()) {
                return 'ciclo_estimado';
            }

            if ($facturaBloqueada->pagamentos()->exists()) {
                return 'pagamentos';
            }

            if ($facturaBloqueada->estado === 'anulada') {
                return 'anulada';
            }

            $facturaBloqueada->update([
                'estado' => 'anulada',
                'motivo_anulacao' => $data['motivo_anulacao'],
                'anulada_por' => $request->user()->id,
                'anulada_em' => now(),
            ]);

            if ($facturaBloqueada->leitura_estimada_id) {
                \App\Models\LeituraEstimada::whereKey($facturaBloqueada->leitura_estimada_id)
                    ->where('estado', 'facturada')->update(['estado' => 'factura_anulada']);
            }

            if ($leitura && ! $leitura->trashed()) {
                $leitura->delete();
            }

            return 'anulada_com_sucesso';
        });

        if ($resultado === 'pagamentos') {
            return back()->with('error', 'Esta factura tem pagamentos registados. Estorne os pagamentos primeiro (apenas administradores) e só depois anule a factura.');
        }
        if ($resultado === 'ciclo_estimado') {
            return back()->with('error', 'Esta factura pertence a uma sequência que sustenta um ciclo estimado reconciliado e não pode ser anulada.');
        }
        if ($resultado === 'anulada') {
            return back()->with('error', 'Esta factura já está anulada.');
        }

        return redirect()->route('facturas.index')->with('status', 'Factura anulada com sucesso. A leitura associada também foi anulada.');
    }
    /** A factura em PDF, aberta no browser. */
    public function pdf(Factura $factura)
    {
        return response(FacturaPdf::gerar($factura), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.FacturaPdf::nomeFicheiro($factura).'"',
        ]);
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
            'leituraEstimada',
            'geradaPor' => fn ($q) => $q->withTrashed(),
            'pagamentos' => fn ($q) => $q->orderBy('created_at'),
        ]);
        $factura->multa_prevista = $factura->multaAtrasoPrevista();
        $factura->prepararDocumento();

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
            'leituraEstimada',
            'geradaPor' => fn ($q) => $q->withTrashed(),
            'pagamentos',
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
        $facturas->each(function (Factura $factura) {
            $factura->multa_prevista = $factura->multaAtrasoPrevista();
            $factura->prepararDocumento();
        });

        // Nada para imprimir (ex.: filtros sem resultados): não abre uma folha vazia.
        if ($facturas->isEmpty()) {
            return redirect()->route('facturas.index')->with('error', 'Não há facturas para imprimir com estes filtros.');
        }

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
            'empresa' => EmpresaPerfil::atual()->toArray(),
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
            ->get(['id', 'total_pagar', 'divida_anterior', 'divida_anterior_incluida', 'estado', 'created_at'])
            ->groupBy(fn ($f) => $f->created_at->format('Y-m'))
            ->map(function ($grupo, $chave) {
                [$ano, $mes] = array_map('intval', explode('-', $chave));
                $pago = fn ($f) => (float) ($f->pagamentos_sum_valor_pago ?? 0);

                return [
                    'mes' => $mes,
                    'ano' => $ano,
                    'quantidade' => $grupo->count(),
                    'total' => round((float) $grupo->sum(fn ($f) => $f->valorProprio()), 2),
                    'recebido' => round((float) $grupo->sum($pago), 2),
                    'em_aberto' => round((float) $grupo->whereIn('estado', ['pendente', 'parcial'])
                        ->sum(fn ($f) => max(0, (float) $f->total_pagar - $pago($f))), 2),
                ];
            })
            ->sortByDesc(fn ($linha) => $linha['ano'] * 12 + $linha['mes'])
            ->values();
    }

    /**
     * URL assinada (Laravel signed route) para a página pública de
     * verificação de autenticidade desta factura — codificada no QR code
     * impresso no documento.
     */
    private function qrUrl(Factura $factura): string
    {
        return URL::signedRoute('verificacao.factura', ['factura' => $factura]);
    }
}
