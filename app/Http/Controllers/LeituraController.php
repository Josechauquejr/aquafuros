<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class LeituraController extends Controller
{
    /**
     * Listar todas as leituras.
     */
    public function index()
    {
        // TODO: Buscar leituras do mês/ano corrente por defeito, com paginação
        // TODO: Carregar relações 'cliente' e 'registadoPor'
        // TODO: Suportar filtros: por cliente, por mês, por ano, por estado de confirmação
        // TODO: Retornar a view 'leituras.index' com $leituras
    }

    /**
     * Mostrar o formulário de registo de leitura.
     */
    public function create()
    {
        // TODO: Buscar clientes activos (estado = 'ativo')
        // TODO: Pré-seleccionar o mês e ano corrente
        // TODO: Retornar a view 'leituras.create' com $clientes
    }

    /**
     * Guardar uma nova leitura na base de dados.
     */
    public function store(Request $request)
    {
        // TODO: Validar: cliente_id (existe), mes (1-12), ano, leitura_actual (numérico positivo)
        // TODO: Verificar que não existe já uma leitura para o mesmo cliente/mes/ano (unique na BD)
        // TODO: Preencher leitura_anterior automaticamente a partir da última leitura do cliente
        // TODO: Validar que leitura_actual >= leitura_anterior
        // TODO: Definir registado_por = auth()->id()
        // TODO: Guardar com Leitura::create($data)
        // TODO: Redirecionar para leituras.index com mensagem de sucesso
    }

    /**
     * Mostrar uma leitura específica.
     */
    public function show(string $id)
    {
        // TODO: Usar Route Model Binding — trocar (string $id) por (Leitura $leitura)
        // TODO: Carregar relações: cliente, registadoPor, factura
        // TODO: Retornar a view 'leituras.show' com $leitura
    }

    /**
     * Mostrar o formulário de edição de leitura.
     */
    public function edit(string $id)
    {
        // TODO: Usar Route Model Binding — trocar (string $id) por (Leitura $leitura)
        // TODO: Bloquear edição se confirmado = true (leitura já validada não pode ser alterada)
        // TODO: Retornar a view 'leituras.edit' com $leitura
    }

    /**
     * Actualizar os dados de uma leitura.
     */
    public function update(Request $request, string $id)
    {
        // TODO: Usar Route Model Binding — trocar (string $id) por (Leitura $leitura)
        // TODO: Bloquear se confirmado = true
        // TODO: Validar leitura_actual >= leitura_anterior
        // TODO: Actualizar com $leitura->update($data)
        // TODO: Se já existir factura associada, recalcular os valores da factura
        // TODO: Redirecionar para leituras.show com mensagem de sucesso
    }

    /**
     * Eliminar uma leitura.
     */
    public function destroy(string $id)
    {
        // TODO: Usar Route Model Binding — trocar (string $id) por (Leitura $leitura)
        // TODO: Bloquear eliminação se a leitura tiver uma factura associada
        // TODO: Bloquear eliminação se confirmado = true
        // TODO: Apagar com $leitura->delete()
        // TODO: Redirecionar para leituras.index com mensagem de sucesso
    }
}
