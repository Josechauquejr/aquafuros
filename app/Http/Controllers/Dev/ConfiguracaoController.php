<?php

namespace App\Http\Controllers\Dev;

use App\Http\Controllers\Controller;
use App\Models\Configuracao;
use App\Models\Funcionalidade;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * Configuração de sistema pelo Desenvolvedor: activar/desactivar secções
 * inteiras, e definir o horário de acesso à plataforma.
 */
class ConfiguracaoController extends Controller
{
    public function index()
    {
        return Inertia::render('Dev/Configuracoes', [
            'funcionalidades' => Funcionalidade::orderBy('nome')->get(),
            'horario' => [
                'inicio' => Configuracao::valor('horario_inicio', 0),
                'fim' => Configuracao::valor('horario_fim', 24),
            ],
        ]);
    }

    public function actualizarFuncionalidade(Request $request, Funcionalidade $funcionalidade)
    {
        $data = $request->validate(['activa' => 'required|boolean']);

        $funcionalidade->update($data);

        return redirect()->route('dev.configuracoes.index')
            ->with('status', "Secção \"{$funcionalidade->nome}\" " . ($data['activa'] ? 'activada' : 'desactivada') . '.');
    }

    public function actualizarHorario(Request $request)
    {
        $data = $request->validate([
            'inicio' => 'required|numeric|min:0|max:24',
            'fim' => 'required|numeric|min:0|max:24',
        ]);

        Configuracao::definir('horario_inicio', $data['inicio']);
        Configuracao::definir('horario_fim', $data['fim']);

        $status = $data['fim'] <= $data['inicio']
            ? 'Horário de acesso removido — a plataforma fica sempre acessível.'
            : 'Horário de acesso actualizado com sucesso.';

        return redirect()->route('dev.configuracoes.index')->with('status', $status);
    }
}
