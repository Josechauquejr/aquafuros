<?php

namespace App\Http\Controllers\Dev;

use App\Http\Controllers\Controller;
use App\Models\AcessoSistema;
use App\Models\ErroSistema;
use App\Models\User;
use App\Support\ResolvedorPeriodo;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * Logs técnicos do Desenvolvedor: acessos ao sistema (quem, quando, de
 * onde) e erros da aplicação (mensagem, ficheiro:linha, URL).
 */
class LogController extends Controller
{
    public function acessos(Request $request)
    {
        $periodo = $request->query('periodo', 'hoje');
        $utilizadorId = $request->query('utilizador_id');
        $search = $request->query('search');

        $intervalo = ResolvedorPeriodo::resolver($periodo, $request->query('data_inicio'), $request->query('data_fim'));

        $query = AcessoSistema::with('user')->orderByDesc('id');

        if ($periodo !== 'todos') {
            $query->whereBetween('created_at', [$intervalo['inicio'], $intervalo['fim']]);
        }

        if ($utilizadorId && $utilizadorId !== 'todos') {
            $query->where('user_id', $utilizadorId);
        }

        if ($search) {
            $query->where('url', 'like', "%{$search}%");
        }

        return Inertia::render('Dev/Logs', [
            'aba' => 'acessos',
            'acessos' => $query->paginate(20)->withQueryString(),
            'utilizadores' => User::orderBy('name')->get(['id', 'name']),
            'filtros' => [
                'periodo' => $periodo,
                'data_inicio' => $request->query('data_inicio'),
                'data_fim' => $request->query('data_fim'),
                'utilizador_id' => $utilizadorId ?? 'todos',
                'search' => $search ?? '',
            ],
        ]);
    }

    public function erros(Request $request)
    {
        $estado = $request->query('estado', 'todos');
        $search = $request->query('search');

        $query = ErroSistema::with('user')->orderByDesc('id');

        if ($estado === 'pendente') {
            $query->where('resolvido', false);
        } elseif ($estado === 'resolvido') {
            $query->where('resolvido', true);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('mensagem', 'like', "%{$search}%")
                    ->orWhere('url', 'like', "%{$search}%")
                    ->orWhere('excepcao', 'like', "%{$search}%");
            });
        }

        return Inertia::render('Dev/Logs', [
            'aba' => 'erros',
            'erros' => $query->paginate(20)->withQueryString(),
            'filtros' => [
                'estado' => $estado,
                'search' => $search ?? '',
            ],
        ]);
    }

    public function marcarResolvido(ErroSistema $erro)
    {
        $erro->update(['resolvido' => ! $erro->resolvido]);

        return back()->with('status', $erro->resolvido ? 'Erro marcado como resolvido.' : 'Erro marcado como pendente.');
    }
}
