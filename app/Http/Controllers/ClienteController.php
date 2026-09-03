<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use App\Models\Configuracao;
use App\Models\Divida;
use App\Models\Factura;
use App\Models\Tarifa;
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

        $query = Cliente::with([
            'tarifa',
            'divida',
            'facturas' => fn ($q) => $q->orderByDesc('ano')->orderByDesc('mes'),
            'pagamentos' => fn ($q) => $q->orderByDesc('created_at'),
        ]);

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('nome', 'like', "%{$search}%")
                    ->orWhere('numero_cliente', 'like', "%{$search}%")
                    ->orWhere('bairro', 'like', "%{$search}%");
            });
        }

        if ($estado && $estado !== 'todos') {
            $query->where('estado', $estado);
        }

        return Inertia::render('Clientes/Index', [
            'clientes' => $query->orderBy('nome')->paginate(15)->withQueryString(),
            'tarifas' => Tarifa::where('is_active', true)->orderBy('nome')->get(['id', 'nome']),
            'taxaLigacao' => Configuracao::valor('taxa_ligacao_nova', 3250.00),
            'totais' => [
                'total' => Cliente::count(),
                'activos' => Cliente::where('estado', 'ativo')->count(),
                'cortados' => Cliente::where('estado', 'cortado')->count(),
                'dividaAcumulada' => (float) Divida::sum('valor_divida'),
            ],
            'filtros' => [
                'search' => $search ?? '',
                'estado' => $estado ?? 'todos',
            ],
        ]);
    }

    /**
     * Guardar um novo cliente. Quando se trata de um "novo contrato" (em
     * vez de um cliente já existente a ser migrado para o sistema), gera
     * também, na mesma transacção, a factura da taxa de ligação de água.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'nome' => 'required|string|max:255',
            'endereco' => 'nullable|string|max:255',
            'telefone' => 'nullable|string|max:20',
            'bairro' => 'nullable|string|max:255',
            'tarifa_id' => 'required|exists:tarifas,id',
            'estado' => 'required|in:ativo,inativo,cortado',
            'novo_contrato' => 'nullable|boolean',
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
            return redirect()->route('facturas.imprimir', $facturaLigacao)
                ->with('status', 'Cliente criado com sucesso. Factura da taxa de ligação emitida.');
        }

        return redirect()->route('clientes.index')->with('status', 'Cliente criado com sucesso.');
    }

    /**
     * Actualizar os dados de um cliente.
     */
    public function update(Request $request, Cliente $cliente)
    {
        $data = $request->validate([
            'nome' => 'required|string|max:255',
            'endereco' => 'nullable|string|max:255',
            'telefone' => 'nullable|string|max:20',
            'bairro' => 'nullable|string|max:255',
            'tarifa_id' => 'required|exists:tarifas,id',
            'estado' => 'required|in:ativo,inativo,cortado',
        ]);

        $cliente->update($data);

        return redirect()->route('clientes.index')->with('status', 'Cliente actualizado com sucesso.');
    }

    /**
     * Remover um cliente (soft delete).
     */
    public function destroy(Cliente $cliente)
    {
        try {
            $cliente->delete();
        } catch (QueryException) {
            return back()->with('error', 'Não é possível eliminar este cliente.');
        }

        return redirect()->route('clientes.index')->with('status', 'Cliente removido com sucesso.');
    }

    /**
     * Ficha do cliente para impressão — dados completos, tarifa, dívida
     * actual e resumo do histórico de facturas/pagamentos.
     */
    public function imprimir(Cliente $cliente)
    {
        $cliente->load(['tarifa', 'divida']);

        return Inertia::render('Clientes/Imprimir', [
            'cliente' => $cliente,
            'resumo' => [
                'numeroFacturas' => $cliente->facturas()->count(),
                'totalFacturado' => (float) $cliente->facturas()->sum('total_pagar'),
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
        return NumeracaoDocumentos::proximoNumero(
            Factura::where('numero_factura', 'like', "FAT-{$ano}-%"),
            'numero_factura',
            "FAT-{$ano}-%04d",
        );
    }
}
