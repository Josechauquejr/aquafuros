<?php

namespace App\Http\Controllers;

use App\Support\IA\ContextoAssistente;
use App\Support\IA\Gemini;
use App\Support\IA\IaIndisponivel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AssistenteIaController extends Controller
{
    private const INSTRUCOES = <<<'TXT'
        Sê breve e objectiva: responde em uma ou duas frases curtas. Não repitas a pergunta nem acrescentes instruções genéricas. Não digas para abrir uma página quando já houver um botão para isso. Só apresenta passos quando a pessoa pedir um procedimento.
        És a Aqua, uma assistente de operações da plataforma Aquafuros, usada por equipas de abastecimento de água em Moçambique.
        Responde sempre em português de Moçambique, de forma clara, humana, directa e sem jargão desnecessário.

        Usa apenas os indicadores e o histórico fornecidos. Não inventes números, registos, pessoas ou capacidades do sistema.
        Podes fazer somas, diferenças, médias e percentagens com os valores explícitos dos indicadores e registos fornecidos. Mostra os valores usados e distingue totais emitidos, valores pagos e saldos actuais; se faltar um dado necessário, diz qual é sem estimar.
        Interpreta semanticamente pedidos para consultar ou listar registos. Quando precisares de dados detalhados, preenche `consulta` com a entidade e o filtro entendidos pela frase; não dependas de palavras-chave exactas nem inventes dados. O servidor executa apenas consultas de leitura permitidas e devolve os registos encontrados. Nunca escrevas SQL nem peças acesso directo à base de dados.
        Quando `factura_consultada` estiver presente, usa os campos reais dessa factura para explicar os valores. Distingue `total_emitido` e `saldo_factura` do `saldo_vencido_cliente`, que agrega apenas facturas vencidas e em aberto, descontando pagamentos registados. Uma factura que ainda não venceu não entra nesse saldo. Nunca atribuas diferenças a multas, taxas ou dívida anterior sem confirmar os campos correspondentes; se forem zero, diz que não constam nessa factura. Se a factura não estiver no contexto, não inventes detalhes: oferece abrir a página Facturas.
        Distingue perguntas sobre dados (quantos, quanto, quando) de perguntas procedimentais (como fazer). Para perguntas procedimentais, responde com os passos de `orientacoes_operacionais`, mesmo que não haja indicadores que respondam à pergunta. Não digas que faltam dados para explicar um procedimento documentado.
        Se uma pergunta sobre dados não puder ser respondida pelos indicadores, diz isso com clareza e aponta a página onde a pessoa pode confirmar. Para um procedimento não documentado, explica esse limite e não inventes passos.
        Se `maiores_saldos_vencidos` estiver presente, cada item tem uma referência anónima e métricas. Para perguntas sobre o maior saldo, usa literalmente a referência do primeiro item; o sistema associa o cliente localmente.
        Não inventes nomes de botões nem passos específicos da interface que não estejam no contexto recebido.
        Os dados do contexto podem incluir dados pessoais que a pessoa autorizada solicitou consultar. Usa-os apenas para responder à pergunta e revela apenas os campos pertinentes; não exponhas credenciais nem dados de outros clientes.
        Podes consultar, listar, localizar e executar tarefas operacionais pelos fluxos autorizados. Nunca afirmes que gravaste algo antes da confirmação do sistema. Pede os dados em falta, mostra uma prévia e exige confirmação antes de gravar.
        Não alteres configurações, tarifas, valores-base, regras de facturação, permissões ou outros parâmetros do sistema. Para tarefas sem fluxo operacional seguro, encaminha para o ecrã correcto.
        Dá primeiro a resposta principal. Em perguntas procedimentais, usa passos concretos das orientações. Em perguntas sobre dados, inclui até três evidências dos indicadores recebidos.
        Escolhe até três acções relevantes usando apenas estes identificadores: clientes, facturas, leituras, relatorios, cobranca, pagamentos, ocorrencias, producao, zonas, nova_leitura, registar_pagamento, novo_cliente, novo_pagamento, nova_zona, nova_ocorrencia, registar_producao. Usa uma acção de criação quando a pessoa pedir para criar/registar esse registo; usa as acções de página para listar, consultar ou abrir registos. Só sugere operações permitidas ao papel indicado no contexto.
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
            'acoes' => ['type' => 'ARRAY', 'items' => ['type' => 'STRING', 'enum' => ['clientes', 'facturas', 'leituras', 'relatorios', 'cobranca', 'pagamentos', 'ocorrencias', 'producao', 'zonas', 'nova_leitura', 'registar_pagamento', 'novo_cliente', 'novo_pagamento', 'nova_zona', 'nova_ocorrencia', 'registar_producao']]],
            'consulta' => [
                'type' => 'OBJECT',
                'properties' => [
                    'usar' => ['type' => 'BOOLEAN'],
                    'entidade' => ['type' => 'STRING', 'enum' => ['nenhuma', 'clientes', 'facturas', 'cobranca', 'pagamentos', 'leituras', 'ocorrencias', 'zonas', 'producao']],
                    'operacao' => ['type' => 'STRING', 'enum' => ['resumo', 'listar', 'detalhar']],
                    'pesquisa' => ['type' => 'STRING'],
                    'periodo' => ['type' => 'STRING'],
                    'pagina' => ['type' => 'INTEGER'],
                    'limite' => ['type' => 'INTEGER'],
                ],
                'required' => ['usar', 'entidade', 'operacao', 'pesquisa', 'periodo', 'pagina', 'limite'],
                'propertyOrdering' => ['usar', 'entidade', 'operacao', 'pesquisa', 'periodo', 'pagina', 'limite'],
            ],
        ],
        'required' => ['mensagem', 'passos', 'evidencias', 'tipo', 'acoes', 'consulta'],
        'propertyOrdering' => ['mensagem', 'passos', 'evidencias', 'tipo', 'acoes', 'consulta'],
    ];

    public function perguntar(Request $request): JsonResponse
    {
        $dados = $request->validate([
            'mensagem' => ['required', 'string', 'max:1200'],
            'cliente_id' => ['sometimes', 'integer', 'exists:clientes,id'],
            'historico' => ['sometimes', 'array', 'max:8'],
            'historico.*.papel' => ['required', 'string', 'in:user,assistant'],
            'historico.*.mensagem' => ['required', 'string', 'max:1200'],
        ]);

        if (isset($dados['cliente_id'])) {
            abort_unless($request->user()->hasAnyRole(['administrador', 'gestor']), 403);
        }
        $contextoComReferencias = ContextoAssistente::construir($request->user());
        $contexto = $contextoComReferencias['contexto'];
        if (isset($dados['cliente_id'])) {
            $contexto['cliente_consultado'] = ContextoAssistente::clienteConsultado((int) $dados['cliente_id']);
        }
        $referenciasLocais = $contextoComReferencias['referencias_locais'];
        $idFacturaConsultada = null;
        $textoComHistorico = $dados['mensagem'].' '.collect($dados['historico'] ?? [])->pluck('mensagem')->implode(' ');
        if ($request->user()->hasAnyRole(['administrador', 'gestor', 'caixa'])
            && preg_match_all('/\b(FAT-\d{4}-\d+)\b/i', $textoComHistorico, $matches)
            && count($matches[1]) > 0) {
            $detalheFactura = ContextoAssistente::facturaConsultada(strtoupper(end($matches[1])));
            $contexto['factura_consultada'] = $detalheFactura['factura_consultada'];
            $referenciasLocais = array_merge($referenciasLocais, $detalheFactura['referencias_locais']);
            $idFacturaConsultada = $detalheFactura['id_registo'] ?? null;
        }
        $historico = collect($dados['historico'] ?? [])->map(fn (array $item) => [
            'papel' => $item['papel'],
            'mensagem' => isset($dados['cliente_id']) ? trim($item['mensagem']) : self::mascarar(trim($item['mensagem'])),
        ])->values()->all();

        $conteudo = json_encode([
            'contexto_actual' => $contexto,
            'orientacoes_operacionais' => \App\Support\IA\OrientacoesAssistente::para($request->user()),
            'historico_recente' => $historico,
            'pergunta' => isset($dados['cliente_id']) ? trim($dados['mensagem']) : self::mascarar(trim($dados['mensagem'])),
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);

        try {
            $resposta = Gemini::json('chat_assistente', self::INSTRUCOES, $conteudo, self::ESQUEMA, $request->user()?->id);
            $consultaExecutada = [];
            if (! empty($resposta['consulta']['usar']) && ($resposta['consulta']['entidade'] ?? 'nenhuma') !== 'nenhuma') {
                $consultaExecutada = \App\Support\IA\ConsultaDadosAssistente::executar($request->user(), $resposta['consulta']);
                $payloadFinal = json_decode($conteudo, true, flags: JSON_THROW_ON_ERROR);
                $payloadFinal['resultado_consulta'] = $consultaExecutada['contexto_consulta'] ?? [];
                $conteudoFinal = json_encode($payloadFinal, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
                try {
                    $respostaFinal = Gemini::json('chat_assistente_resultado', self::INSTRUCOES, $conteudoFinal, self::ESQUEMA, $request->user()?->id);
                    if (empty($consultaExecutada['consulta_card']['registos'])) {
                        $consultaCard = null;
                    } else {
                        $consultaCard = $consultaExecutada['consulta_card'];
                    }
                    $resposta = array_merge($respostaFinal, ['consulta_card' => $consultaCard]);
                    if (empty($consultaCard)) $resposta['mensagem'] = self::mensagemSemResultados($consultaExecutada['contexto_consulta'] ?? []);
                    $resposta['passos'] = [];
                    $resposta['evidencias'] = [];
                } catch (IaIndisponivel) {
                    $semResultados = empty($consultaExecutada['consulta_card']['registos']);
                    $resposta['mensagem'] = $semResultados
                        ? self::mensagemSemResultados($consultaExecutada['contexto_consulta'] ?? [])
                        : self::mensagemConsultaFallback($consultaExecutada['contexto_consulta'] ?? []);
                    $resposta['evidencias'] = [];
                    $resposta['passos'] = [];
                    $resposta['consulta_card'] = $semResultados ? null : ($consultaExecutada['consulta_card'] ?? null);
                }
            }
        } catch (IaIndisponivel $e) {
            $status = str_contains(mb_strtolower($e->getMessage()), 'limite') ? 429 : 503;

            return response()->json(['message' => $e->getMessage()], $status);
        }

        $mensagem = self::substituirReferencias(trim((string) ($resposta['mensagem'] ?? '')), $referenciasLocais);
        if ($mensagem === '') {
            $mensagem = 'Não consegui responder com os indicadores disponíveis. Confirma os dados na página actual.';
        }

        $acoesPedidas = is_array($resposta['acoes'] ?? null) ? $resposta['acoes'] : [];
        $entidadeConsultada = $consultaExecutada['contexto_consulta']['entidade'] ?? null;
        if ($entidadeConsultada) {
            array_unshift($acoesPedidas, $entidadeConsultada);
        }

        return response()->json([
            'resposta' => [
                'mensagem' => $mensagem,
                'passos' => array_map(fn (string $texto) => self::substituirReferencias($texto, $referenciasLocais), self::listaTexto($resposta['passos'] ?? null)),
                'evidencias' => array_map(fn (string $texto) => self::substituirReferencias($texto, $referenciasLocais), self::listaTexto($resposta['evidencias'] ?? null)),
                'acoes' => self::acoesPermitidas($acoesPedidas, $request, $idFacturaConsultada),
                'consulta_card' => $resposta['consulta_card'] ?? null,
                'tipo' => ($resposta['tipo'] ?? 'informacao') === 'atencao' ? 'atencao' : 'informacao',
            ],
        ]);
    }

    public function transcreverAudio(Request $request): JsonResponse
    {
        $request->validate(['audio' => ['required', 'file', 'max:5120']]);
        $ficheiro = $request->file('audio');
        $mimeType = strtolower(explode(';', $ficheiro->getMimeType() ?: $ficheiro->getClientMimeType())[0]);
        $tiposAceites = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/aac', 'audio/flac', 'video/webm', 'video/mp4'];

        if (in_array($mimeType, ['video/webm', 'application/octet-stream'], true)) $mimeType = strtolower(explode(';', $ficheiro->getClientMimeType() ?: '')[0]);
        if ($mimeType === 'video/webm') $mimeType = 'audio/webm';
        if ($mimeType === 'video/mp4') $mimeType = 'audio/mp4';

        if (! in_array($mimeType, $tiposAceites, true)) {
            throw ValidationException::withMessages(['audio' => 'Este formato de áudio não é suportado. Grave novamente no navegador.']);
        }

        try {
            $texto = trim(Gemini::transcreverAudio($ficheiro->get(), $mimeType, $request->user()?->id));
        } catch (IaIndisponivel $e) {
            $status = str_contains(mb_strtolower($e->getMessage()), 'limite') ? 429 : 503;

            return response()->json(['message' => $e->getMessage()], $status);
        }

        if ($texto === '') {
            throw ValidationException::withMessages(['audio' => 'Não consegui perceber o áudio. Tente gravar novamente com menos ruído.']);
        }

        return response()->json(['texto' => mb_substr($texto, 0, 1200)]);
    }

    private static function acoesPermitidas(mixed $acoes, Request $request, ?int $idFacturaConsultada = null): array
    {
        $rotas = [
            'clientes' => ['/clientes', ['administrador', 'gestor']],
            'facturas' => ['/facturas', ['administrador', 'gestor']],
            'leituras' => ['/leituras', ['administrador', 'gestor', 'tecnico']],
            'relatorios' => ['/admin/kpis', ['administrador', 'gestor']],
            'cobranca' => ['/cobranca', ['administrador', 'gestor']],
            'pagamentos' => ['/pagamentos', ['administrador', 'gestor', 'caixa']],
            'ocorrencias' => ['/ocorrencias', ['administrador', 'gestor', 'tecnico']],
            'producao' => ['/producao', ['administrador', 'gestor', 'tecnico']],
            'zonas' => ['/zonas', ['administrador']],
            'nova_leitura' => [null, ['administrador', 'gestor']],
            'novo_cliente' => ['/clientes?novo=1', ['administrador', 'gestor']],
            'novo_pagamento' => ['/pagamentos?novo=1', ['administrador', 'gestor', 'caixa']],
            'nova_zona' => [null, ['administrador']],
            'nova_ocorrencia' => [null, ['administrador', 'gestor', 'tecnico']],
            'registar_producao' => [null, ['administrador', 'gestor', 'tecnico']],
            'registar_pagamento' => [null, ['administrador', 'gestor', 'caixa']],
        ];
        $titulos = ['clientes' => 'Abrir clientes', 'facturas' => 'Abrir facturas', 'leituras' => 'Abrir leituras', 'relatorios' => 'Abrir relatórios', 'cobranca' => 'Abrir cobrança', 'pagamentos' => 'Abrir pagamentos', 'ocorrencias' => 'Abrir ocorrências', 'producao' => 'Abrir produção', 'zonas' => 'Abrir zonas', 'nova_leitura' => 'Registar leitura com a Aqua', 'registar_pagamento' => 'Registar pagamento com a Aqua', 'novo_cliente' => 'Criar cliente', 'novo_pagamento' => 'Registar pagamento', 'nova_zona' => 'Criar zona', 'nova_ocorrencia' => 'Registar ocorrência', 'registar_producao' => 'Registar produção'];
        $resultado = collect(is_array($acoes) ? $acoes : [])->unique()->filter(fn ($id) => isset($rotas[$id]) && $request->user()->hasAnyRole($rotas[$id][1]))
            ->take(3)->map(fn ($id) => in_array($id, ['nova_leitura', 'registar_pagamento', 'nova_zona', 'nova_ocorrencia', 'registar_producao'], true)
                ? ['rotulo' => $titulos[$id], 'tipo' => 'workflow', 'tarefa' => $id]
                : ['rotulo' => $titulos[$id], 'tipo' => 'pagina', 'url' => $rotas[$id][0]])->values();

        if ($idFacturaConsultada) {
            $resultado = $resultado->reject(fn (array $accao) => ($accao['url'] ?? null) === '/facturas')
                ->prepend(['rotulo' => 'Abrir factura', 'tipo' => 'pagina', 'url' => '/facturas/'.$idFacturaConsultada]);
        }

        return $resultado->take(3)->values()->all();
    }

    private static function mensagemConsultaFallback(array $consulta): string
    {
        $resumo = $consulta['resumo'] ?? [];
        $total = $resumo['clientes'] ?? $resumo['facturas'] ?? $resumo['pagamentos'] ?? $resumo['leituras'] ?? $resumo['ocorrencias'] ?? $resumo['zonas'] ?? $resumo['registos'] ?? 0;
        if ($total === 0) return 'Não encontrei registos que correspondam ao pedido.';
        return "Encontrei {$total} registos.";
    }

    private static function mensagemSemResultados(array $consulta): string
    {
        $nomes = [
            'clientes' => 'clientes', 'facturas' => 'facturas', 'cobranca' => 'devedores',
            'pagamentos' => 'pagamentos', 'leituras' => 'leituras', 'ocorrencias' => 'ocorrências',
            'zonas' => 'zonas', 'producao' => 'registos de produção',
        ];
        $nome = $nomes[$consulta['entidade'] ?? ''] ?? 'registos';
        $periodo = $consulta['periodo'] ?? null;

        return $periodo
            ? "Não encontrei {$nome} para {$periodo}."
            : "Não encontrei {$nome} com esses critérios.";
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
