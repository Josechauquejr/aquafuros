<?php

namespace App\Http\Controllers;

use App\Support\Alertas;
use Illuminate\Http\Request;
use Inertia\Inertia;

class NotificacaoSistemaController extends Controller
{
    public function index(Request $request)
    {
        $admin = $request->user()->hasRole('administrador');
        $todos = collect(Alertas::para($admin));
        $nivel = $request->query('nivel', 'todos');
        $search = trim((string) $request->query('search', ''));
        $alertas = $todos;

        if (in_array($nivel, ['alto', 'medio'], true)) {
            $alertas = $alertas->where('nivel', $nivel);
        }
        if ($search !== '') {
            $termo = mb_strtolower($search);
            $alertas = $alertas->filter(fn ($alerta) => str_contains(mb_strtolower($alerta['titulo'].' '.$alerta['detalhe']), $termo));
        }

        return Inertia::render('NotificacoesSistema/Index', [
            'alertas' => $alertas->values()->all(),
            'totais' => ['todos' => $todos->count(), 'altos' => $todos->where('nivel', 'alto')->count()],
            'filtros' => ['search' => $search, 'nivel' => $nivel],
        ]);
    }
}
