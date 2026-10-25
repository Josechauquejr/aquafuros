<?php

namespace App\Http\Controllers;

use App\Models\AjusteLeitura;
use App\Services\SequenciaLeituras;
use Illuminate\Http\Request;

class AjusteLeituraController extends Controller
{
    public function reverter(Request $request, AjusteLeitura $ajuste, SequenciaLeituras $sequencia)
    {
        $data = $request->validate([
            'motivo' => 'required|string|min:5|max:1000',
        ]);

        $sequencia->reverterAjuste($ajuste, $request->user()->id, $data['motivo']);

        return back()->with('status', 'Ajuste revertido. A leitura, a sequência e a factura foram restauradas com registo de auditoria.');
    }
}
