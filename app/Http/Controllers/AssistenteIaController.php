<?php

namespace App\Http\Controllers;

use App\Support\IA\CartoesAssistente;
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

        Personalidade: és clara (resposta primeiro, sem jargão), breve (uma ideia por resposta), atenta (sabes em que página a pessoa está, em `pagina_actual`, e o papel dela) e honesta (não inventas dados, nunca gravas sem confirmação). Não uses emojis.
        Cartões prontos (têm prioridade sobre tudo o resto):
        - `cartao`: quando a pergunta cabe num destes temas, escolhe o `tipo` e o `periodo` (formato AAAA-MM; vazio = mês de referência actual). O servidor desenha o cartão com os dados reais e o cartão é a resposta inteira: `facturacao_mes` (quanto foi facturado, emitido ou pago num mês), `facturacao_zona` (facturação de um mês por zona), `cobranca_prioridades` (por onde começar a cobrança, maiores devedores, a quem cobrar primeiro), `saldo_vencido` (dívida em atraso total, quanto está vencido), `leituras_ciclo` (quantas leituras faltam, progresso das leituras do mês), `recebido_hoje` (quanto foi recebido ou cobrado hoje). Quando escolhes um cartão, deixa `destaque.usar` = false, `evidencias` e `passos` vazios, sem `consulta`, e escreve a `mensagem` numa frase curta. Em seguimentos ("E em Agosto?") mantém o mesmo tipo de cartão com o novo período. Nos restantes casos usa "nenhum".
        - `tarefa_dados`: quando a pessoa relata uma operação, extrai o `cliente` (nome ou número, tal como foi dito), o `valor` pago, a `leitura` do contador e a `descricao` do problema. O que não foi dito fica vazio ou 0.
        Formato de cada resposta, igual aos cartões da Aqua no ecrã:
        - `destaque`: quando a pergunta pede um valor (quanto, quantos, total, percentagem, saldo), preenche `usar` = true com UM só número principal. `rotulo` é curto e diz o tema e o período (ex.: "Facturação · Outubro 2026"). `valor` vem formatado em português de Moçambique com unidade (ex.: "4 382 950,00 MT", "28 m³", "117 facturas", "64%"). `variacao` só quando o contexto tem o valor de comparação; calcula a diferença em percentagem e diz face a quê (ex.: "+6,4% face a Setembro"); caso contrário deixa vazio. `tom_variacao` é "bom" quando a mudança é favorável à empresa (mais facturado, mais cobrado, menos dívida), "mau" quando é desfavorável e "neutro" se não houver variação. Se não houver número principal, `usar` = false e os restantes campos vazios.
        - `mensagem`: quando há destaque, não repitas o número; dá o contexto numa frase curta sobre o mesmo período do destaque (ex.: "Já foram pagos 71%; o resto continua em aberto."). A comparação com outro mês fica só na `variacao`. Ex.: para "Quanto foi facturado em Outubro?" a mensagem é "Nenhuma das 36 facturas de Outubro está paga ainda." e não fala de Setembro. Sem destaque, responde em uma ou duas frases.
        - `evidencias`: até três linhas no formato exacto "Rótulo: valor" (ex.: "Já pago: 3 106 400,00 MT"), cada uma com um valor dos dados recebidos, sem repetir o destaque.
        - `tipo`: "atencao" só quando há risco real nos dados (saldos vencidos relevantes, prazos ultrapassados, clientes em risco de corte, pagamento que não cobre a dívida, quebra de produção). Em tudo o resto, "informacao".
        - `seguimentos`: até três perguntas de seguimento na voz da pessoa, com no máximo cinco palavras cada, que possas responder com os mesmos dados (ex.: "Quem ainda não pagou?", "Ver por zona", "Por onde começo?"). Não repitas o que a resposta já mostra: nunca sugiras comparar com o mês que já aparece na `variacao`, nem perguntar um valor que já está no destaque ou nas evidências. Deixa vazio quando a resposta fecha o assunto, quando é um procedimento ou quando faltam dados.
        - Pedidos para registar ("Quero registar a leitura do cliente X", "Regista um pagamento da Maria") são tratados como relatos: acção de criação em primeiro lugar e `tarefa_dados` preenchido; nunca mandes abrir a página.
        - Quando a pessoa relata uma operação para registar (ex.: "O cliente veio pagar 4 500 MT", "O contador 0457 marca 1 312", "Há uma fuga na rua 4"), não expliques o procedimento nem dês `passos`: responde numa frase curta que vais ajudar a registar já, repete os dados que ela deu (ex.: "Vamos registar o pagamento de 4 500,00 MT. Qual é o cliente?") e põe a acção de criação correspondente em primeiro lugar (registar_pagamento, nova_leitura, nova_ocorrencia, registar_producao). Sem `destaque` nem `seguimentos`.
        Regras de dados que definem a resposta:
        - Usa primeiro os indicadores. Para totais, contagens, percentagens, prazos e "quantos faltam" responde com os indicadores (ex.: `leituras.clientes_sem_leitura`, `ciclo.dias_para_limite_das_leituras`, `facturas_por_mes`, `cobranca`). Só preenches `consulta` quando a pessoa pede a lista de registos concretos (quem, quais, lista de…) que os indicadores não trazem.
        - Perguntas curtas de seguimento ("E quem ainda não pagou?", "E em Setembro?", "E por zona?") herdam o período, a entidade e os filtros da pergunta anterior do `historico_recente`. Ex.: depois de uma pergunta sobre Outubro, "quem ainda não pagou" é a `consulta` de facturas com `periodo` "2026-10" e `pesquisa` "em aberto".
        - Na `consulta` de facturas, filtra o estado escrevendo em `pesquisa` exactamente "em aberto", "vencidas" ou "pagas"; para um cliente ou número de factura, escreve o nome ou o número.
        - Ao falar de um mês, usa `facturas_por_mes` para decompor o total nas evidências: "Já pago", "Em aberto" e "Facturas emitidas". Refere os meses pelo nome e ano (ex.: "Outubro 2026"), nunca como 10/2026.
        - "Por onde começo a cobrança" ou pedidos de prioridade: usa `cobranca.maiores_saldos_vencidos`. Recomenda os três primeiros e calcula quanto representam do `cobranca.saldo_vencido_mzn`. A `mensagem` diz "Comece pelos 3 maiores — juntos são X% do saldo vencido."; o `destaque` é a soma dos três, com `variacao` "X% do total" e `tom_variacao` "neutro"; as `evidencias` são "<referência>: <saldo> · <dias> dias de atraso", uma por cliente, usando literalmente a referência; `tipo` "atencao".
        - Quando os dados permitem uma resposta negativa definitiva (ex.: `clientes_com_atraso_90_dias_ou_mais` é 0), responde directamente "Nenhum cliente…" e indica o valor máximo encontrado (ex.: `dias_em_atraso_maximo`). Nunca digas que "não existem dados" quando o indicador existe e vale zero.
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
            'destaque' => [
                'type' => 'OBJECT',
                'properties' => [
                    'usar' => ['type' => 'BOOLEAN'],
                    'rotulo' => ['type' => 'STRING'],
                    'valor' => ['type' => 'STRING'],
                    'variacao' => ['type' => 'STRING'],
                    'tom_variacao' => ['type' => 'STRING', 'enum' => ['bom', 'mau', 'neutro']],
                ],
                'required' => ['usar', 'rotulo', 'valor', 'variacao', 'tom_variacao'],
                'propertyOrdering' => ['usar', 'rotulo', 'valor', 'variacao', 'tom_variacao'],
            ],
            'seguimentos' => ['type' => 'ARRAY', 'items' => ['type' => 'STRING']],
            'cartao' => [
                'type' => 'OBJECT',
                'properties' => [
                    'tipo' => ['type' => 'STRING', 'enum' => ['nenhum', 'facturacao_mes', 'facturacao_zona', 'cobranca_prioridades', 'saldo_vencido', 'leituras_ciclo', 'recebido_hoje']],
                    'periodo' => ['type' => 'STRING'],
                ],
                'required' => ['tipo', 'periodo'],
                'propertyOrdering' => ['tipo', 'periodo'],
            ],
            'tarefa_dados' => [
                'type' => 'OBJECT',
                'properties' => [
                    'cliente' => ['type' => 'STRING'],
                    'valor' => ['type' => 'NUMBER'],
                    'leitura' => ['type' => 'NUMBER'],
                    'descricao' => ['type' => 'STRING'],
                ],
                'required' => ['cliente', 'valor', 'leitura', 'descricao'],
                'propertyOrdering' => ['cliente', 'valor', 'leitura', 'descricao'],
            ],
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
        'required' => ['cartao', 'destaque', 'mensagem', 'passos', 'evidencias', 'tipo', 'acoes', 'tarefa_dados', 'seguimentos', 'consulta'],
        'propertyOrdering' => ['cartao', 'destaque', 'mensagem', 'passos', 'evidencias', 'tipo', 'acoes', 'tarefa_dados', 'seguimentos', 'consulta'],
    ];

    public function perguntar(Request $request): JsonResponse
    {
        $inicio = microtime(true);
        $dados = $request->validate([
            'mensagem' => ['required', 'string', 'max:1200'],
            'cliente_id' => ['sometimes', 'integer', 'exists:clientes,id'],
            'historico' => ['sometimes', 'array', 'max:8'],
            'historico.*.papel' => ['required', 'string', 'in:user,assistant'],
            // Mensagens que são só cartões podem chegar vazias: ignoram-se em vez de falhar.
            'historico.*.mensagem' => ['nullable', 'string', 'max:1200'],
            'pagina' => ['sometimes', 'nullable', 'string', 'max:80'],
        ]);
        $dados['historico'] = collect($dados['historico'] ?? [])
            ->filter(fn (array $item) => filled($item['mensagem'] ?? null))
            ->values()->all();

        if (isset($dados['cliente_id'])) {
            abort_unless($request->user()->hasAnyRole(['administrador', 'gestor']), 403);
        }
        // Intenção clara ("Quanto foi facturado em Setembro?"): o cartão do
        // canvas responde directamente, sem esperar pela IA.
        $detectado = isset($dados['cliente_id']) ? null : CartoesAssistente::detectar($dados['mensagem'], $dados['historico'] ?? []);
        if ($detectado && ($cartaoDirecto = CartoesAssistente::construir($detectado[0], $detectado[1], $request->user()))) {
            return response()->json([
                'resposta' => [
                    'tempo' => round(microtime(true) - $inicio, 1),
                    'cartao' => $cartaoDirecto,
                    'mensagem' => $cartaoDirecto['tipo'] === 'vazio' ? $cartaoDirecto['titulo'] : CartoesAssistente::resumo($cartaoDirecto),
                    'passos' => [],
                    'evidencias' => [],
                    'acoes' => [],
                    'consulta_card' => null,
                    'tipo' => ($cartaoDirecto['tom'] ?? null) === 'atencao' ? 'atencao' : 'informacao',
                    'destaque' => null,
                    'seguimentos' => $cartaoDirecto['tipo'] === 'vazio' ? [] : CartoesAssistente::seguimentos($detectado[0], $detectado[1]),
                ],
            ]);
        }
        $contextoComReferencias = ContextoAssistente::construir($request->user());
        $contexto = $contextoComReferencias['contexto'];
        // Página onde a pessoa está ao perguntar ("esta página", "aqui").
        if (! empty($dados['pagina'])) {
            $contexto['pagina_actual'] = trim($dados['pagina']);
        }
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
            // Cartão desenhado pelo servidor com dados reais: dispensa a consulta e a 2.ª chamada.
            $cartao = CartoesAssistente::construir($resposta['cartao']['tipo'] ?? null, $resposta['cartao']['periodo'] ?? null, $request->user());
            if (! $cartao && ! empty($resposta['consulta']['usar']) && ($resposta['consulta']['entidade'] ?? 'nenhuma') !== 'nenhuma') {
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
                    if (empty($consultaCard)) {
                        $resposta['mensagem'] = self::mensagemSemResultados($consultaExecutada['contexto_consulta'] ?? []);
                        $cartao = ['tipo' => 'vazio', 'humor' => 'ola', 'titulo' => $resposta['mensagem'], 'texto' => 'Experimente outro período ou confirme na página.', 'acoes' => []];
                        $resposta['destaque'] = null;
                        $resposta['seguimentos'] = [];
                        $resposta['tipo'] = 'informacao';
                    }
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
                    // O destaque da 1.ª chamada foi escrito antes de haver dados.
                    $resposta['destaque'] = null;
                    $resposta['seguimentos'] = [];
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

        // Com cartão, o cartão é a resposta (como no canvas): sem destaque nem evidências soltas.
        if ($cartao) {
            $resposta['destaque'] = null;
            $resposta['evidencias'] = [];
            $resposta['passos'] = [];
            if ($cartao['tipo'] !== 'vazio') {
                $mensagem = CartoesAssistente::resumo($cartao);
            }
        }
        $acoes = self::acoesPermitidas($acoesPedidas, $request, $idFacturaConsultada);
        // Relato de uma operação ("a Maria Langa veio pagar 4 500 MT"): a tarefa
        // começa logo com os dados que a pessoa já deu.
        $tarefaDados = array_filter([
            'cliente' => trim((string) ($resposta['tarefa_dados']['cliente'] ?? '')),
            'valor' => (float) ($resposta['tarefa_dados']['valor'] ?? 0) ?: null,
            'leitura' => (float) ($resposta['tarefa_dados']['leitura'] ?? 0) ?: null,
            'descricao' => trim((string) ($resposta['tarefa_dados']['descricao'] ?? '')),
        ], fn ($valor) => $valor !== '' && $valor !== null);
        // A IA percebeu os dados mas não pôs a tarefa: deduz-se pelo que foi dito.
        if (! $cartao && $tarefaDados && ($acoes[0]['tipo'] ?? null) !== 'workflow') {
            $frase = mb_strtolower($dados['mensagem']);
            $tarefa = isset($tarefaDados['valor']) || preg_match('/pag(ou|ar|amento)|recebi/u', $frase) ? 'registar_pagamento'
                : (isset($tarefaDados['leitura']) || preg_match('/leitura|contador/u', $frase) ? 'nova_leitura'
                : (isset($tarefaDados['descricao']) || preg_match('/fuga|avaria|sem [aá]gua|ocorr[eê]ncia|rotura/u', $frase) ? 'nova_ocorrencia' : null));
            if ($tarefa) {
                $acoes = self::acoesPermitidas([$tarefa, ...$acoesPedidas], $request, $idFacturaConsultada);
            }
        }
        // "Gravar uma leitura", "Registar um pagamento": o fluxo abre já, mesmo sem dados.
        $pedidoDeRegisto = (bool) preg_match('/\b(regist|grav|lan[cç]|nova leitura|novo pagamento|nova ocorr|quero (ler|pagar|registar))/iu', $dados['mensagem']);
        if (! $cartao && ($tarefaDados || $pedidoDeRegisto) && ($acoes[0]['tipo'] ?? null) === 'workflow') {
            $acoes[0]['dados'] = $tarefaDados;
            $acoes[0]['iniciar'] = true;
        }

        return response()->json([
            'resposta' => [
                'tempo' => round(microtime(true) - $inicio, 1),
                'cartao' => $cartao,
                'mensagem' => $mensagem,
                'passos' => array_map(fn (string $texto) => self::substituirReferencias($texto, $referenciasLocais), self::listaTexto($resposta['passos'] ?? null)),
                'evidencias' => array_map(fn (string $texto) => self::substituirReferencias($texto, $referenciasLocais), self::listaTexto($resposta['evidencias'] ?? null)),
                'acoes' => $acoes,
                'consulta_card' => $resposta['consulta_card'] ?? null,
                'tipo' => ($resposta['tipo'] ?? 'informacao') === 'atencao' ? 'atencao' : 'informacao',
                'destaque' => $destaque = self::destaque($resposta['destaque'] ?? null, $referenciasLocais),
                'seguimentos' => self::seguimentos($resposta['seguimentos'] ?? null, $destaque, $referenciasLocais),
            ],
        ]);
    }

    /**
     * Até três chips de seguimento. Retira os que repetem o que já está no
     * ecrã (ex.: "Comparar com Setembro" quando a variação já é face a Setembro).
     */
    private static function seguimentos(mixed $seguimentos, ?array $destaque, array $referencias): array
    {
        // Nos chips o nome curto basta: "Contactar Hilario Machava".
        $nomes = collect($referencias)->map(fn (array $dados) => $dados['nome'] ?? null)->filter()->all();
        $meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        $variacao = mb_strtolower($destaque['variacao'] ?? '');
        $jaComparados = array_filter($meses, fn (string $mes) => $variacao !== '' && str_contains($variacao, $mes));

        return collect(self::listaTexto($seguimentos))
            ->map(fn (string $texto) => mb_substr(trim(strtr($texto, $nomes)), 0, 60))
            ->filter(fn (string $texto) => $texto !== '' && ! preg_match('/\bcliente_\d+\b/', $texto))
            ->reject(fn (string $texto) => collect($jaComparados)->contains(fn (string $mes) => str_contains(mb_strtolower($texto), $mes)))
            ->unique()
            ->take(3)
            ->values()
            ->all();
    }

    /** O número principal da resposta (cartão "destaque"); null quando não há um. */
    private static function destaque(mixed $destaque, array $referencias): ?array
    {
        if (! is_array($destaque) || empty($destaque['usar']) || trim((string) ($destaque['valor'] ?? '')) === '') {
            return null;
        }
        $tom = $destaque['tom_variacao'] ?? 'neutro';

        return [
            'rotulo' => self::substituirReferencias(mb_substr(trim((string) ($destaque['rotulo'] ?? '')), 0, 60), $referencias),
            'valor' => mb_substr(trim((string) $destaque['valor']), 0, 40),
            'variacao' => mb_substr(trim((string) ($destaque['variacao'] ?? '')), 0, 50),
            'tom_variacao' => in_array($tom, ['bom', 'mau'], true) ? $tom : 'neutro',
        ];
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
