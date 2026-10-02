<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use App\Models\Factura;
use App\Models\Leitura;
use App\Models\LeituraCorreccao;
use App\Services\BillingService;
use App\Support\BuscaDifusa;
use App\Support\Facturacao;
use App\Support\ListaQuery;
use App\Support\MesReferencia;
use App\Support\ResumoMensal;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class LeituraController extends Controller
{
    /**
     * Listar leituras paginadas, com pesquisa por cliente, período, filtro
     * de estado (pendente/confirmada/facturada) e ordenação por cabeçalho,
     * tudo aplicado no servidor.
     */
    public function index(Request $request)
    {
        $mesRef = MesReferencia::resolver($request);

        $search = $request->query('search');
        $estado = $request->query('estado');

        // withTrashed() no cliente: uma leitura antiga não deve perder o
        // nome do cliente só porque este foi entretanto removido.
        $query = Leitura::with([
            'cliente' => fn ($q) => $q->withTrashed(),
            'registadoPor' => fn ($q) => $q->withTrashed(),
            'factura',
            'correccaoActiva.user:id,name',
        ]);

        $periodo = ListaQuery::periodoOuMes($query, $request, 'leituras.created_at', 'todos', ['leituras.mes', 'leituras.ano']);

        if (($idsClientes = BuscaDifusa::idsClientes($search)) !== null) {
            $query->whereIn('leituras.cliente_id', $idsClientes);
        }

        // Pendente → confirmada (sem factura) → facturada: a mesma ordem
        // lógica usada ao ordenar por estado.
        match ($estado) {
            'pendente' => $query->where('confirmado', false),
            'confirmada' => $query->where('confirmado', true)->whereDoesntHave('factura'),
            'facturada' => $query->whereHas('factura'),
            default => null,
        };

        [$sort, $dir] = ListaQuery::ordenar($query, $request, [
            'periodo' => fn ($q, $d) => $q->orderBy('leituras.ano', $d)->orderBy('leituras.mes', $d)->orderBy('leituras.id', $d),
            'cliente' => fn ($q, $d) => $q->join('clientes', 'clientes.id', '=', 'leituras.cliente_id')
                ->select('leituras.*')->orderBy('clientes.nome', $d),
            'consumo' => fn ($q, $d) => $q->orderByRaw("(leituras.leitura_actual - leituras.leitura_anterior) {$d}"),
            'estado' => fn ($q, $d) => $q->orderByRaw(
                'CASE WHEN leituras.confirmado THEN '
                ."(CASE WHEN EXISTS (SELECT 1 FROM facturas WHERE facturas.leitura_id = leituras.id AND facturas.deleted_at IS NULL) THEN 2 ELSE 1 END)"
                ." ELSE 0 END {$d}",
            )->orderByDesc('leituras.ano')->orderByDesc('leituras.mes'),
        ], 'periodo', 'desc');

        return Inertia::render('Leituras/Index', [
            'leituras' => $query->paginate(15)->withQueryString(),
            'clientes' => $this->clientesParaLeitura(),
            'totais' => ResumoMensal::leituras($mesRef->month, $mesRef->year),
            'resumoMes' => ResumoMensal::facturas($mesRef->month, $mesRef->year),
            'pendentesTotal' => Leitura::where('confirmado', false)->count(),
            'facturarAoConfirmar' => Facturacao::facturarAoConfirmar(),
            'mesReferencia' => MesReferencia::paraSeletor($mesRef),
            'filtros' => [
                ...$periodo,
                'mes' => MesReferencia::foiPedido($request) ? $mesRef->format('Y-m') : '',
                'search' => $search ?? '',
                'estado' => in_array($estado, ['pendente', 'confirmada', 'facturada'], true) ? $estado : 'todos',
                'sort' => $sort,
                'dir' => $dir,
            ],
        ]);
    }

    /**
     * Clientes activos com o que é preciso para avisar antes de registar
     * uma leitura suspeita: a leitura anterior que será usada e o consumo
     * médio das leituras já registadas.
     */
    private function clientesParaLeitura()
    {
        $medias = Leitura::selectRaw('cliente_id, AVG(leitura_actual - leitura_anterior) as media')
            ->groupBy('cliente_id')->pluck('media', 'cliente_id');

        $activos = Cliente::where('estado', 'ativo')->orderBy('nome')->get(['id', 'nome', 'leitura_inicial']);

        // Última leitura de cada cliente activo (a do mês mais recente), só dessas
        // linhas — antes lia a tabela de leituras inteira em cada visita.
        $ultimas = Leitura::whereIn('cliente_id', $activos->pluck('id'))
            ->whereNotExists(fn ($q) => $q->from('leituras as posterior')
                ->whereColumn('posterior.cliente_id', 'leituras.cliente_id')
                ->whereNull('posterior.deleted_at')
                ->whereRaw('(posterior.ano * 100 + posterior.mes) > (leituras.ano * 100 + leituras.mes)'))
            ->pluck('leitura_actual', 'cliente_id');

        return $activos
            ->map(fn ($c) => [
                'id' => $c->id,
                'nome' => $c->nome,
                'leitura_anterior' => (float) ($ultimas[$c->id] ?? $c->leitura_inicial ?? 0),
                'consumo_medio' => isset($medias[$c->id]) ? round((float) $medias[$c->id], 2) : null,
            ])->values();
    }

    /**
     * Guardar uma nova leitura na base de dados.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'cliente_id' => 'required|exists:clientes,id',
            'mes' => 'required|integer|min:1|max:12',
            'ano' => 'required|integer|min:2000|max:2100',
            'leitura_actual' => 'required|numeric|min:0',
        ]);

        $existe = Leitura::where('cliente_id', $data['cliente_id'])
            ->where('mes', $data['mes'])
            ->where('ano', $data['ano'])
            ->exists();

        if ($existe) {
            return back()->withErrors(['leitura_actual' => 'Já existe uma leitura para este cliente neste período.'])->withInput();
        }

        $ultima = Leitura::where('cliente_id', $data['cliente_id'])
            ->orderByDesc('ano')->orderByDesc('mes')->first();

        // Primeira leitura do cliente: parte da leitura inicial do contador
        // registada no cliente (só cai para 0 em clientes antigos sem ela).
        $leituraAnterior = $ultima->leitura_actual ?? Cliente::find($data['cliente_id'])?->leitura_inicial ?? 0;

        if ($data['leitura_actual'] < $leituraAnterior) {
            return back()->withErrors([
                'leitura_actual' => "A leitura actual não pode ser menor que a leitura anterior ({$leituraAnterior}).",
            ])->withInput();
        }

        $nova = Leitura::create([
            'cliente_id' => $data['cliente_id'],
            'mes' => $data['mes'],
            'ano' => $data['ano'],
            'leitura_anterior' => $leituraAnterior,
            'leitura_actual' => $data['leitura_actual'],
            'confirmado' => false,
            'registado_por' => $request->user()->id,
        ]);

        // O administrador é logo perguntado se confirma a leitura (ver Leituras/Index).
        if ($request->user()->hasRole('administrador')) {
            $request->session()->flash('leituraRegistada', [
                ...$nova->only(['id', 'cliente_id', 'mes', 'ano', 'leitura_anterior', 'leitura_actual']),
                'cliente' => ['nome' => Cliente::find($nova->cliente_id)?->nome],
            ]);
        }

        return back()->with('status', 'Leitura registada com sucesso.');
    }

    /**
     * Actualizar (ou confirmar) uma leitura — bloqueado depois de confirmada.
     */
    public function update(Request $request, Leitura $leitura)
    {
        if ($leitura->confirmado) {
            return back()->with('error', 'Esta leitura já foi confirmada e não pode ser alterada.');
        }

        $data = $request->validate([
            'leitura_actual' => "required|numeric|min:{$leitura->leitura_anterior}",
            'confirmado' => 'boolean',
        ]);

        if (! empty($data['confirmado'])) {
            $data['confirmado_por'] = $request->user()->id;
            $data['confirmado_em'] = now();
        }

        $leitura->update($data);

        // Aprovada a leitura, a factura sai logo (e por email a quem tem email) se o automatismo estiver ligado.
        if (! empty($data['confirmado'])) {
            $emitidas = Facturacao::aoConfirmar(collect([$leitura->fresh()]), $request->user()->id);

            if ($emitidas->isNotEmpty()) {
                $factura = $emitidas->first();
                $email = $factura->cliente?->email;

                return back()->with('status', "Leitura confirmada e factura {$factura->numero_factura} emitida"
                    .($email && Facturacao::enviarAoEmitir() ? " — a enviar por email para {$email}." : ($email ? '.' : ' (o cliente não tem email, não foi enviada).')));
            }
        }

        return back()->with('status', 'Leitura actualizada com sucesso.');
    }

    /**
     * Confirmar todas as leituras pendentes que respeitem o filtro de
     * pesquisa actual — usado pelo botão "Confirmar todas".
     */
    public function confirmarTodas(Request $request)
    {
        $search = $request->input('search');
        $ids = array_filter((array) $request->input('ids', []), 'is_numeric');

        $query = Leitura::where('confirmado', false);

        // Selecção explícita (barra de acções em massa) — só essas leituras.
        if ($ids) {
            $query->whereIn('id', $ids);
        }

        if (($idsClientes = BuscaDifusa::idsClientes($search)) !== null) {
            $query->whereIn('cliente_id', $idsClientes);
        }

        $total = $query->count();

        if ($total === 0) {
            return back()->with('error', 'Não há leituras pendentes para confirmar.');
        }

        $alvo = (clone $query)->pluck('id');
        $query->update(['confirmado' => true, 'confirmado_por' => $request->user()->id, 'confirmado_em' => now()]);

        $mensagem = "{$total} leitura(s) confirmada(s) com sucesso.";
        $emitidas = Facturacao::aoConfirmar(Leitura::whereIn('id', $alvo)->get(), $request->user()->id);

        if ($emitidas->isNotEmpty()) {
            $comEmail = $emitidas->filter(fn ($f) => filled($f->cliente?->email))->count();
            $mensagem .= " {$emitidas->count()} factura(s) emitida(s)"
                .(Facturacao::enviarAoEmitir() ? ", {$comEmail} a enviar por email (".($emitidas->count() - $comEmail).' cliente(s) sem email).' : '.');
        }

        return back()->with('status', $mensagem);
    }

    /**
     * Anular uma leitura — a mesma ideia das facturas: motivo obrigatório,
     * fica registado quem e quando, e vai para a lixeira (nunca é apagada de
     * vez). Se já tem factura, a factura é anulada junto; se a factura tem
     * pagamentos, estes têm de ser estornados primeiro.
     */
    public function destroy(Request $request, Leitura $leitura)
    {
        $data = $request->validate([
            'motivo_anulacao' => 'required|string|min:5|max:1000',
        ]);

        $factura = $leitura->factura;

        if ($factura?->pagamentos()->exists()) {
            return back()->with('error', 'A factura desta leitura tem pagamentos registados. Estorne os pagamentos primeiro (apenas administradores) e só depois anule a leitura.');
        }

        $agora = now();
        $userId = $request->user()->id;

        if ($factura && $factura->estado !== 'anulada') {
            $factura->update([
                'estado' => 'anulada',
                'motivo_anulacao' => "Leitura anulada: {$data['motivo_anulacao']}",
                'anulada_por' => $userId,
                'anulada_em' => $agora,
            ]);
        }

        $leitura->update([
            'motivo_anulacao' => $data['motivo_anulacao'],
            'anulada_por' => $userId,
            'anulada_em' => $agora,
        ]);
        $leitura->delete();

        return back()->with('status', $factura
            ? 'Leitura anulada com sucesso. A factura associada também foi anulada.'
            : 'Leitura anulada com sucesso.');
    }

    /**
     * Corrigir uma leitura JÁ CONFIRMADA — só o administrador. Exige motivo e
     * fica registado (e pode ser desfeito). Se a leitura tem factura, o valor
     * do consumo e o total são recalculados; a leitura seguinte do cliente, se
     * ainda pendente, passa a partir do novo valor. Não se corrige quando já
     * há pagamentos ou uma leitura posterior confirmada.
     */
    public function corrigir(Request $request, Leitura $leitura)
    {
        if (! $leitura->confirmado) {
            return back()->with('error', 'Esta leitura ainda não foi confirmada: edite-a normalmente.');
        }

        $data = $request->validate([
            'leitura_actual' => "required|numeric|min:{$leitura->leitura_anterior}",
            'motivo' => 'required|string|min:5|max:1000',
        ]);

        if (round((float) $data['leitura_actual'], 2) === round((float) $leitura->leitura_actual, 2)) {
            return back()->withErrors(['leitura_actual' => 'O valor é igual ao actual: não há nada a corrigir.']);
        }

        $seguinte = Leitura::where('cliente_id', $leitura->cliente_id)
            ->where(fn ($q) => $q->where('ano', '>', $leitura->ano)
                ->orWhere(fn ($q) => $q->where('ano', $leitura->ano)->where('mes', '>', $leitura->mes)))
            ->orderBy('ano')->orderBy('mes')->first();

        if ($seguinte?->confirmado) {
            return back()->with('error', "Já existe uma leitura mais recente confirmada ({$seguinte->mes}/{$seguinte->ano}). Corrija primeiro essa, ou anule-a.");
        }
        if ($seguinte && (float) $data['leitura_actual'] > (float) $seguinte->leitura_actual) {
            return back()->withErrors(['leitura_actual' => "Não pode ser maior que a leitura seguinte ({$seguinte->leitura_actual})."]);
        }

        $factura = $leitura->factura;
        if ($factura?->pagamentos()->exists()) {
            return back()->with('error', 'A factura desta leitura já tem pagamentos. Estorne-os primeiro e só depois corrija a leitura.');
        }
        if ($factura && $factura->estado !== 'anulada' && ! $leitura->cliente?->tarifa) {
            return back()->with('error', 'O cliente não tem tarifa: não é possível recalcular a factura.');
        }

        $afectaFactura = $factura && $factura->estado !== 'anulada';
        $antes = (float) $leitura->leitura_actual;
        $facturaAntes = $afectaFactura ? $factura->only(['valor_consumo', 'total_pagar']) : null;

        DB::transaction(function () use ($request, $data, $leitura, $seguinte, $factura, $afectaFactura, $antes, $facturaAntes) {
            $leitura->update(['leitura_actual' => $data['leitura_actual']]);

            if ($seguinte) {
                $seguinte->update(['leitura_anterior' => $data['leitura_actual']]);
            }

            if ($afectaFactura) {
                $valor = app(BillingService::class)->valorConsumo($leitura, $leitura->cliente);
                $factura->update([
                    'valor_consumo' => $valor,
                    'total_pagar' => round($valor + (float) $factura->multa + ($factura->divida_anterior_incluida ? (float) $factura->divida_anterior : 0), 2),
                ]);
            }

            LeituraCorreccao::create([
                'leitura_id' => $leitura->id,
                'user_id' => $request->user()->id,
                'leitura_antes' => $antes,
                'leitura_depois' => $data['leitura_actual'],
                'motivo' => $data['motivo'],
                'factura_id' => $afectaFactura ? $factura->id : null,
                'factura_antes' => $facturaAntes,
                'leitura_seguinte_id' => $seguinte?->id,
                'leitura_seguinte_anterior_antes' => $seguinte ? $antes : null,
            ]);
        });

        return back()->with('status', $afectaFactura
            ? "Leitura corrigida. A factura {$factura->numero_factura} foi recalculada: novo total ".number_format((float) $factura->fresh()->total_pagar, 2, ',', ' ').' MZN.'
            : 'Leitura corrigida.');
    }

    /** Desfaz a última correcção de uma leitura: repõe a leitura, a leitura seguinte e a factura. */
    public function desfazerCorreccao(Request $request, LeituraCorreccao $correccao)
    {
        $leitura = $correccao->leitura;

        if ($correccao->desfeita_em) {
            return back()->with('error', 'Esta correcção já foi desfeita.');
        }
        if ($leitura->trashed() || (float) $leitura->leitura_actual !== (float) $correccao->leitura_depois) {
            return back()->with('error', 'A leitura mudou depois desta correcção: já não é possível desfazê-la.');
        }

        $factura = $correccao->factura_id ? Factura::find($correccao->factura_id) : null;
        if ($factura?->pagamentos()->exists()) {
            return back()->with('error', 'A factura já tem pagamentos: estorne-os antes de desfazer a correcção.');
        }

        DB::transaction(function () use ($request, $correccao, $leitura, $factura) {
            $leitura->update(['leitura_actual' => $correccao->leitura_antes]);

            if ($correccao->leitura_seguinte_id) {
                Leitura::whereKey($correccao->leitura_seguinte_id)->update(['leitura_anterior' => $correccao->leitura_seguinte_anterior_antes]);
            }
            if ($factura && $correccao->factura_antes) {
                $factura->update($correccao->factura_antes);
            }

            $correccao->update(['desfeita_em' => now(), 'desfeita_por' => $request->user()->id]);
        });

        return back()->with('status', 'Correcção desfeita: a leitura'.($factura ? ' e a factura voltaram' : ' voltou').' aos valores anteriores.');
    }
}
