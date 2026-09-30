<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use App\Models\Leitura;
use App\Support\ListaQuery;
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
        $search = $request->query('search');
        $estado = $request->query('estado');

        // withTrashed() no cliente: uma leitura antiga não deve perder o
        // nome do cliente só porque este foi entretanto removido.
        $query = Leitura::with([
            'cliente' => fn ($q) => $q->withTrashed(),
            'registadoPor' => fn ($q) => $q->withTrashed(),
            'factura',
        ]);

        $periodo = ListaQuery::periodo($query, $request, 'leituras.created_at');

        if ($search) {
            $query->whereHas('cliente', fn ($c) => $c->withTrashed()->where('nome', 'like', "%{$search}%"));
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
            'clientes' => Cliente::where('estado', 'ativo')->orderBy('nome')->get(['id', 'nome']),
            'totais' => [
                'total' => Leitura::count(),
                'confirmadas' => Leitura::where('confirmado', true)->count(),
                'pendentes' => Leitura::where('confirmado', false)->count(),
                'semFactura' => Leitura::where('confirmado', true)->whereDoesntHave('factura')->count(),
            ],
            'filtros' => [
                ...$periodo,
                'search' => $search ?? '',
                'estado' => in_array($estado, ['pendente', 'confirmada', 'facturada'], true) ? $estado : 'todos',
                'sort' => $sort,
                'dir' => $dir,
            ],
        ]);
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

        $leituraAnterior = $ultima->leitura_actual ?? 0;

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

        $leitura->update($data);

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

        if ($search) {
            $query->whereHas('cliente', fn ($c) => $c->withTrashed()->where('nome', 'like', "%{$search}%"));
        }

        $total = $query->count();

        if ($total === 0) {
            return back()->with('error', 'Não há leituras pendentes para confirmar.');
        }

        $query->update(['confirmado' => true]);

        return back()->with('status', "{$total} leitura(s) confirmada(s) com sucesso.");
    }

    /**
     * Eliminar uma leitura — bloqueado se confirmada ou com factura associada.
     */
    public function destroy(Leitura $leitura)
    {
        if ($leitura->factura) {
            return back()->with('error', 'Não é possível eliminar uma leitura com factura associada.');
        }

        if ($leitura->confirmado) {
            return back()->with('error', 'Não é possível eliminar uma leitura já confirmada.');
        }

        $leitura->delete();

        return back()->with('status', 'Leitura eliminada com sucesso.');
    }
}
