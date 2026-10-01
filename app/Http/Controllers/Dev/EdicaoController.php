<?php

namespace App\Http\Controllers\Dev;

use App\Http\Controllers\Controller;
use App\Models\Cliente;
use App\Support\ConfirmacaoReforcada;
use App\Support\EdicaoDados;
use Illuminate\Http\Request;
use Inertia\Inertia;

/** Edição de um registo por formulário validado (lista fechada de tabelas e campos). */
class EdicaoController extends Controller
{
    public function form(string $tabela, int $id)
    {
        abort_unless(EdicaoDados::editavel($tabela), 404);
        $registo = Cliente::findOrFail($id);

        return Inertia::render('Dev/Editar', [
            'tabela' => $tabela,
            'id' => $id,
            'titulo' => "{$registo->numero_cliente}: {$registo->nome}",
            'campos' => EdicaoDados::campos($tabela),
            'valores' => collect(EdicaoDados::campos($tabela))->mapWithKeys(fn ($c) => [$c['nome'] => $registo->getAttribute($c['nome'])])->all(),
            'palavra' => EdicaoDados::palavra(),
        ]);
    }

    public function guardar(Request $request, string $tabela, int $id)
    {
        abort_unless(EdicaoDados::editavel($tabela), 404);
        Cliente::findOrFail($id);

        ConfirmacaoReforcada::exigir($request, EdicaoDados::palavra());
        $dados = EdicaoDados::validar($request, $tabela);
        $r = EdicaoDados::guardar($tabela, $id, $dados, $request->user()->id);

        return redirect()->route('dev.dados.registo', [$tabela, $id])->with(
            $r['snapshot'] ? 'status' : 'error',
            $r['snapshot'] ? 'Registo actualizado: '.implode(', ', $r['alterados']).'. Pode desfazer em Alterações.' : 'Nada mudou: os valores são os mesmos.',
        );
    }
}
