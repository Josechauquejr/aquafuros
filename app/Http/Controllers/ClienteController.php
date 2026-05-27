<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ClienteController extends Controller
{
    /**
     * Listar todos os clientes.
     */
    public function index()
    {
        // TODO: Buscar todos os clientes com paginação (ex: 20 por página)
        // TODO: Carregar a relação 'tarifa' para evitar N+1 queries (with('tarifa'))
        // TODO: Suportar filtros opcionais: por estado (ativo/inativo/cortado), por bairro, por nome
        // TODO: Retornar a view 'clientes.index' com a variável $clientes
    }

    /**
     * Mostrar o formulário de criação de cliente.
     */
    public function create()
    {
        // TODO: Buscar todas as tarifas activas (is_active = true)
        // TODO: Retornar a view 'clientes.create' com a variável $tarifas (para o select do formulário)
    }

    /**
     * Guardar um novo cliente na base de dados.
     */
    public function store(Request $request)
    {
        // TODO: Validar os campos obrigatórios: numero_cliente (único), nome, tarifa_id (existe na tabela tarifas)
        // TODO: Validar campos opcionais: telefone, endereco, bairro, data_adesao
        // TODO: Criar o cliente com Cliente::create($data)
        // TODO: Criar automaticamente um registo de dívida vazio para o cliente (Divida::create(['cliente_id' => ...]))
        // TODO: Redirecionar para clientes.index com mensagem de sucesso
    }

    /**
     * Mostrar o perfil de um cliente específico.
     */
    public function show(string $id)
    {
        // TODO: Usar Route Model Binding — trocar (string $id) por (Cliente $cliente)
        // TODO: Carregar relações: tarifa, divida, facturas (ordenadas por ano/mes desc), leituras recentes
        // TODO: Retornar a view 'clientes.show' com $cliente
    }

    /**
     * Mostrar o formulário de edição de cliente.
     */
    public function edit(string $id)
    {
        // TODO: Usar Route Model Binding — trocar (string $id) por (Cliente $cliente)
        // TODO: Buscar tarifas activas para o select
        // TODO: Retornar a view 'clientes.edit' com $cliente e $tarifas
    }

    /**
     * Actualizar os dados de um cliente.
     */
    public function update(Request $request, string $id)
    {
        // TODO: Usar Route Model Binding — trocar (string $id) por (Cliente $cliente)
        // TODO: Validar os campos: nome, tarifa_id, telefone, endereco, bairro, estado, data_adesao
        // TODO: Actualizar o cliente com $cliente->update($data)
        // TODO: Redirecionar para clientes.index com mensagem de sucesso
    }

    /**
     * Remover um cliente (soft delete).
     */
    public function destroy(string $id)
    {
        // TODO: Usar Route Model Binding — trocar (string $id) por (Cliente $cliente)
        // TODO: Chamar $cliente->delete() — como o model usa SoftDeletes, o registo não é apagado da BD
        // TODO: Redirecionar para clientes.index com mensagem de sucesso
    }
}
