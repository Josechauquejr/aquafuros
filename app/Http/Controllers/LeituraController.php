<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use App\Models\Leitura;
use App\Support\BuscaDifusa;
use App\Support\Facturacao;
use App\Support\ListaQuery;
use App\Support\MesReferencia;
use App\Support\ResumoMensal;
use Illuminate\Http\Request;
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

        $ultimas = Leitura::orderBy('ano')->orderBy('mes')->get(['cliente_id', 'leitura_actual'])
            ->groupBy('cliente_id')->map(fn ($grupo) => $grupo->last()->leitura_actual);

        return Cliente::where('estado', 'ativo')->orderBy('nome')->get(['id', 'nome', 'leitura_inicial'])
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

        Leitura::create([
            'cliente_id' => $data['cliente_id'],
            'mes' => $data['mes'],
            'ano' => $data['ano'],
            'leitura_anterior' => $leituraAnterior,
            'leitura_actual' => $data['leitura_actual'],
            'confirmado' => false,
            'registado_por' => $request->user()->id,
        ]);

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
}
