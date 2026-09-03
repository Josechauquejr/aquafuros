<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use App\Models\Leitura;
use Illuminate\Support\Carbon;
use Inertia\Inertia;

/**
 * Painel do técnico — leituras que registou este mês, leituras por
 * confirmar, e clientes que ainda não têm leitura no mês actual (quem
 * falta visitar). Foco no trabalho de campo, não em analítica financeira.
 */
class TecnicoDashboardController extends Controller
{
    public function index()
    {
        $utilizador = request()->user();
        $hoje = Carbon::now();

        $clientesComLeituraEsteMes = Leitura::where('mes', $hoje->month)
            ->where('ano', $hoje->year)
            ->pluck('cliente_id');

        return Inertia::render('Tecnico/Dashboard', [
            'contadores' => [
                'leiturasRegistadasEsteMes' => Leitura::where('registado_por', $utilizador->id)
                    ->where('mes', $hoje->month)
                    ->where('ano', $hoje->year)
                    ->count(),
                'leiturasPendentesConfirmacao' => Leitura::where('confirmado', false)->count(),
                'clientesSemLeituraEsteMes' => Cliente::where('estado', 'ativo')
                    ->whereNotIn('id', $clientesComLeituraEsteMes)
                    ->count(),
            ],
            'leiturasPorConfirmar' => Leitura::where('confirmado', false)
                ->with(['cliente' => fn ($q) => $q->withTrashed()])
                ->orderBy('created_at')
                ->limit(8)
                ->get(),
            'clientesSemLeitura' => Cliente::where('estado', 'ativo')
                ->whereNotIn('id', $clientesComLeituraEsteMes)
                ->orderBy('nome')
                ->limit(8)
                ->get(['id', 'nome', 'numero_cliente', 'bairro']),
        ]);
    }
}
