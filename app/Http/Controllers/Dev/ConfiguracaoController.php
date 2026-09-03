<?php

namespace App\Http\Controllers\Dev;

use App\Http\Controllers\Controller;
use App\Models\Configuracao;
use App\Models\EmpresaPerfil;
use App\Models\Funcionalidade;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
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
            'empresa' => EmpresaPerfil::atual()->toArray(),
        ]);
    }

    /**
     * Actualizar a identidade da empresa (nome, NUIT, localização e
     * logotipo) — usada como padrão em toda a app. O logotipo é opcional em
     * cada submissão: só é substituído quando um novo ficheiro é enviado.
     */
    public function actualizarEmpresa(Request $request)
    {
        $data = $request->validate([
            'nome' => 'required|string|max:255',
            'nuit' => 'nullable|string|max:50',
            'localizacao' => 'nullable|string|max:255',
            'logotipo' => 'nullable|image|max:2048',
        ]);

        $empresa = EmpresaPerfil::atual();

        if ($request->hasFile('logotipo')) {
            if ($empresa->logotipo_path) {
                Storage::disk('public')->delete($empresa->logotipo_path);
            }

            $data['logotipo_path'] = $request->file('logotipo')->store('empresa', 'public');
        }

        unset($data['logotipo']);
        $empresa->update($data);

        return redirect()->route('dev.configuracoes.index')->with('status', 'Dados da empresa actualizados com sucesso.');
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
