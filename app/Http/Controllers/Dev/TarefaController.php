<?php

namespace App\Http\Controllers\Dev;

use App\Http\Controllers\Controller;
use App\Models\TarefaDev;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * Checklist de ToDos do Desenvolvedor — pessoal a cada developer.
 */
class TarefaController extends Controller
{
    public function index(Request $request)
    {
        return Inertia::render('Dev/Tarefas', [
            'tarefas' => TarefaDev::where('user_id', $request->user()->id)
                ->orderBy('concluida')
                ->orderByDesc('created_at')
                ->get(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate(['titulo' => 'required|string|max:255']);

        TarefaDev::create([
            'user_id' => $request->user()->id,
            'titulo' => $data['titulo'],
        ]);

        return back();
    }

    public function update(Request $request, TarefaDev $tarefa)
    {
        abort_unless($tarefa->user_id === $request->user()->id, 403);

        $data = $request->validate(['concluida' => 'required|boolean']);

        $tarefa->update($data);

        return back();
    }

    public function destroy(Request $request, TarefaDev $tarefa)
    {
        abort_unless($tarefa->user_id === $request->user()->id, 403);

        $tarefa->delete();

        return back();
    }
}
