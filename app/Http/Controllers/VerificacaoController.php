<?php

namespace App\Http\Controllers;

use App\Models\Factura;
use App\Models\Pagamento;
use Inertia\Inertia;

/**
 * Páginas públicas (sem autenticação) de verificação de autenticidade de
 * facturas e recibos, acedidas através do QR code impresso no documento.
 * As rotas são protegidas por assinatura de URL (Laravel signed routes) —
 * chega-se aqui apenas com a assinatura exacta gerada pelo sistema, nunca
 * adulterando o id do documento. Devolve-se apenas o essencial para
 * confirmar autenticidade, nunca dados de contacto do cliente.
 */
class VerificacaoController extends Controller
{
    public function factura(Factura $factura)
    {
        $factura->load(['cliente' => fn ($q) => $q->withTrashed()]);

        return Inertia::render('Verificacao/Factura', [
            'documento' => [
                'numero' => $factura->numero_factura,
                'tipo' => $factura->tipo,
                'cliente' => $factura->cliente?->nome ?? 'Cliente removido',
                'mes' => $factura->mes,
                'ano' => $factura->ano,
                'estado' => $factura->estado,
                'total' => (float) $factura->total_pagar,
                'emitidaEm' => $factura->created_at,
            ],
        ]);
    }

    public function pagamento(Pagamento $pagamento)
    {
        $pagamento->load('cliente', 'factura');

        return Inertia::render('Verificacao/Pagamento', [
            'documento' => [
                'numero' => $pagamento->numero_recibo,
                'cliente' => $pagamento->cliente?->nome ?? 'Cliente removido',
                'factura' => $pagamento->factura?->numero_factura,
                'valor' => (float) $pagamento->valor_pago,
                'metodo' => $pagamento->metodo_pagamento,
                'emitidoEm' => $pagamento->created_at,
            ],
        ]);
    }
}
