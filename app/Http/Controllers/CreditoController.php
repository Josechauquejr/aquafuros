<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use App\Models\Credito;
use App\Models\FechoCaixa;
use App\Support\NumeracaoDocumentos;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;

/**
 * Adiantamentos: dinheiro que um cliente entrega antes de ter factura (ou
 * além do que deve). Fica como crédito dele e abate facturas futuras. Não é
 * receita até ser usado.
 */
class CreditoController extends Controller
{
    public function store(Request $request)
    {
        if (FechoCaixa::where('utilizador_id', $request->user()->id)->where('data', now()->toDateString())->exists()) {
            return back()->with('error', 'Já fechou a caixa hoje — não é possível registar mais dinheiro.');
        }

        $data = $request->validate([
            'cliente_id' => 'required|exists:clientes,id',
            'valor' => 'required|numeric|min:0.01|max:9999999',
            'metodo_pagamento' => 'required|in:dinheiro,banco,mpesa,e-mola',
            'referencia_pagamento' => 'nullable|string|max:255',
            'nota' => 'nullable|string|max:255',
        ]);

        $credito = Credito::create([
            ...$data,
            'tipo' => 'entrada',
            'numero_recibo' => NumeracaoDocumentos::proximoNumero(
                Credito::whereNotNull('numero_recibo')->where('numero_recibo', 'like', 'ADI-'.now()->year.'-%'),
                'numero_recibo',
                'ADI-'.now()->year.'-%04d',
            ),
            'recebido_por' => $request->user()->id,
            'pago_em' => now(),
        ]);

        return redirect()->route('creditos.recibo', $credito)
            ->with('status', 'Adiantamento de MZN '.number_format((float) $data['valor'], 2, ',', ' ').' registado como crédito do cliente.');
    }

    public function recibo(Credito $credito)
    {
        abort_unless($credito->numero_recibo, 404);

        return Inertia::render('Creditos/Recibo', [
            'credito' => $credito->load(['cliente', 'recebidoPor']),
            'saldo' => Credito::saldoDe($credito->cliente_id),
        ]);
    }
}
