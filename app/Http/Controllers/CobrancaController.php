<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use App\Models\ContactoCobranca;
use App\Models\Credito;
use App\Models\Factura;
use App\Models\PromessaPagamento;
use App\Models\Zona;
use App\Support\Mensagens;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;

/**
 * Cobrança: os clientes com facturas vencidas, o que já se fez com cada um
 * (contactos) e o que prometeram (promessas de pagamento). É a lista de
 * trabalho do gestor para a semana.
 */
class CobrancaController extends Controller
{
    public function index(Request $request)
    {
        PromessaPagamento::avaliarPendentes();

        $search = trim((string) $request->query('search', ''));
        $zonaId = $request->query('zona');
        $filtro = $request->query('filtro', 'todos'); // todos | sem_contacto | com_promessa | promessa_falhada

        $vencidas = Factura::whereIn('estado', ['pendente', 'parcial'])
            ->where('data_vencimento', '<', now()->toDateString())
            ->withSum('pagamentos', 'valor_pago')
            ->get(['id', 'cliente_id', 'total_pagar', 'data_vencimento']);

        $porCliente = $vencidas->groupBy('cliente_id')->map(fn ($facturas) => [
            'facturas' => $facturas->count(),
            'valor' => round((float) $facturas->sum(fn ($f) => max(0, (float) $f->total_pagar - (float) ($f->pagamentos_sum_valor_pago ?? 0))), 2),
            'diasAtraso' => (int) $facturas->min('data_vencimento')->diffInDays(now()->startOfDay()),
        ]);

        $clientes = Cliente::with('zona')->whereIn('id', $porCliente->keys())->get()->keyBy('id');

        $contactos = ContactoCobranca::whereIn('cliente_id', $porCliente->keys())->with('utilizador')
            ->orderByDesc('created_at')->get()->groupBy('cliente_id');
        $promessas = PromessaPagamento::whereIn('cliente_id', $porCliente->keys())->orderByDesc('created_at')->get()->groupBy('cliente_id');

        $linhas = $porCliente->map(function ($dados, $clienteId) use ($clientes, $contactos, $promessas) {
            $cliente = $clientes->get($clienteId);
            if (! $cliente) {
                return null;
            }
            $ultimo = $contactos->get($clienteId)?->first();
            $promessa = $promessas->get($clienteId)?->first();

            return [
                'cliente' => ['id' => $cliente->id, 'nome' => $cliente->nome, 'numero_cliente' => $cliente->numero_cliente, 'telefone' => $cliente->telefone, 'estado' => $cliente->estado],
                'zona' => $cliente->zona?->nome,
                'zona_id' => $cliente->zona_id,
                ...$dados,
                'ultimoContacto' => $ultimo ? [
                    'data' => $ultimo->created_at->toDateString(),
                    'dias' => (int) $ultimo->created_at->startOfDay()->diffInDays(now()->startOfDay()),
                    'canal' => $ultimo->canal,
                    'resultado' => $ultimo->resultado,
                ] : null,
                'promessa' => $promessa ? ['id' => $promessa->id, 'valor' => (float) $promessa->valor, 'data' => $promessa->data_prometida->toDateString(), 'estado' => $promessa->estado] : null,
                'historico' => ($contactos->get($clienteId) ?? collect())->take(5)->map(fn ($c) => [
                    'data' => $c->created_at->toDateTimeString(), 'canal' => $c->canal, 'resultado' => $c->resultado, 'nota' => $c->nota,
                    'utilizador' => $c->utilizador?->name,
                ])->values()->all(),
                'credito' => Credito::saldoDe($cliente->id),
                'whatsapp' => Mensagens::whatsappUrl($cliente->telefone, Mensagens::cobranca($cliente, $dados['valor'], $dados['facturas'])),
            ];
        })->filter()->values();

        $totais = [
            'clientes' => $linhas->count(),
            'valor' => round((float) $linhas->sum('valor'), 2),
            'semContacto' => $linhas->filter(fn ($l) => ! $l['ultimoContacto'] || $l['ultimoContacto']['dias'] >= 15)->count(),
            'promessasPendentes' => $linhas->where('promessa.estado', 'pendente')->count(),
            'promessasFalhadas' => $linhas->where('promessa.estado', 'falhada')->count(),
        ];

        if ($search !== '') {
            $alvo = mb_strtolower($search);
            $linhas = $linhas->filter(fn ($l) => str_contains(mb_strtolower($l['cliente']['nome'].' '.$l['cliente']['numero_cliente'].' '.$l['cliente']['telefone']), $alvo));
        }
        if ($zonaId && $zonaId !== 'todas') {
            $linhas = $linhas->where('zona_id', (int) $zonaId);
        }
        $linhas = match ($filtro) {
            'sem_contacto' => $linhas->filter(fn ($l) => ! $l['ultimoContacto'] || $l['ultimoContacto']['dias'] >= 15),
            'com_promessa' => $linhas->where('promessa.estado', 'pendente'),
            'promessa_falhada' => $linhas->where('promessa.estado', 'falhada'),
            default => $linhas,
        };

        return Inertia::render('Cobranca/Index', [
            'linhas' => $linhas->sortByDesc('valor')->values()->take(150)->all(),
            'totais' => $totais,
            'zonas' => Zona::orderBy('nome')->get(['id', 'nome']),
            'canais' => ContactoCobranca::CANAIS,
            'filtros' => ['search' => $search, 'zona' => $zonaId ?: 'todas', 'filtro' => $filtro],
        ]);
    }

    public function storeContacto(Request $request)
    {
        $data = $request->validate([
            'cliente_id' => 'required|exists:clientes,id',
            'canal' => 'required|in:'.implode(',', ContactoCobranca::CANAIS),
            'resultado' => 'required|in:'.implode(',', ContactoCobranca::RESULTADOS),
            'nota' => 'nullable|string|max:1000',
            'valor' => 'nullable|required_if:resultado,prometeu_pagar|numeric|min:0.01',
            'data_prometida' => 'nullable|required_if:resultado,prometeu_pagar|date|after_or_equal:today',
        ], [
            'valor.required_if' => 'Indique o valor prometido.',
            'data_prometida.required_if' => 'Indique até que dia prometeu pagar.',
            'data_prometida.after_or_equal' => 'A data prometida não pode ser no passado.',
        ]);

        $contacto = ContactoCobranca::create([
            'cliente_id' => $data['cliente_id'],
            'user_id' => $request->user()->id,
            'canal' => $data['canal'],
            'resultado' => $data['resultado'],
            'nota' => $data['nota'] ?? null,
        ]);

        if ($data['resultado'] === 'prometeu_pagar') {
            // Uma promessa nova substitui a anterior ainda pendente do mesmo cliente.
            PromessaPagamento::where('cliente_id', $data['cliente_id'])->where('estado', 'pendente')
                ->update(['estado' => 'cancelada', 'avaliada_em' => now()]);

            PromessaPagamento::create([
                'cliente_id' => $data['cliente_id'],
                'contacto_id' => $contacto->id,
                'valor' => $data['valor'],
                'data_prometida' => Carbon::parse($data['data_prometida'])->toDateString(),
                'criado_por' => $request->user()->id,
            ]);
        }

        return back()->with('status', 'Contacto registado com sucesso.');
    }

    public function cancelarPromessa(PromessaPagamento $promessa)
    {
        if ($promessa->estado === 'pendente') {
            $promessa->update(['estado' => 'cancelada', 'avaliada_em' => now()]);
        }

        return back()->with('status', 'Promessa cancelada.');
    }
}
