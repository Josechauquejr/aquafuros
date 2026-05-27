<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class FacturaController extends Controller
{
    /**
     * Listar todas as facturas.
     */
    public function index()
    {
        // TODO: Buscar facturas com paginação, carregando relações 'cliente' e 'geradaPor'
        // TODO: Suportar filtros: por estado (pendente/paga/parcial/anulada), por mês, por ano, por cliente
        // TODO: Retornar a view 'facturas.index' com $facturas
    }

    /**
     * Mostrar o formulário de criação de factura.
     */
    public function create()
    {
        // TODO: Buscar clientes activos e leituras confirmadas sem factura associada no mês
        // TODO: Retornar a view 'facturas.create' com $clientes e $leituras
    }

    /**
     * Guardar uma nova factura na base de dados.
     */
    public function store(Request $request)
    {
        // TODO: Validar: cliente_id (existe), leitura_id (existe e pertence ao cliente), mes, ano
        // TODO: Usar BillingService para calcular: valor_consumo, divida_anterior, multa, total_pagar
        //       Ex: $billing = app(BillingService::class)->calcular($leitura, $cliente)
        // TODO: Gerar número de factura sequencial (ex: FAT-2026-0001)
        // TODO: Definir gerada_por = auth()->id()
        // TODO: Criar a factura com Factura::create($data)
        // TODO: Redirecionar para facturas.show com mensagem de sucesso
    }

    /**
     * Mostrar uma factura específica.
     */
    public function show(string $id)
    {
        // TODO: Usar Route Model Binding — trocar (string $id) por (Factura $factura)
        // TODO: Carregar relações: cliente, leitura, geradaPor, pagamentos
        // TODO: Retornar a view 'facturas.show' com $factura (usada também para pré-visualização de impressão)
    }

    /**
     * Mostrar o formulário de edição de factura.
     */
    public function edit(string $id)
    {
        // TODO: Usar Route Model Binding — trocar (string $id) por (Factura $factura)
        // TODO: Apenas permitir edição se estado for 'pendente' (bloquear 'paga' e 'anulada')
        // TODO: Retornar a view 'facturas.edit' com $factura
    }

    /**
     * Actualizar os dados de uma factura.
     */
    public function update(Request $request, string $id)
    {
        // TODO: Usar Route Model Binding — trocar (string $id) por (Factura $factura)
        // TODO: Apenas permitir actualização se estado for 'pendente'
        // TODO: Validar os campos permitidos (ex: apenas estado pode ser alterado manualmente)
        // TODO: Actualizar com $factura->update($data)
        // TODO: Redirecionar para facturas.show com mensagem de sucesso
    }

    /**
     * Anular uma factura (não apagar).
     */
    public function destroy(string $id)
    {
        // TODO: Usar Route Model Binding — trocar (string $id) por (Factura $factura)
        // TODO: Facturas NÃO devem ser apagadas — mudar estado para 'anulada' em vez de delete()
        //       Ex: $factura->update(['estado' => 'anulada'])
        // TODO: Redirecionar para facturas.index com mensagem de aviso
    }
}
