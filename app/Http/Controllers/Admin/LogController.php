<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Spatie\Activitylog\Models\Activity;

/**
 * Registo de actividade do sistema (Spatie Activitylog) — quem criou,
 * alterou ou eliminou o quê e quando, visível apenas ao administrador.
 * Cada modelo de negócio (Cliente, Factura, Pagamento, Leitura, Tarifa,
 * Configuracao) regista aqui as suas alterações através da trait
 * LogsActivity, configurada em cada Model::getActivitylogOptions().
 */
class LogController extends Controller
{
    private const TIPOS = [
        'cliente' => 'Cliente',
        'factura' => 'Factura',
        'pagamento' => 'Pagamento',
        'leitura' => 'Leitura',
        'tarifa' => 'Tarifa',
        'configuracao' => 'Configuração',
        'utilizador' => 'Utilizador',
        'funcionalidade' => 'Funcionalidade',
    ];

    public function index(Request $request)
    {
        $tipo = $request->query('tipo');
        $evento = $request->query('evento');
        $utilizadorId = $request->query('utilizador_id');
        $search = $request->query('search');

        $query = Activity::with('causer')->orderByDesc('id');

        if ($tipo && $tipo !== 'todos') {
            $query->where('log_name', $tipo);
        }

        if ($evento && $evento !== 'todos') {
            $query->where('event', $evento);
        }

        if ($utilizadorId && $utilizadorId !== 'todos') {
            $query->where('causer_id', $utilizadorId)->where('causer_type', User::class);
        }

        if ($search) {
            $query->where('description', 'like', "%{$search}%");
        }

        return Inertia::render('Admin/Logs', [
            'registos' => $query->paginate(20)->withQueryString(),
            'tipos' => self::TIPOS,
            'utilizadores' => User::orderBy('name')->get(['id', 'name']),
            'filtros' => [
                'tipo' => $tipo ?? 'todos',
                'evento' => $evento ?? 'todos',
                'utilizador_id' => $utilizadorId ?? 'todos',
                'search' => $search ?? '',
            ],
        ]);
    }

    /**
     * "Gestão" de logs: elimina registos mais antigos que N dias — evita
     * que a tabela de actividade cresça indefinidamente.
     */
    public function limpar(Request $request)
    {
        $data = $request->validate([
            'dias' => 'required|integer|min:30|max:1825',
        ]);

        $limite = Carbon::now()->subDays($data['dias']);
        $eliminados = Activity::where('created_at', '<', $limite)->delete();

        return redirect()->route('dev.logs.actividade')
            ->with('status', "{$eliminados} registo(s) de actividade com mais de {$data['dias']} dias foram eliminados.");
    }
}
