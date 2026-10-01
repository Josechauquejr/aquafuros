<?php

namespace App\Support;

use App\Models\Cliente;
use App\Models\DevAuditoria;
use App\Models\DevSnapshot;
use App\Models\Tarifa;
use App\Models\Zona;
use App\Rules\TelefoneMocambicano;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Edição de registos pelo Desenvolvedor: uma lista FECHADA de tabelas e de
 * campos, validada com as mesmas regras da aplicação e gravada através do
 * modelo (para correrem os eventos e o registo de actividade). Nunca SQL.
 * Campos financeiros (valores, totais, pagamentos) não estão aqui de
 * propósito: esses mudam-se pelos fluxos próprios do sistema.
 */
class EdicaoDados
{
    public static function palavra(): string
    {
        return app()->isProduction() ? 'PRODUCAO' : 'ALTERAR';
    }

    public static function editavel(string $tabela): bool
    {
        return $tabela === 'clientes';
    }

    /** @return array<int, array{nome: string, rotulo: string, tipo: string, opcoes?: array}> */
    public static function campos(string $tabela): array
    {
        return match ($tabela) {
            'clientes' => [
                ['nome' => 'nome', 'rotulo' => 'Nome', 'tipo' => 'text'],
                ['nome' => 'endereco', 'rotulo' => 'Endereço', 'tipo' => 'text'],
                ['nome' => 'telefone', 'rotulo' => 'Telefone', 'tipo' => 'tel'],
                ['nome' => 'email', 'rotulo' => 'Email', 'tipo' => 'email'],
                ['nome' => 'zona_id', 'rotulo' => 'Zona', 'tipo' => 'select', 'opcoes' => Zona::orderBy('nome')->get(['id', 'nome'])->map(fn ($z) => ['valor' => $z->id, 'rotulo' => $z->nome])->all()],
                ['nome' => 'tarifa_id', 'rotulo' => 'Tarifa', 'tipo' => 'select', 'obrigatorio' => true, 'opcoes' => Tarifa::orderBy('nome')->get(['id', 'nome'])->map(fn ($t) => ['valor' => $t->id, 'rotulo' => $t->nome])->all()],
                ['nome' => 'estado', 'rotulo' => 'Estado', 'tipo' => 'select', 'obrigatorio' => true, 'opcoes' => collect(['ativo', 'inativo', 'cortado'])->map(fn ($e) => ['valor' => $e, 'rotulo' => $e])->all()],
            ],
            default => [],
        };
    }

    /** Valida (com as regras do ClienteController) e devolve só os campos permitidos. */
    public static function validar(Request $request, string $tabela): array
    {
        $request->merge(['telefone' => Telefone::normalizar($request->input('telefone'))]);

        return $request->validate([
            'nome' => 'required|string|max:255',
            'endereco' => 'nullable|string|max:255',
            'telefone' => ['nullable', 'string', 'max:20', new TelefoneMocambicano],
            'email' => 'nullable|email:rfc|max:255',
            'zona_id' => 'nullable|exists:zonas,id',
            'tarifa_id' => 'required|exists:tarifas,id',
            'estado' => ['required', Rule::in(['ativo', 'inativo', 'cortado'])],
        ]);
    }

    /**
     * Aplica a edição ao registo e deixa o snapshot (antes/depois) e a auditoria.
     *
     * @return array{alterados: array, snapshot: ?DevSnapshot}
     */
    public static function guardar(string $tabela, int $id, array $dados, int $userId): array
    {
        abort_unless(self::editavel($tabela), 404);

        return DB::transaction(function () use ($id, $dados, $userId) {
            $cliente = Cliente::findOrFail($id);

            if (! empty($dados['zona_id'])) {
                $dados['bairro'] = Zona::find($dados['zona_id'])->nome; // o bairro acompanha a zona, como na aplicação
            }
            $dados = collect($dados)->map(fn ($v) => $v === '' ? null : $v)->all();

            $antes = collect($dados)->mapWithKeys(fn ($v, $c) => [$c => $cliente->getAttribute($c)])->all();
            $cliente->update($dados); // via modelo: eventos e registo de actividade
            $depois = collect($dados)->mapWithKeys(fn ($v, $c) => [$c => $cliente->getAttribute($c)])->all();

            $alterados = collect($depois)->filter(fn ($v, $c) => (string) $v !== (string) $antes[$c])->keys()->all();
            if ($alterados === []) {
                return ['alterados' => [], 'snapshot' => null];
            }

            $antes = collect($antes)->only($alterados)->all();
            $depois = collect($depois)->only($alterados)->all();
            $snapshot = DevSnapshot::create([
                'user_id' => $userId, 'acao' => 'editar', 'tabela' => 'clientes', 'total' => 1,
                'linhas' => [['id' => $id, 'antes' => $antes, 'depois' => $depois]],
            ]);
            DevAuditoria::registar('dev.editar.resultado', "clientes#{$id}", ['antes' => $antes, 'depois' => $depois, 'snapshot' => $snapshot->id]);

            return ['alterados' => $alterados, 'snapshot' => $snapshot];
        });
    }

    /**
     * Desfaz um snapshot: repõe os valores de antes, mas só se TODAS as linhas
     * ainda tiverem os valores de depois (nada mudou entretanto).
     *
     * @return array{ok: bool, mensagem: string}
     */
    public static function desfazer(DevSnapshot $snapshot, int $userId): array
    {
        if ($snapshot->desfeita_em) {
            return ['ok' => false, 'mensagem' => 'Esta alteração já foi desfeita.'];
        }
        if (! $snapshot->reversivel || ! $snapshot->linhas) {
            return ['ok' => false, 'mensagem' => 'Esta alteração não é reversível.'];
        }

        $modelo = self::modeloDe($snapshot->tabela);
        if (! $modelo) {
            return ['ok' => false, 'mensagem' => 'Esta tabela não permite desfazer.'];
        }

        return DB::transaction(function () use ($snapshot, $userId, $modelo) {
            $registos = [];
            foreach ($snapshot->linhas as $linha) {
                $registo = $modelo::withoutGlobalScopes()->find($linha['id']);
                if (! $registo) {
                    return ['ok' => false, 'mensagem' => "O registo #{$linha['id']} já não existe."];
                }
                foreach ($linha['depois'] as $coluna => $valor) {
                    if ((string) $registo->getAttribute($coluna) !== (string) $valor) {
                        return ['ok' => false, 'mensagem' => "O registo #{$linha['id']} mudou depois desta alteração ({$coluna}): já não se pode desfazer sem perder trabalho."];
                    }
                }
                $registos[] = [$registo, $linha['antes']];
            }

            foreach ($registos as [$registo, $antes]) {
                $registo->update($antes);
            }
            $snapshot->update(['desfeita_em' => now(), 'desfeita_por' => $userId]);
            DevAuditoria::registar('dev.desfazer.resultado', "{$snapshot->tabela} (snapshot {$snapshot->id})", ['linhas' => count($registos)]);

            return ['ok' => true, 'mensagem' => 'Alteração desfeita: '.count($registos).' registo(s) reposto(s).'];
        });
    }

    private static function modeloDe(string $tabela): ?string
    {
        return match ($tabela) {
            'clientes' => Cliente::class,
            'erros_sistema' => \App\Models\ErroSistema::class,
            default => null,
        };
    }
}
