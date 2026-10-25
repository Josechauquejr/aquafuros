<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Cliente;
use App\Models\AjusteLeitura;
use App\Models\Leitura;
use App\Models\Pagamento;
use App\Support\BuscaDifusa;
use App\Support\ListaQuery;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

/**
 * Lixeira administrativa numa só página (com pesquisa, período, filtro por
 * tipo e ordenação, como as outras listas): clientes, e leituras/pagamentos
 * eliminados isoladamente (não como parte de apagar um cliente; esses já
 * ficam cobertos pela lixeira do próprio cliente). Clientes e leituras sem
 * histórico financeiro ficam 30 dias; pagamentos anulados são preservados
 * para auditoria. Não há tarefa agendada (cron) configurada no alojamento
 * actual, por isso a purga das leituras expiradas corre
 * aqui mesmo, sempre que a página é aberta — suficiente para o volume desta
 * app, sem depender de infra extra.
 */
class LixeiraController extends Controller
{
    private const DIAS_RETENCAO = 30;

    private const TIPOS = ['clientes', 'leituras', 'pagamentos'];

    private const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    public function index(Request $request)
    {
        $tipo = in_array($request->query('tipo'), self::TIPOS, true) ? $request->query('tipo') : 'clientes';
        $search = $request->query('search');

        $this->purgarExpirados();

        $tabela = ['clientes' => 'clientes', 'leituras' => 'leituras', 'pagamentos' => 'pagamentos'][$tipo];

        $query = match ($tipo) {
            'clientes' => Cliente::onlyTrashed()
                ->with('tarifa')
                ->withCount([
                    'facturas' => fn ($q) => $q->withTrashed(),
                    'leituras' => fn ($q) => $q->withTrashed(),
                    'pagamentos' => fn ($q) => $q->withTrashed(),
                ]),
            'leituras' => Leitura::onlyTrashed()
                ->whereDoesntHave('factura')
                ->whereHas('cliente', fn ($q) => $q->whereNull('deleted_at'))
                ->with(['cliente' => fn ($q) => $q->withTrashed()]),
            'pagamentos' => Pagamento::onlyTrashed()
                ->whereHas('cliente', fn ($q) => $q->whereNull('deleted_at'))
                ->with(['cliente' => fn ($q) => $q->withTrashed(), 'factura']),
        };

        $periodo = ListaQuery::periodo($query, $request, "{$tabela}.deleted_at");

        $nomes = filled($search) ? Cliente::withTrashed()->pluck('nome', 'id') : collect();
        $idsPesquisa = BuscaDifusa::ids(
            fn () => (clone $query)->get(),
            $search,
            fn ($linha) => match ($tipo) {
                'clientes' => "{$linha->nome} {$linha->numero_cliente} {$linha->bairro}",
                'leituras' => ($nomes[$linha->cliente_id] ?? '').' '.self::MESES[$linha->mes - 1].' '.$linha->ano,
                'pagamentos' => "{$linha->numero_recibo} ".($nomes[$linha->cliente_id] ?? '').' '.($linha->factura?->numero_factura ?? ''),
            },
        );
        if ($idsPesquisa !== null) {
            $query->whereIn("{$tabela}.id", $idsPesquisa);
        }

        [$sort, $dir] = ListaQuery::ordenar($query, $request, [
            'eliminado' => fn ($q, $d) => $q->orderBy("{$tabela}.deleted_at", $d),
            'item' => fn ($q, $d) => match ($tipo) {
                'clientes' => $q->orderBy('clientes.nome', $d),
                'pagamentos' => $q->orderBy('pagamentos.numero_recibo', $d),
                'leituras' => $q->join('clientes', 'clientes.id', '=', 'leituras.cliente_id')
                    ->select('leituras.*')->orderBy('clientes.nome', $d),
            },
        ], 'eliminado', 'desc');

        $linhas = $query->paginate(15)->withQueryString()
            ->through(fn ($linha) => $this->linha($tipo, $linha));

        return Inertia::render('Lixeira/Index', [
            'linhas' => $linhas,
            'diasRetencao' => self::DIAS_RETENCAO,
            'filtros' => [
                ...$periodo,
                'tipo' => $tipo,
                'search' => $search ?? '',
                'sort' => $sort,
                'dir' => $dir,
            ],
        ]);
    }

    /** Forma comum das linhas dos 3 tipos (o que a tabela mostra). */
    private function linha(string $tipo, $linha): array
    {
        $base = [
            'id' => $linha->id,
            'tipo' => $tipo,
            'eliminado_em' => $linha->deleted_at,
            'dias_restantes' => $tipo === 'pagamentos' ? null : $this->diasRestantes($linha->deleted_at),
            'preservado' => $tipo === 'pagamentos',
        ];

        return match ($tipo) {
            'clientes' => $base + [
                'titulo' => $linha->nome,
                'subtitulo' => collect([$linha->numero_cliente, $linha->bairro, $linha->tarifa?->nome])->filter()->implode(' · '),
                'detalhe' => "{$linha->facturas_count} factura(s), {$linha->leituras_count} leitura(s), {$linha->pagamentos_count} pagamento(s)",
                // Com facturas/pagamentos no histórico nunca é apagado
                // automaticamente (registos financeiros reais).
                'preservado' => $this->temHistoricoFinanceiro($linha),
            ],
            'leituras' => $base + [
                'titulo' => $linha->cliente?->nome ?? 'Cliente removido',
                'subtitulo' => 'Leitura de '.self::MESES[$linha->mes - 1].'/'.$linha->ano,
                'detalhe' => 'Leitura actual '.number_format((float) $linha->leitura_actual, 2, ',', ' '),
            ],
            'pagamentos' => $base + [
                'titulo' => $linha->numero_recibo,
                'subtitulo' => $linha->cliente?->nome ?? 'Cliente removido',
                'detalhe' => collect([
                    'MZN '.number_format((float) $linha->valor_pago, 2, ',', ' '),
                    $linha->metodo_pagamento,
                    $linha->factura?->numero_factura,
                ])->filter()->implode(' · '),
            ],
        };
    }

    public function restaurar(int $id)
    {
        $cliente = Cliente::onlyTrashed()->findOrFail($id);

        DB::transaction(function () use ($cliente) {
            $cliente->pagamentos()->onlyTrashed()->restore();
            $cliente->facturas()->onlyTrashed()->restore();
            $cliente->leituras()->onlyTrashed()->restore();
            $cliente->restore();
        });

        return $this->voltar('clientes')->with('status', "Cliente {$cliente->nome} recuperado com sucesso.");
    }

    public function destroyDefinitivo(int $id)
    {
        $cliente = Cliente::onlyTrashed()->findOrFail($id);

        if ($this->temHistoricoFinanceiro($cliente)) {
            return $this->voltar('clientes')->with('error', 'Este cliente tem facturas ou pagamentos no histórico. Recupere o cliente; os registos financeiros não podem ser apagados definitivamente.');
        }

        $nome = $cliente->nome;

        $this->purgarCliente($cliente);

        return $this->voltar('clientes')->with('status', "Cliente {$nome} eliminado definitivamente.");
    }

    public function restaurarLeitura(int $id)
    {
        $leitura = Leitura::onlyTrashed()->findOrFail($id);
        $ajusteRevertido = AjusteLeitura::where('leitura_id', $leitura->id)
            ->whereIn('tipo', ['insercao_retroactiva'])
            ->whereHas('reversao')
            ->exists();
        if ($ajusteRevertido) {
            return $this->voltar('leituras')->with('error', 'Esta leitura foi removida por uma reversão auditada e não pode ser restaurada pela lixeira.');
        }

        $leitura->restore();

        return $this->voltar('leituras')->with('status', 'Leitura recuperada com sucesso.');
    }

    public function destroyLeituraDefinitivo(int $id)
    {
        Leitura::onlyTrashed()->findOrFail($id)->forceDelete();

        return $this->voltar('leituras')->with('status', 'Leitura eliminada definitivamente.');
    }

    public function restaurarPagamento(int $id)
    {
        $pagamento = Pagamento::onlyTrashed()->with('factura')->findOrFail($id);
        $pagamento->restore();

        if ($pagamento->factura) {
            app(\App\Http\Controllers\PagamentoController::class)->recalcularFacturaEDivida($pagamento->factura);
        }

        return $this->voltar('pagamentos')->with('status', 'Pagamento recuperado com sucesso.');
    }

    public function destroyPagamentoDefinitivo(int $id)
    {
        Pagamento::onlyTrashed()->findOrFail($id);

        return $this->voltar('pagamentos')->with('error', 'Pagamentos anulados são mantidos no histórico de auditoria e não podem ser apagados definitivamente.');
    }

    private function voltar(string $tipo)
    {
        return redirect()->route('lixeira.index', ['tipo' => $tipo]);
    }

    private function purgarExpirados(): void
    {
        $limite = Carbon::now()->subDays(self::DIAS_RETENCAO);

        Cliente::onlyTrashed()
            ->where('deleted_at', '<=', $limite)
            ->get()
            ->each(function (Cliente $cliente) {
                // Um cliente com facturas ou pagamentos no histórico nunca é
                // apagado de vez, mesmo depois dos 30 dias — perder essas
                // facturas/recibos seria perder registos fiscais/financeiros
                // reais. Fica na lixeira indefinidamente, só recuperável ou
                // visível aqui (não conta para nada como cliente activo).
                if ($this->temHistoricoFinanceiro($cliente)) {
                    return;
                }

                $this->purgarCliente($cliente);
            });

        // Leituras eliminadas isoladamente (sem factura e com cliente activo).
        Leitura::onlyTrashed()
            ->whereDoesntHave('factura')
            ->whereHas('cliente', fn ($q) => $q->whereNull('deleted_at'))
            ->where('deleted_at', '<=', $limite)
            ->forceDelete();

        // Pagamentos anulados permanecem no histórico de auditoria, sem prazo
        // automático ou remoção manual definitiva.
    }

    private function temHistoricoFinanceiro(Cliente $cliente): bool
    {
        return $cliente->facturas()->withTrashed()->exists()
            || $cliente->pagamentos()->withTrashed()->exists();
    }

    private function purgarCliente(Cliente $cliente): void
    {
        DB::transaction(function () use ($cliente) {
            // Só se chega aqui quando não há histórico financeiro associado.
            $cliente->pagamentos()->withTrashed()->forceDelete();
            $cliente->facturas()->withTrashed()->forceDelete();
            $cliente->leituras()->withTrashed()->forceDelete();
            $cliente->forceDelete();
        });
    }

    private function diasRestantes($deletedAt): int
    {
        if (! $deletedAt) {
            return 0;
        }

        $limite = Carbon::parse($deletedAt)->addDays(self::DIAS_RETENCAO);

        return max(0, (int) Carbon::now()->diffInDays($limite, false));
    }
}
