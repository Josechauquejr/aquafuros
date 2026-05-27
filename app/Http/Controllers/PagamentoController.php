<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class PagamentoController extends Controller
{
    /**
     * Listar todos os pagamentos.
     */
    public function index()
    {
        // TODO: Buscar todos os pagamentos com paginação, carregando 'cliente', 'factura', 'recebidoPor'
        // TODO: Suportar filtros: por cliente, por método de pagamento, por data
        // TODO: Retornar a view 'pagamentos.index' com $pagamentos
    }

    /**
     * Mostrar o formulário de registo de pagamento.
     */
    public function create()
    {
        // TODO: Buscar facturas com estado 'pendente' ou 'parcial' para o select
        // TODO: Se vier ?factura_id na query string, pré-seleccionar essa factura
        // TODO: Pré-preencher o valor sugerido com o total_pagar da factura seleccionada
        // TODO: Retornar a view 'pagamentos.create' com $facturas
    }

    /**
     * Guardar um novo pagamento na base de dados.
     */
    public function store(Request $request)
    {
        // TODO: Validar: factura_id (existe, estado pendente/parcial), valor_pago (positivo, <= total em dívida), metodo_pagamento
        // TODO: Gerar número de recibo sequencial (ex: REC-2026-0001)
        // TODO: Definir recebido_por = auth()->id()
        // TODO: Criar o pagamento com Pagamento::create($data)
        // TODO: Actualizar o estado da factura:
        //       - Se valor_pago >= total_pagar → estado = 'paga'
        //       - Se valor_pago < total_pagar  → estado = 'parcial'
        // TODO: Actualizar a dívida do cliente (tabela dividas): recalcular valor_divida e meses_atraso
        // TODO: Redirecionar para pagamentos.show com mensagem de sucesso (mostrar recibo)
    }

    /**
     * Mostrar um pagamento/recibo específico.
     */
    public function show(string $id)
    {
        // TODO: Usar Route Model Binding — trocar (string $id) por (Pagamento $pagamento)
        // TODO: Carregar relações: cliente, factura, recebidoPor
        // TODO: Retornar a view 'pagamentos.show' com $pagamento (serve como recibo imprimível)
    }

    /**
     * Mostrar o formulário de edição de pagamento.
     */
    public function edit(string $id)
    {
        // TODO: Pagamentos NÃO devem ser editados directamente (integridade financeira)
        // TODO: Esta rota deve ser bloqueada ou restrita a administradores
        // TODO: Se necessário, usar apenas para corrigir referencia_pagamento ou metodo_pagamento
    }

    /**
     * Actualizar os dados de um pagamento.
     */
    public function update(Request $request, string $id)
    {
        // TODO: Restringir a administradores (verificar role)
        // TODO: Apenas permitir actualizar campos não financeiros: referencia_pagamento, metodo_pagamento
        // TODO: Nunca permitir alterar valor_pago, factura_id ou cliente_id após criação
    }

    /**
     * Estornar um pagamento.
     */
    public function destroy(string $id)
    {
        // TODO: Usar Route Model Binding — trocar (string $id) por (Pagamento $pagamento)
        // TODO: Restringir a administradores — estorno é uma operação sensível
        // TODO: Ao estornar: reverter o estado da factura para 'pendente' ou 'parcial'
        // TODO: Recalcular a dívida do cliente após estorno
        // TODO: Apagar o pagamento com $pagamento->delete()
        // TODO: Redirecionar para pagamentos.index com mensagem de aviso
    }
}
