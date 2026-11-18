<?php

namespace App\Http\Controllers;

use App\Support\IA\ContextoAssistente;
use App\Support\IA\Gemini;
use App\Support\IA\IaIndisponivel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssistenteIaController extends Controller
{
    private const INSTRUCOES = <<<'TXT'
        És a Aqua, uma assistente de operações da plataforma Aquafuros, usada por equipas de abastecimento de água em Moçambique.
        Responde sempre em português de Moçambique, de forma clara, humana, directa e sem jargão desnecessário.

        Usa apenas os indicadores e o histórico fornecidos. Não inventes números, registos, pessoas ou capacidades do sistema.
        Se os dados não permitem responder, diz isso com clareza e aponta a página onde a pessoa pode confirmar.
        Se `maiores_saldos_vencidos` estiver presente, cada item tem uma referência anónima e métricas. Para perguntas sobre o maior saldo, usa literalmente a referência do primeiro item; o sistema associa o cliente localmente.
        Não inventes nomes de botões nem passos específicos da interface que não estejam no contexto recebido.
        Protege dados pessoais: não peças nem repitas nomes, telefones, emails, NUITs, credenciais ou referências de pagamento.
        Não afirmes que registaste, alteraste, enviaste ou confirmaste algo. És apenas consultiva; a pessoa mantém o controlo das operações.
        Dá primeiro a resposta principal. Quando ajudar, inclui até três passos curtos e até três evidências que venham dos indicadores recebidos.
        Não prolongues a conversa artificialmente nem uses pressão, urgência inventada ou frases para prender a atenção.
        Se a pergunta for ambígua, faz uma pergunta de esclarecimento curta. Se houver risco financeiro ou de dados, pede confirmação humana nos ecrãs próprios.
        TXT;

    private const ESQUEMA = [
        'type' => 'OBJECT',
        'properties' => [
            'mensagem' => ['type' => 'STRING'],
            'passos' => ['type' => 'ARRAY', 'items' => ['type' => 'STRING']],
            'evidencias' => ['type' => 'ARRAY', 'items' => ['type' => 'STRING']],
            'tipo' => ['type' => 'STRING', 'enum' => ['informacao', 'atencao']],
        ],
        'required' => ['mensagem', 'passos', 'evidencias', 'tipo'],
        'propertyOrdering' => ['mensagem', 'passos', 'evidencias', 'tipo'],
    ];

    public function perguntar(Request $request): JsonResponse
    {
        $dados = $request->validate([
            'mensagem' => ['required', 'string', 'max:1200'],
            'pagina' => ['required', 'string', 'in:geral,leituras,facturas,cobranca,pagamentos,clientes,ocorrencias,producao'],
            'periodo' => ['nullable', 'date_format:Y-m'],
            'historico' => ['sometimes', 'array', 'max:8'],
            'historico.*.papel' => ['required', 'string', 'in:user,assistant'],
            'historico.*.mensagem' => ['required', 'string', 'max:1200'],
        ]);

        $contextoComReferencias = ContextoAssistente::construir($request->user(), $dados['pagina'], $dados['periodo'] ?? null);
        $contexto = $contextoComReferencias['contexto'];
        $referenciasLocais = $contextoComReferencias['referencias_locais'];
        $historico = collect($dados['historico'] ?? [])->map(fn (array $item) => [
            'papel' => $item['papel'],
            'mensagem' => self::mascarar(trim($item['mensagem'])),
        ])->values()->all();

        $conteudo = json_encode([
            'contexto_actual' => $contexto,
            'historico_recente' => $historico,
            'pergunta' => self::mascarar(trim($dados['mensagem'])),
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);

        try {
            $resposta = Gemini::json('chat_assistente', self::INSTRUCOES, $conteudo, self::ESQUEMA, $request->user()?->id);
        } catch (IaIndisponivel $e) {
            $status = str_contains(mb_strtolower($e->getMessage()), 'limite') ? 429 : 503;

            return response()->json(['message' => $e->getMessage()], $status);
        }

        $mensagem = self::substituirReferencias(trim((string) ($resposta['mensagem'] ?? '')), $referenciasLocais);
        if ($mensagem === '') {
            $mensagem = 'Não consegui responder com os indicadores disponíveis. Confirma os dados na página actual.';
        }

        return response()->json([
            'resposta' => [
                'mensagem' => $mensagem,
                'passos' => array_map(fn (string $texto) => self::substituirReferencias($texto, $referenciasLocais), self::listaTexto($resposta['passos'] ?? null)),
                'evidencias' => array_map(fn (string $texto) => self::substituirReferencias($texto, $referenciasLocais), self::listaTexto($resposta['evidencias'] ?? null)),
                'tipo' => ($resposta['tipo'] ?? 'informacao') === 'atencao' ? 'atencao' : 'informacao',
            ],
        ]);
    }

    private static function listaTexto(mixed $valor): array
    {
        if (! is_array($valor)) {
            return [];
        }

        return array_slice(array_values(array_filter($valor, 'is_string')), 0, 3);
    }

    private static function substituirReferencias(string $texto, array $referencias): string
    {
        foreach ($referencias as $referencia => $cliente) {
            $rotulo = $cliente['numero']
                ? $cliente['nome'].' (n.º '.$cliente['numero'].')'
                : $cliente['nome'];
            $texto = str_replace($referencia, $rotulo, $texto);
        }

        return $texto;
    }

    private static function mascarar(string $texto): string
    {
        $texto = preg_replace('/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/', '[email ocultado]', $texto);

        return preg_replace('/(?<![\w.])\+?\d[\d ]{7,}\d(?![\w.])/', '[número ocultado]', $texto);
    }
}
