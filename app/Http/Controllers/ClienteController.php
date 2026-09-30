<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use App\Models\Configuracao;
use App\Models\Divida;
use App\Models\Factura;
use App\Models\Tarifa;
use App\Rules\TelefoneMocambicano;
use App\Support\BuscaDifusa;
use App\Support\ListaQuery;
use App\Support\Telefone;
use App\Support\NumeracaoDocumentos;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ClienteController extends Controller
{
    /**
     * Listar clientes paginados, com o histórico de facturas e pagamentos
     * aninhado em cada um (usado no painel de detalhe/histórico), com
     * pesquisa e filtro de estado aplicados no servidor.
     */
    public function index(Request $request)
    {
        $search = $request->query('search');
        $estado = $request->query('estado');
        $bairro = $request->query('bairro');
        $tarifaId = $request->query('tarifa');
        $soDivida = $request->boolean('so_divida');

        $query = Cliente::with([
            'tarifa',
            'facturas' => fn ($q) => $q->orderByDesc('ano')->orderByDesc('mes'),
            'pagamentos' => fn ($q) => $q->orderByDesc('created_at'),
        ]);

        // Pesquisa difusa: nome, nº, bairro e telefone.
        $idsPesquisa = BuscaDifusa::ids(
            Cliente::get(['id', 'nome', 'numero_cliente', 'bairro', 'telefone']),
            $search,
            fn ($c) => "{$c->nome} {$c->numero_cliente} {$c->bairro} {$c->telefone}",
        );
        if ($idsPesquisa !== null) {
            $query->whereIn('clientes.id', $idsPesquisa);
        }

        if ($estado && $estado !== 'todos') {
            $query->where('estado', $estado);
        }

        if ($bairro && $bairro !== 'todos') {
            $query->where('bairro', $bairro);
        }

        if ($tarifaId && $tarifaId !== 'todos') {
            $query->where('tarifa_id', (int) $tarifaId);
        }

        $divida = $this->sqlSaldoEmAberto();

        if ($soDivida) {
            $query->whereRaw("({$divida}) > 0");
        }

        [$sort, $dir] = ListaQuery::ordenar($query, $request, [
            'nome' => fn ($q, $d) => $q->orderBy('clientes.nome', $d),
            'divida' => fn ($q, $d) => $q->orderByRaw("({$divida}) {$d}")->orderBy('clientes.nome'),
            // Activo → inactivo → cortado
            'estado' => fn ($q, $d) => $q->orderByRaw(
                "CASE clientes.estado WHEN 'ativo' THEN 0 WHEN 'inativo' THEN 1 ELSE 2 END {$d}",
            )->orderBy('clientes.nome'),
        ], 'nome', 'asc');

        $clientes = $query->paginate(15)->withQueryString();

        // Saldo em aberto e dívida vencida a partir das facturas/pagamentos
        // já carregados acima (sem consultas extra) — nunca um valor
        // guardado à parte, que só actualizava quando havia um pagamento e
        // por isso ficava preso em 0,00 para clientes que nunca pagaram
        // nada mas tinham facturas por liquidar.
        $clientes->getCollection()->transform(function (Cliente $cliente) {
            $pagoPorFactura = $cliente->pagamentos->groupBy('factura_id')->map->sum('valor_pago');
            $emAberto = $cliente->facturas->whereIn('estado', ['pendente', 'parcial']);
            $saldoDe = fn ($f) => max(0, (float) $f->total_pagar - (float) ($pagoPorFactura[$f->id] ?? 0));

            // Em falta por factura (o histórico mostra o remanescente, não o total).
            $cliente->facturas->each(fn ($f) => $f->em_falta = in_array($f->estado, ['pendente', 'parcial'], true) ? round($saldoDe($f), 2) : 0);

            $cliente->saldo_em_aberto = round($emAberto->sum($saldoDe), 2);
            $cliente->divida_em_atraso = round(
                $emAberto->filter(fn ($f) => $f->data_vencimento?->isPast())->sum($saldoDe),
                2,
            );

            return $cliente;
        });

        return Inertia::render('Clientes/Index', [
            'clientes' => $clientes,
            'tarifas' => Tarifa::where('is_active', true)->orderBy('nome')->get(['id', 'nome']),
            'todasTarifas' => Tarifa::orderBy('nome')->get(['id', 'nome']),
            'bairros' => Cliente::whereNotNull('bairro')->where('bairro', '!=', '')
                ->distinct()->orderBy('bairro')->pluck('bairro'),
            'taxaLigacao' => Configuracao::valor('taxa_ligacao_nova', 3250.00),
            'totais' => [
                'total' => Cliente::count(),
                'activos' => Cliente::where('estado', 'ativo')->count(),
                'cortados' => Cliente::where('estado', 'cortado')->count(),
                'dividaAcumulada' => $this->dividaEmAbertoTotal(),
            ],
            'filtros' => [
                'search' => $search ?? '',
                'estado' => $estado ?: 'todos',
                'bairro' => $bairro ?: 'todos',
                'tarifa' => $tarifaId ?: 'todos',
                'so_divida' => $soDivida,
                'sort' => $sort,
                'dir' => $dir,
            ],
        ]);
    }

    /**
     * Saldo em aberto do cliente como subconsulta SQL (mesma fórmula do
     * cálculo em PHP: facturas pendentes/parciais menos o já pago, por
     * factura, nunca negativo) — para poder ordenar e filtrar por dívida no
     * servidor.
     */
    private function sqlSaldoEmAberto(): string
    {
        $pago = '(SELECT COALESCE(SUM(p.valor_pago), 0) FROM pagamentos p WHERE p.factura_id = f.id AND p.deleted_at IS NULL)';

        return 'SELECT COALESCE(SUM(CASE WHEN f.total_pagar > '.$pago.' THEN f.total_pagar - '.$pago.' ELSE 0 END), 0)'
            ." FROM facturas f WHERE f.cliente_id = clientes.id AND f.estado IN ('pendente', 'parcial') AND f.deleted_at IS NULL";
    }

    /**
     * Soma do saldo em aberto de todos os clientes — a mesma fórmula de
     * Cliente::saldoEmAberto(), mas numa única consulta agregada em vez de
     * uma por cliente (usado só para o total do cartão de KPI).
     */
    private function dividaEmAbertoTotal(): float
    {
        $facturas = Factura::whereIn('estado', ['pendente', 'parcial'])
            ->withSum('pagamentos', 'valor_pago')
            ->get(['id', 'total_pagar']);

        return round(
            $facturas->sum(fn ($f) => max(0, (float) $f->total_pagar - (float) ($f->pagamentos_sum_valor_pago ?? 0))),
            2,
        );
    }

    /**
     * Guardar um novo cliente. Quando se trata de um "novo contrato" (em
     * vez de um cliente já existente a ser migrado para o sistema), gera
     * também, na mesma transacção, a factura da taxa de ligação de água.
     */
    public function store(Request $request)
    {
        $request->merge(['telefone' => Telefone::normalizar($request->input('telefone'))]);

        $data = $request->validate([
            'nome' => 'required|string|max:255',
            'endereco' => 'nullable|string|max:255',
            'telefone' => ['nullable', 'string', 'max:20', new TelefoneMocambicano],
            'bairro' => 'nullable|string|max:255',
            'tarifa_id' => 'required|exists:tarifas,id',
            'estado' => 'required|in:ativo,inativo,cortado',
            'novo_contrato' => 'nullable|boolean',
            // Ponto de partida do contador: a primeira leitura usa-o como
            // "anterior" (senão o cliente pagaria todo o consumo desde 0).
            'leitura_inicial' => 'required|numeric|min:0|max:99999999',
        ]);

        $novoContrato = (bool) ($data['novo_contrato'] ?? false);
        unset($data['novo_contrato']);

        $data['numero_cliente'] = $this->proximoNumeroCliente();
        $data['data_adesao'] = now()->toDateString();

        $facturaLigacao = null;
        $taxaLigacao = Configuracao::valor('taxa_ligacao_nova', 3250.00);

        DB::transaction(function () use ($data, $novoContrato, $taxaLigacao, &$facturaLigacao, $request) {
            $cliente = Cliente::create($data);
            Divida::create(['cliente_id' => $cliente->id]);

            if ($novoContrato) {
                $facturaLigacao = Factura::create([
                    'numero_factura' => $this->proximoNumeroFactura(now()->year),
                    'cliente_id' => $cliente->id,
                    'leitura_id' => null,
                    'tipo' => 'ligacao',
                    'mes' => now()->month,
                    'ano' => now()->year,
                    'valor_consumo' => 0,
                    'divida_anterior' => 0,
                    'multa' => 0,
                    'total_pagar' => $taxaLigacao,
                    'estado' => 'pendente',
                    'gerada_por' => $request->user()->id,
                ]);
            }
        });

        if ($facturaLigacao) {
            // Mesmo fluxo de "próximo passo" usado ao emitir uma factura avulsa
            // (FacturaController::emitir) — propõe pagar já, em vez de forçar
            // uma navegação para a impressão. A factura continua sempre
            // acessível/imprimível a partir de Facturas.
            return redirect()->route('clientes.index')
                ->with('status', 'Cliente criado com sucesso. Factura da taxa de ligação emitida.')
                ->with('novaFactura', [
                    'id' => $facturaLigacao->id,
                    'numero_factura' => $facturaLigacao->numero_factura,
                    'total_pagar' => (float) $facturaLigacao->total_pagar,
                ]);
        }

        return redirect()->route('clientes.index')->with('status', 'Cliente criado com sucesso.');
    }

    /**
     * Actualizar os dados de um cliente.
     */
    public function update(Request $request, Cliente $cliente)
    {
        $request->merge(['telefone' => Telefone::normalizar($request->input('telefone'))]);

        $data = $request->validate([
            'nome' => 'required|string|max:255',
            'endereco' => 'nullable|string|max:255',
            'telefone' => ['nullable', 'string', 'max:20', new TelefoneMocambicano],
            'bairro' => 'nullable|string|max:255',
            'tarifa_id' => 'required|exists:tarifas,id',
            'estado' => 'required|in:ativo,inativo,cortado',
        ]);

        $cliente->update($data);

        return redirect()->route('clientes.index')->with('status', 'Cliente actualizado com sucesso.');
    }

    /**
     * Remover um cliente — vai para a lixeira (soft delete) durante 30 dias,
     * juntamente com as suas facturas, leituras e pagamentos, para poder ser
     * recuperado ou apagado definitivamente pelo administrador. As facturas
     * em aberto são anuladas (deixam de contar como dívida) tal como ao
     * anular uma factura avulsa.
     */
    public function destroy(Cliente $cliente)
    {
        try {
            DB::transaction(function () use ($cliente) {
                $cliente->facturas()->whereIn('estado', ['pendente', 'parcial'])->update(['estado' => 'anulada']);
                $cliente->divida?->update(['valor_divida' => 0, 'meses_atraso' => 0, 'em_corte' => false]);

                $cliente->pagamentos()->delete();
                $cliente->facturas()->delete();
                $cliente->leituras()->delete();
                $cliente->delete();
            });
        } catch (QueryException) {
            return back()->with('error', 'Não é possível eliminar este cliente.');
        }

        return redirect()->route('clientes.index')
            ->with('status', 'Cliente movido para a lixeira. Pode ser recuperado durante 30 dias.');
    }

    /**
     * Ficha do cliente para impressão — dados completos, tarifa, dívida
     * actual e resumo do histórico de facturas/pagamentos.
     */
    public function imprimir(Cliente $cliente)
    {
        $cliente->load('tarifa');
        $cliente->saldo_em_aberto = $cliente->saldoEmAberto();
        $emAtraso = $cliente->dividaEmAtraso();
        $cliente->divida_em_atraso = $emAtraso['valor'];
        $cliente->em_corte = $emAtraso['em_corte'];

        return Inertia::render('Clientes/Imprimir', [
            'cliente' => $cliente,
            'resumo' => [
                // Facturas anuladas não contam nas estatísticas de valores.
                'numeroFacturas' => $cliente->facturas()->where('estado', '!=', 'anulada')->count(),
                'totalFacturado' => (float) $cliente->facturas()->where('estado', '!=', 'anulada')->sum('total_pagar'),
                'numeroPagamentos' => $cliente->pagamentos()->count(),
                'totalPago' => (float) $cliente->pagamentos()->sum('valor_pago'),
            ],
        ]);
    }

    private function proximoNumeroCliente(): string
    {
        return NumeracaoDocumentos::proximoNumero(Cliente::withTrashed(), 'numero_cliente', 'CLI-%04d');
    }

    private function proximoNumeroFactura(int $ano): string
    {
        // withTrashed(): mesma razão do proximoNumeroCliente() — uma factura
        // na lixeira ainda ocupa o número.
        return NumeracaoDocumentos::proximoNumero(
            Factura::withTrashed()->where('numero_factura', 'like', "FAT-{$ano}-%"),
            'numero_factura',
            "FAT-{$ano}-%04d",
        );
    }
}
