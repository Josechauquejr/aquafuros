import { ArrowUp, Expand, History, MessageSquarePlus, Mic, Shrink, Trash2, Volume2, VolumeX, X } from "lucide-react";
import { definirSons, falar, pararDeFalar, somFimVoz, somGota, somInicioVoz, sonsLigados } from "@/Components/Aqua/sons";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import Mascote from "@/Components/Aqua/Mascote";
import Mensagem, { humorDaMensagem } from "@/Components/Aqua/Mensagem";
import { APensar, CartaoErro, ProgressoTarefa, cor, infoFluxo } from "@/Components/Aqua/Partes";
import { EcraInicial, EcraVoz, Lancador, NotificacaoAqua, Paleta } from "@/Components/Aqua/Ecras";
import { BarraAccoes, FolhaPagamento, LeituraActual, SucessoLeitura, SucessoPagamento, lerNumero } from "@/Components/Aqua/Fluxos";
import { formatMoney } from "@/lib/utils";
import { previewPost } from "@/lib/previewPost";

const NOMES_MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

/** Tarefas guiadas e os papéis que as podem fazer (iguais às do servidor). */
const TAREFAS = [
    { tarefa: "nova_leitura", rotulo: "Registar leitura", papeis: ["administrador", "gestor"] },
    { tarefa: "registar_pagamento", rotulo: "Registar pagamento", papeis: ["administrador", "gestor", "caixa"] },
    { tarefa: "nova_ocorrencia", rotulo: "Registar ocorrência", papeis: ["administrador", "gestor", "tecnico"] },
    { tarefa: "registar_producao", rotulo: "Registar produção", papeis: ["administrador", "gestor", "tecnico"] },
    { tarefa: "nova_zona", rotulo: "Criar zona", papeis: ["administrador"] },
];

/** Três sugestões no ecrã inicial, conforme o papel (lei de Hick). */
const SUGESTOES_POR_PAPEL = {
    gestao: [
        { titulo: "Facturação deste mês", ilustracao: "grafico", pergunta: "Quanto foi facturado este mês?" },
        { titulo: "Registar um pagamento", ilustracao: "carteira", tarefa: "registar_pagamento" },
        { titulo: "Comunicar uma ocorrência", ilustracao: "fuga", tarefa: "nova_ocorrencia" },
    ],
    caixa: [
        { titulo: "Registar um pagamento", ilustracao: "carteira", tarefa: "registar_pagamento" },
        { titulo: "Quanto foi recebido hoje?", ilustracao: "grafico", pergunta: "Quanto foi recebido hoje?" },
        { titulo: "Clientes com saldo vencido", ilustracao: "ocorrencia", pergunta: "Que clientes têm saldo vencido?" },
    ],
    tecnico: [
        { titulo: "Comunicar uma fuga", ilustracao: "fuga", tarefa: "nova_ocorrencia" },
        { titulo: "Registar produção", ilustracao: "grafico", tarefa: "registar_producao" },
        { titulo: "Ocorrências em aberto", ilustracao: "ocorrencia", pergunta: "Quantas ocorrências estão em aberto?" },
    ],
};

/** Uma sugestão por página, oferecida uma vez por sessão e sempre dispensável. */
const SUGESTOES_DE_PAGINA = {
    "/dashboard": { texto: "Quer um resumo rápido da situação de hoje?", pergunta: "Resume a situação geral do sistema.", aceitar: "Resumir" },
    "/facturas": { texto: "Quer um resumo das facturas deste mês: emitido, pago e em aberto?", pergunta: "Resume as facturas deste mês: emitido, pago e em aberto.", aceitar: "Sim, resumir" },
    "/cobranca": { texto: "Quer saber por onde começar a cobrança?", pergunta: "Que clientes têm o maior saldo vencido?", aceitar: "Mostrar" },
    "/pagamentos": { texto: "Posso registar um pagamento consigo, passo a passo.", tarefa: "registar_pagamento", aceitar: "Começar" },
    "/ocorrencias": { texto: "Posso registar uma ocorrência consigo, até por voz.", tarefa: "nova_ocorrencia", aceitar: "Começar" },
};

/** Resumo em texto de um cartão de tarefa, para o histórico enviado à IA. */
function resumoDoCartao(cartao) {
    if (!cartao) return "";
    switch (cartao.tipo) {
        case "contexto_leitura":
            return `Leitura de ${cartao.contexto?.cliente?.nome ?? "cliente"}; leitura anterior ${cartao.contexto?.ultima?.valor ?? cartao.contexto?.leitura_inicial ?? 0} m³.`;
        case "distribuicao_pagamento":
            return `Pagamento de ${formatMoney(cartao.distribuicao?.valor ?? 0)} repartido por ${cartao.distribuicao?.parcelas?.length ?? 0} facturas; fica em aberto ${formatMoney(cartao.distribuicao?.fica_em_aberto ?? 0)}.`;
        case "previa_pagamento":
            return `Prévia do pagamento de ${formatMoney(cartao.previa?.valor_pago ?? 0)}.`;
        case "previa_leitura":
            return `Prévia da leitura: consumo de ${cartao.previa?.plano?.consumo_novo ?? 0} m³.`;
        case "factura":
            return `Leitura gravada e factura ${cartao.factura?.numero ?? ""} emitida.`;
        case "pagamento":
            return `Pagamento registado (recibo ${cartao.pagamento?.numero_recibo ?? ""}).`;
        case "ocorrencia_previa":
            return `Prévia da ocorrência: ${cartao.descricao ?? ""}`;
        case "escolher_mes":
            return "A escolher o mês.";
        default:
            return "";
    }
}

/** O que a Aqua diz em voz alta numa resposta (curto e sem símbolos). */
function textoParaFalar(mensagem) {
    const cartao = mensagem.resposta?.cartao;
    let texto;
    if (cartao?.tipo === "numero") {
        const unidade = cartao.unidade === "MT" ? "meticais" : (cartao.unidade ?? "");
        texto = `${cartao.titulo}: ${cartao.valor} ${unidade}. ${cartao.variacao?.texto ?? ""}`;
    } else if (cartao?.tipo === "lista") {
        texto = cartao.intro ?? `${cartao.titulo}: ${cartao.itens.slice(0, 3).map((item) => item.titulo).join(", ")}.`;
    } else if (cartao?.tipo === "vazio") {
        texto = `${cartao.titulo}. ${cartao.texto ?? ""}`;
    } else {
        texto = textoDoAssistente(mensagem);
    }
    return String(texto)
        .replace(/·/g, ",")
        .replace(/%/g, " por cento")
        .replace(/\bMT\b/g, "meticais")
        .replace(/m³/g, "metros cúbicos")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 400);
}

function textoDoAssistente(mensagem) {
    if (typeof mensagem.texto === "string" && mensagem.texto.trim()) return mensagem.texto;
    if (mensagem.tarefaCard) return resumoDoCartao(mensagem.tarefaCard);
    const resposta = mensagem.resposta;
    const destaque = resposta?.destaque ? `${resposta.destaque.rotulo}: ${resposta.destaque.valor}${resposta.destaque.variacao ? ` (${resposta.destaque.variacao})` : ""}` : null;
    return [destaque, resposta?.mensagem, ...(resposta?.evidencias ?? []), ...(resposta?.passos ?? [])]
        .filter(Boolean)
        .join("\n");
}

const BOAS_VINDAS =
    "Aqua aqui. Como posso ajudar?";

function mensagensIniciais() {
    return [{ id: "boas-vindas", papel: "assistant", texto: BOAS_VINDAS }];
}

function carregarConversas(chave, chaveAntiga) {
    try {
        const guardado = JSON.parse(
            window.sessionStorage.getItem(chave) ?? "null",
        );
        if (Array.isArray(guardado?.conversas) && guardado.conversas.length) {
            const activa =
                guardado.conversas.find(
                    (conversa) => conversa.id === guardado.activa,
                ) ?? guardado.conversas[0];
            return { conversas: guardado.conversas, activa: activa.id };
        }
        const legado = JSON.parse(
            window.sessionStorage.getItem(chaveAntiga) ?? "null",
        );
        const conversa = {
            id: `conversa-${Date.now()}`,
            titulo:
                legado
                    ?.find?.((item) => item.papel === "user")
                    ?.texto?.slice(0, 36) ?? "Conversa anterior",
            actualizada: Date.now(),
            mensagens:
                Array.isArray(legado) && legado.length
                    ? legado
                    : mensagensIniciais(),
        };
        return { conversas: [conversa], activa: conversa.id };
    } catch {
        const conversa = {
            id: `conversa-${Date.now()}`,
            titulo: "Nova conversa",
            actualizada: Date.now(),
            mensagens: mensagensIniciais(),
        };
        return { conversas: [conversa], activa: conversa.id };
    }
}

export default function AquaGuia({ groups = [] }) {
    const pagina = usePage();
    const { assistenteDisponivel = false, auth } = pagina.props;
    const reduzirMovimento = useReducedMotion();
    const [aberto, setAberto] = useState(false);
    const [expandido, setExpandido] = useState(false);
    const [pergunta, setPergunta] = useState("");
    const [aEnviar, setAEnviar] = useState(false);
    const [aTranscrever, setATranscrever] = useState(false);
    const [aGravar, setAGravar] = useState(false);
    const [erro, setErro] = useState("");
    const [tarefa, setTarefa] = useState(null);
    const [menuConversas, setMenuConversas] = useState(false);
    const chaveConversa = `aqua-conversas-v1-${auth?.user?.id ?? "sessao"}`;
    const dadosIniciaisRef = useRef(null);
    if (!dadosIniciaisRef.current)
        dadosIniciaisRef.current = carregarConversas(
            chaveConversa,
            `aqua-chat-v1-${auth?.user?.id ?? "sessao"}`,
        );
    const [conversas, setConversas] = useState(
        dadosIniciaisRef.current.conversas,
    );
    const [conversaActiva, setConversaActiva] = useState(
        dadosIniciaisRef.current.activa,
    );
    const [mensagens, setMensagens] = useState(
        () =>
            dadosIniciaisRef.current.conversas.find(
                (conversa) => conversa.id === dadosIniciaisRef.current.activa,
            )?.mensagens ?? mensagensIniciais(),
    );
    const listaRef = useRef(null);
    const campoRef = useRef(null);
    const accionadorRef = useRef(null);
    const gravadorAudioRef = useRef(null);
    const streamAudioRef = useRef(null);
    const partesAudioRef = useRef([]);
    const limiteGravacaoRef = useRef(null);
    const audioCanceladoRef = useRef(false);
    const ultimaPerguntaRef = useRef(null);
    const [paleta, setPaleta] = useState(false);
    const [segundosGravacao, setSegundosGravacao] = useState(0);
    const [sugestaoVisivel, setSugestaoVisivel] = useState(null);
    // Ecrã "Concluído" (canvas "4 · Sucesso") depois de gravar uma leitura ou pagamento.
    const [concluido, setConcluido] = useState(null);
    // Campo grande "Leitura actual" (canvas "3 · Leitura").
    const [leituraDigitada, setLeituraDigitada] = useState("");
    // Folha "Confirma o pagamento?" (canvas "5 · Pagamento").
    const [metodoFolha, setMetodoFolha] = useState("dinheiro");
    const [referenciaFolha, setReferenciaFolha] = useState("");
    // Conversa por voz (canvas "6 · Voz"): ouvir → transcrever → responder no mesmo ecrã.
    const [vozAberta, setVozAberta] = useState(false);
    const [vozTranscricao, setVozTranscricao] = useState("");
    const [vozAviso, setVozAviso] = useState("");
    const [nivelVoz, setNivelVoz] = useState(0);
    const medidorRef = useRef(null);
    const audioContextoRef = useRef(null);
    const [somAtivo, setSomAtivo] = useState(() => sonsLigados());
    const abertoRef = useRef(false);
    abertoRef.current = aberto;
    const vozAbertaRef = useRef(false);
    vozAbertaRef.current = vozAberta;
    // Resposta que chegou com o chat fechado (cartão junto ao botão flutuante).
    const [notificacao, setNotificacao] = useState(null);
    // Conversa por voz contínua: onde começou, o que já foi lido e se está a falar.
    const [aFalarVoz, setAFalarVoz] = useState(false);
    const vozInicioRef = useRef(0);
    const faladoRef = useRef(null);
    const tarefaRef = useRef(null);
    tarefaRef.current = tarefa;

    const fechar = () => {
        setAberto(false);
        setExpandido(false);
        requestAnimationFrame(() => accionadorRef.current?.focus());
    };

    const novaConversa = () => {
        const agora = Date.now();
        const nova = {
            id: `conversa-${agora}`,
            titulo: "Nova conversa",
            actualizada: agora,
            mensagens: mensagensIniciais(),
        };
        setConversas((anteriores) =>
            [
                nova,
                {
                    ...anteriores.find(
                        (conversa) => conversa.id === conversaActiva,
                    ),
                    mensagens: mensagens.slice(-30),
                    actualizada: agora,
                },
                ...anteriores.filter(
                    (conversa) => conversa.id !== conversaActiva,
                ),
            ]
                .filter((conversa) => conversa.id)
                .slice(0, 12),
        );
        setConversaActiva(nova.id);
        setMensagens(nova.mensagens);
        setTarefa(null);
        setPergunta("");
        setErro("");
        setMenuConversas(false);
    };

    const abrirConversa = (conversa) => {
        setConversaActiva(conversa.id);
        setMensagens(
            conversa.mensagens?.length
                ? conversa.mensagens
                : mensagensIniciais(),
        );
        setTarefa(null);
        setPergunta("");
        setErro("");
        setMenuConversas(false);
    };

    const apagarConversa = (id) => {
        const restantes = conversas.filter((conversa) => conversa.id !== id);
        if (id !== conversaActiva) {
            setConversas(restantes);
            try {
                window.sessionStorage.setItem(
                    chaveConversa,
                    JSON.stringify({
                        activa: conversaActiva,
                        conversas: restantes,
                    }),
                );
            } catch {
                /* armazenamento opcional */
            }
            return;
        }
        const proxima = restantes[0] ?? {
            id: `conversa-${Date.now()}`,
            titulo: "Nova conversa",
            actualizada: Date.now(),
            mensagens: mensagensIniciais(),
        };
        setConversas(restantes.length ? restantes : [proxima]);
        setConversaActiva(proxima.id);
        setMensagens(proxima.mensagens ?? mensagensIniciais());
        setTarefa(null);
        setPergunta("");
        setErro("");
    };

    const limparConversas = () => {
        const nova = {
            id: `conversa-${Date.now()}`,
            titulo: "Nova conversa",
            actualizada: Date.now(),
            mensagens: mensagensIniciais(),
        };
        setConversas([nova]);
        setConversaActiva(nova.id);
        setMensagens(nova.mensagens);
        setTarefa(null);
        setPergunta("");
        setErro("");
        setMenuConversas(false);
    };

    const carregarPaginaConsulta = async (card, pagina) => {
        setAEnviar(true);
        setErro("");
        try {
            const resultado = await previewPost(
                "/assistente/tarefas/consulta/pagina",
                {
                    entidade: card.entidade,
                    operacao: "listar",
                    pesquisa: card.pesquisa ?? "",
                    periodo: card.periodo ?? "",
                    pagina,
                    limite: card.limite ?? 10,
                },
            );
            setMensagens((anteriores) => [
                ...anteriores,
                {
                    id: `${Date.now()}-assistant`,
                    papel: "assistant",
                    texto: `${card.titulo} · página ${resultado.consulta_card.pagina} de ${resultado.consulta_card.total_paginas}.`,
                    resposta: { consulta_card: resultado.consulta_card },
                },
            ]);
        } catch (falha) {
            setErro(
                falha.message || "Não foi possível carregar mais resultados.",
            );
        } finally {
            setAEnviar(false);
        }
    };

    const acrescentar = (mensagem) =>
        setMensagens((anteriores) => [...anteriores, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}-assistant`, papel: "assistant", ...mensagem }]);

    /**
     * Procura o cliente da tarefa. Com um só resultado segue logo para o passo
     * seguinte (canvas: "Encontrei o contador"); com vários mostra as opções.
     */
    const procurarClientes = async (termo, base) => {
        const resultado = await previewPost("/assistente/tarefas/clientes", { pesquisa: termo });
        const clientes = resultado.clientes ?? [];
        if (clientes.length === 1) return escolherClienteInterno(clientes[0], resultado.periodo_actual, base);
        setTarefa({ ...base, etapa: clientes.length ? "escolher_cliente" : "cliente", periodoActual: resultado.periodo_actual });
        acrescentar(
            clientes.length
                ? { texto: "Encontrei mais de um. Qual é o cliente?", tarefaCard: { tipo: "clientes", clientes, periodoActual: resultado.periodo_actual } }
                : { texto: `Não encontrei um cliente activo com "${termo}". Escreva o nome ou o número de cliente.` },
        );
    };

    const comEspera = async (accao, mensagemErro) => {
        setAEnviar(true);
        setErro("");
        try {
            await accao();
        } catch (falha) {
            setErro(falha.message || mensagemErro);
        } finally {
            setAEnviar(false);
        }
    };

    const iniciarRegistoLeitura = (dados = {}) => {
        setErro("");
        setConcluido(null);
        setLeituraDigitada(dados.leitura ? String(dados.leitura).replace(".", ",") : "");
        const base = { tipo: "nova_leitura", etapa: "cliente" };
        setTarefa(base);
        if (dados.cliente) return comEspera(() => procurarClientes(dados.cliente, base), "Não consegui procurar o cliente.");
        acrescentar({ texto: "Vamos registar a leitura. Qual é o nome ou número do cliente?" });
    };

    const iniciarRegistoPagamento = (dados = {}) => {
        setErro("");
        setConcluido(null);
        setMetodoFolha("dinheiro");
        setReferenciaFolha("");
        const base = { tipo: "registar_pagamento", etapa: "cliente", valorPrevisto: dados.valor ?? null };
        setTarefa(base);
        if (dados.cliente) return comEspera(() => procurarClientes(dados.cliente, base), "Não consegui procurar o cliente.");
        acrescentar({ texto: dados.valor ? `Vamos registar o pagamento de ${formatMoney(dados.valor)}. Qual é o cliente?` : "Vamos registar o pagamento. Qual é o nome ou número do cliente?" });
    };

    const iniciarCriacaoZona = () => {
        setTarefa({ tipo: "nova_zona", etapa: "nome" });
        setMensagens((anteriores) => [
            ...anteriores,
            {
                id: `${Date.now()}-assistant`,
                papel: "assistant",
                texto: "Qual é o nome da nova zona?",
            },
        ]);
    };

    const iniciarOcorrencia = (dados = {}) => {
        setConcluido(null);
        setTarefa({ tipo: "nova_ocorrencia", etapa: "tipo", descricaoPrevista: dados.descricao || null });
        acrescentar({
            texto: dados.descricao ? "Vou registar esta ocorrência. Que tipo é?" : "Que tipo de ocorrência pretende registar?",
            tarefaCard: { tipo: "tipos_ocorrencia" },
        });
    };

    const iniciarProducao = async () => {
        setAEnviar(true);
        try {
            const resultado = await previewPost(
                "/assistente/tarefas/zonas/listar",
                {},
            );
            setTarefa({
                tipo: "registar_producao",
                etapa: "periodo",
                zonas: resultado.zonas ?? [],
                periodoActual: resultado.periodo_actual,
            });
            setMensagens((anteriores) => [
                ...anteriores,
                {
                    id: `${Date.now()}-assistant`,
                    papel: "assistant",
                    texto: "A produção é do ciclo actual ou de outro mês?",
                    tarefaCard: {
                        tipo: "periodo",
                        periodoActual: resultado.periodo_actual,
                    },
                },
            ]);
        } catch (falha) {
            setErro(
                falha.message ||
                    "Não consegui carregar os dados para registar a produção.",
            );
        } finally {
            setAEnviar(false);
        }
    };

    // Passo seguinte depois de saber o cliente. `base` evita ler um `tarefa` ainda por actualizar.
    const escolherClienteInterno = async (cliente, periodoActual, base) => {
        if (base?.tipo === "registar_pagamento") {
            const resultado = await previewPost("/assistente/tarefas/cliente/facturas", { cliente_id: cliente.id });
            const facturas = resultado.facturas ?? [];
            if (!facturas.length) {
                setTarefa(null);
                acrescentar({ texto: `${cliente.nome} não tem facturas por pagar. Não registei nada.` });
                return;
            }
            const seguinte = { ...base, etapa: "valor", cliente, facturas };
            // Valor já dito: reparte logo pelas facturas mais antigas (canvas "5 · Pagamento").
            if (base.valorPrevisto) return distribuirPagamento(base.valorPrevisto, seguinte);
            setTarefa(seguinte);
            const total = facturas.reduce((soma, factura) => soma + Number(factura.em_falta) + Number(factura.multa_prevista), 0);
            acrescentar({ texto: `${cliente.nome} tem ${formatMoney(total)} em falta em ${facturas.length === 1 ? "1 factura" : `${facturas.length} facturas`}. Quanto recebeu?` });
            return;
        }
        // Leitura (canvas "3 · Leitura"): o cliente, a última leitura e o campo grande.
        const contexto = await previewPost("/assistente/tarefas/leitura/contexto", { cliente_id: cliente.id });
        const [ano, mes] = (contexto.periodo_actual ?? periodoActual ?? "").split("-").map(Number);
        setTarefa({ ...base, tipo: "nova_leitura", etapa: "contador", cliente, contexto, periodoActual: contexto.periodo_actual, mes, ano });
        acrescentar({ tarefaCard: { tipo: "contexto_leitura", contexto } });
    };

    const escolherCliente = (cliente, periodoActual, base = tarefa) =>
        comEspera(() => escolherClienteInterno(cliente, periodoActual, base), "Não consegui abrir os dados deste cliente.");

    const escolherFacturaInterno = async (factura, base) => {
        const seguinte = { ...base, etapa: "valor", factura };
        if (base.valorPrevisto) return preverPagamento({ factura_id: factura.id, valor_pago: base.valorPrevisto, metodo_pagamento: "dinheiro" }, seguinte);
        setTarefa(seguinte);
        acrescentar({ texto: `Quanto recebeu? A factura ${factura.numero} tem ${formatMoney(factura.em_falta + factura.multa_prevista)} em falta.` });
    };

    const escolherFacturaPagamento = (factura) => comEspera(() => escolherFacturaInterno(factura, tarefa), "Não consegui preparar o pagamento.");

    // Prévia sempre calculada como numerário; o método escolhe-se na folha de confirmação.
    const preverPagamento = async (payload, tarefaActual = tarefa) => {
        const previa = await previewPost("/assistente/tarefas/pagamento/prever", { ...payload, metodo_pagamento: "dinheiro", referencia_pagamento: null });
        setTarefa({ ...tarefaActual, etapa: "confirmar", payload: { ...payload, metodo_pagamento: "dinheiro" }, previa, valor: payload.valor_pago });
        setMetodoFolha("dinheiro");
        setReferenciaFolha("");
        acrescentar({ tarefaCard: { tipo: "previa_pagamento", previa, factura: tarefaActual.factura, facturas: tarefaActual.facturas } });
    };

    // Reparte o valor pelas facturas em aberto, da mais antiga para a mais recente.
    const distribuirPagamento = async (valor, base) => {
        const distribuicao = await previewPost("/assistente/tarefas/pagamento/distribuir", { cliente_id: base.cliente.id, valor });
        setTarefa({ ...base, etapa: "confirmar", distribuicao, valor, previa: null });
        setMetodoFolha("dinheiro");
        setReferenciaFolha("");
        acrescentar({ tarefaCard: { tipo: "distribuicao_pagamento", distribuicao } });
    };

    const confirmarPagamentoRepartido = async () => {
        const { distribuicao } = tarefa;
        const referencia = metodoFolha === "dinheiro" ? null : referenciaFolha.trim();
        if (distribuicao.parcelas.length === 1) {
            const parcela = distribuicao.parcelas[0];
            return confirmarTarefaPagamento({ factura_id: parcela.factura_id, valor_pago: parcela.aplicado, metodo_pagamento: metodoFolha, referencia_pagamento: referencia });
        }
        setAEnviar(true);
        setErro("");
        try {
            const resultado = await previewPost("/pagamentos/multiplo", {
                parcelas: distribuicao.parcelas.map((parcela) => ({ factura_id: parcela.factura_id, valor_pago: parcela.aplicado })),
                metodo_pagamento: metodoFolha,
                referencia_pagamento: referencia,
                valor_recebido: distribuicao.valor,
            });
            acrescentar({ texto: `Pagamento de ${formatMoney(resultado.total)} registado em ${resultado.pagamentos.length} facturas.` });
            setConcluido({ tipo: "pagamento", multiplo: true, ...resultado, cliente: tarefa.cliente, fica: distribuicao.fica_em_aberto, metodo: metodoFolha, hora: new Date().toISOString() });
            setTarefa(null);
        } catch (falha) {
            setErro(falha.message || "Não foi possível registar o pagamento. Confirme os dados e tente novamente.");
        } finally {
            setAEnviar(false);
        }
    };

    // "Editar" na folha: volta a pedir o valor.
    const editarPagamento = () => {
        setTarefa((actual) => ({ ...actual, etapa: "valor", valorPrevisto: null }));
        acrescentar({ texto: "Qual é o valor recebido?" });
    };

    // "Rever e confirmar" no campo grande: calcula a prévia sem criar uma bolha de mensagem.
    const reverLeitura = () =>
        comEspera(async () => {
            const valor = lerNumero(leituraDigitada);
            if (valor === null || valor < 0) throw new Error("Indique o valor do contador, como 1 312.");
            const payload = { cliente_id: tarefa.cliente.id, mes: tarefa.mes, ano: tarefa.ano, leitura_actual: valor };
            const previa = await previewPost("/assistente/tarefas/leitura/prever", payload);
            if (previa.plano.retroactiva && !previa.plano.pode_aplicar) {
                setTarefa(null);
                acrescentar({ texto: "Esta leitura retroactiva afectaria uma factura que já não pode ser recalculada. Não fiz alterações; regularize na página de Leituras." });
                return;
            }
            setTarefa({ ...tarefa, etapa: previa.plano.retroactiva ? "motivo" : "confirmar", payload, previa });
            acrescentar({
                texto: previa.plano.retroactiva ? "Esta leitura altera a sequência de um mês seguinte. Indique o motivo para continuar." : "Confira antes de gravar.",
                tarefaCard: { tipo: "previa_leitura", previa },
            });
        }, "Não consegui calcular a prévia da leitura.");

    const voltarAoCliente = () => {
        setTarefa({ tipo: "nova_leitura", etapa: "cliente" });
        setLeituraDigitada("");
        acrescentar({ texto: "Qual é o nome ou número do cliente?" });
    };

    const confirmarFolhaPagamento = () => {
        if (metodoFolha !== "dinheiro" && !referenciaFolha.trim()) {
            setErro("Indique a referência da transacção.");
            return;
        }
        if (tarefa.distribuicao) return confirmarPagamentoRepartido();
        confirmarTarefaPagamento({ ...tarefa.payload, metodo_pagamento: metodoFolha, referencia_pagamento: metodoFolha === "dinheiro" ? null : referenciaFolha.trim() });
    };

    const escolherMetodoPagamento = async (metodo) => {
        const actualizada = { ...tarefa, metodo };
        setTarefa(actualizada);
        if (metodo === "dinheiro") {
            setAEnviar(true);
            setErro("");
            try {
                await preverPagamento(
                    {
                        factura_id: tarefa.factura.id,
                        valor_pago: tarefa.valor,
                        metodo_pagamento: metodo,
                    },
                    actualizada,
                );
            } catch (falha) {
                setErro(
                    falha.message ||
                        "Não foi possível preparar a prévia do pagamento.",
                );
            } finally {
                setAEnviar(false);
            }
        } else {
            setTarefa({ ...actualizada, etapa: "referencia" });
            setMensagens((anteriores) => [
                ...anteriores,
                {
                    id: `${Date.now()}-assistant`,
                    papel: "assistant",
                    texto: "Qual é a referência da transacção?",
                },
            ]);
        }
    };

    const escolherPeriodo = (periodo) => {
        const [ano, mes] = periodo.split("-").map(Number);
        if (tarefa?.tipo === "registar_producao") {
            setTarefa({ ...tarefa, etapa: "zona", mes, ano });
            setMensagens((anteriores) => [
                ...anteriores,
                {
                    id: `${Date.now()}-assistant`,
                    papel: "assistant",
                    texto: `Qual é a zona da produção de ${NOMES_MESES[mes - 1]} ${ano}?`,
                    tarefaCard: { tipo: "zonas_producao", zonas: tarefa.zonas },
                },
            ]);
            return;
        }
        setTarefa((actual) => ({ ...actual, etapa: "contador", mes, ano }));
        setMensagens((anteriores) => [
            ...anteriores,
            {
                id: `${Date.now()}-assistant`,
                papel: "assistant",
                texto: `Leitura de ${NOMES_MESES[mes - 1]} ${ano}. Qual é o valor que o contador mostra?`,
            },
        ]);
    };

    const escolherZonaProducao = (zona) => {
        setTarefa((actual) => ({ ...actual, etapa: "volume", zona }));
        setMensagens((anteriores) => [
            ...anteriores,
            {
                id: `${Date.now()}-assistant`,
                papel: "assistant",
                texto: `Qual foi o volume produzido em ${zona?.nome ?? "todo o sistema"}, em metros cúbicos?`,
            },
        ]);
    };

    const escolherTipoOcorrencia = (tipo, rotulo) => {
        // A descrição já foi dita ("Há uma fuga no ramal…"): segue para a prévia.
        if (tarefa?.descricaoPrevista && tarefa.descricaoPrevista.length >= 5) {
            setTarefa({ ...tarefa, etapa: "confirmar", tipoOcorrencia: tipo, descricao: tarefa.descricaoPrevista });
            acrescentar({ tarefaCard: { tipo: "ocorrencia_previa", tipoOcorrencia: tipo, descricao: tarefa.descricaoPrevista } });
            return;
        }
        setTarefa((actual) => ({ ...actual, etapa: "descricao", tipoOcorrencia: tipo }));
        acrescentar({ texto: `Descreva a ${rotulo.toLocaleLowerCase()} com pelo menos cinco caracteres. Se souber, inclua onde e o que aconteceu.` });
    };

    const cancelarTarefa = () => {
        setTarefa(null);
        setMensagens((anteriores) => [
            ...anteriores,
            {
                id: `${Date.now()}-assistant`,
                papel: "assistant",
                texto: "Está bem. Não registei nem alterei nada.",
            },
        ]);
    };

    // "Outro mês": escolhe-se num seletor (últimos meses + campo de mês), sem escrever MM/AAAA.
    const pedirOutroMes = () => {
        setTarefa((actual) => ({ ...actual, etapa: "periodo_manual" }));
        acrescentar({ texto: "De que mês é?", tarefaCard: { tipo: "escolher_mes", periodoActual: tarefa?.periodoActual } });
    };

    // Repete a última pergunta que falhou, sem duplicar a bolha do utilizador.
    const tentarDeNovo = () => {
        const texto = ultimaPerguntaRef.current;
        if (!texto) return;
        setMensagens((anteriores) => (anteriores.at(-1)?.papel === "user" && anteriores.at(-1)?.texto === texto ? anteriores.slice(0, -1) : anteriores));
        enviar(texto);
    };

    const seleccionarResumoCliente = async (
        cliente,
        perguntaOriginal,
        historicoOriginal = [],
    ) => {
        setAEnviar(true);
        setErro("");
        try {
            const [respostaIA, detalhe] = await Promise.all([
                previewPost("/assistente/perguntar", {
                    mensagem: perguntaOriginal,
                    cliente_id: cliente.id,
                    historico: historicoOriginal,
                }),
                previewPost("/assistente/tarefas/cliente/resumo", {
                    cliente_id: cliente.id,
                }),
            ]);
            setMensagens((anteriores) => [
                ...anteriores,
                {
                    id: `${Date.now()}-assistant`,
                    papel: "assistant",
                    resposta: respostaIA.resposta,
                    tarefaCard: {
                        tipo: "resumo_cliente",
                        cliente: detalhe.clientes[0],
                    },
                },
            ]);
        } catch (falha) {
            setErro(
                falha.message ||
                    "Não foi possível consultar os dados deste cliente.",
            );
        } finally {
            setAEnviar(false);
        }
    };

    const confirmarTarefaLeitura = async (payload) => {
        setAEnviar(true);
        setErro("");
        try {
            const resultado = await previewPost(
                "/assistente/tarefas/leitura/confirmar",
                { ...payload, confirmacao: true },
            );
            setMensagens((anteriores) => [
                ...anteriores,
                {
                    id: `${Date.now()}-assistant`,
                    papel: "assistant",
                    texto: `Leitura confirmada e factura emitida para ${tarefa?.cliente?.nome ?? "o cliente"}.`,
                    tarefaCard: {
                        tipo: "factura",
                        leitura: resultado.leitura,
                        factura: resultado.factura,
                    },
                },
            ]);
            setConcluido({ tipo: "leitura", leitura: resultado.leitura, factura: resultado.factura, cliente: tarefa?.cliente, hora: new Date().toISOString() });
            setLeituraDigitada("");
            setTarefa(null);
            // O progresso do ciclo ("13 de 264") vem actualizado do servidor.
            router.reload({ only: ["ciclo"], preserveState: true, preserveScroll: true });
        } catch (falha) {
            setErro(
                falha.message ||
                    "Não foi possível concluir o registo. Confirme os dados e tente novamente.",
            );
        } finally {
            setAEnviar(false);
        }
    };

    const confirmarTarefaPagamento = async (payload) => {
        setAEnviar(true);
        setErro("");
        try {
            const resultado = await previewPost("/pagamentos", payload);
            setMensagens((anteriores) => [
                ...anteriores,
                {
                    id: `${Date.now()}-assistant`,
                    papel: "assistant",
                    texto: `Pagamento registado. Recibo ${resultado.pagamento.numero_recibo}; factura ${resultado.factura.numero_factura} (${resultado.factura.estado}).`,
                    tarefaCard: { tipo: "pagamento", ...resultado },
                },
            ]);
            setConcluido({ tipo: "pagamento", ...resultado, cliente: tarefa?.cliente, fica: tarefa?.distribuicao?.fica_em_aberto, metodo: payload.metodo_pagamento, hora: new Date().toISOString() });
            setTarefa(null);
        } catch (falha) {
            setErro(
                falha.message ||
                    "Não foi possível registar o pagamento. Confirme os dados e tente novamente.",
            );
        } finally {
            setAEnviar(false);
        }
    };

    const confirmarTarefaOperacional = async () => {
        if (!tarefa) return;
        setAEnviar(true);
        setErro("");
        try {
            if (tarefa.tipo === "nova_zona") {
                const resultado = await previewPost(
                    "/assistente/tarefas/zona/confirmar",
                    { nome: tarefa.nome, confirmacao: true },
                );
                setMensagens((anteriores) => [
                    ...anteriores,
                    {
                        id: `${Date.now()}-assistant`,
                        papel: "assistant",
                        texto: `Zona ${resultado.zona.nome} criada.`,
                        tarefaCard: {
                            tipo: "zona_criada",
                            zona: resultado.zona,
                        },
                    },
                ]);
            } else if (tarefa.tipo === "nova_ocorrencia") {
                const resultado = await previewPost(
                    "/assistente/tarefas/ocorrencia/confirmar",
                    {
                        tipo: tarefa.tipoOcorrencia,
                        descricao: tarefa.descricao,
                        confirmacao: true,
                    },
                );
                setMensagens((anteriores) => [
                    ...anteriores,
                    {
                        id: `${Date.now()}-assistant`,
                        papel: "assistant",
                        texto: "Ocorrência registada e aberta para acompanhamento.",
                        tarefaCard: {
                            tipo: "ocorrencia_criada",
                            ocorrencia: resultado.ocorrencia,
                        },
                    },
                ]);
            } else if (tarefa.tipo === "registar_producao") {
                const resultado = await previewPost(
                    "/assistente/tarefas/producao/confirmar",
                    { ...tarefa.payload, confirmacao: true },
                );
                setMensagens((anteriores) => [
                    ...anteriores,
                    {
                        id: `${Date.now()}-assistant`,
                        papel: "assistant",
                        texto: "Registo de produção guardado.",
                        tarefaCard: {
                            tipo: "producao_guardada",
                            producao: resultado.producao,
                        },
                    },
                ]);
            }
            setTarefa(null);
        } catch (falha) {
            setErro(
                falha.message ||
                    "Não foi possível concluir a operação. Confirme os dados e tente novamente.",
            );
        } finally {
            setAEnviar(false);
        }
    };

    const executarAccao = (acao) => {
        if (acao.tipo === "pergunta") return enviar(acao.pergunta);
        if (acao.tipo !== "workflow") return router.visit(acao.url);
        const dados = acao.dados ?? {};
        if (acao.tarefa === "nova_leitura") return iniciarRegistoLeitura(dados);
        if (acao.tarefa === "registar_pagamento") return iniciarRegistoPagamento(dados);
        if (acao.tarefa === "nova_zona") return iniciarCriacaoZona();
        if (acao.tarefa === "nova_ocorrencia") return iniciarOcorrencia(dados);
        if (acao.tarefa === "registar_producao") return iniciarProducao();
    };

    useEffect(() => {
        setConversas((anteriores) => {
            const actualizadas = anteriores.map((conversa) =>
                conversa.id === conversaActiva
                    ? {
                          ...conversa,
                          mensagens: mensagens.slice(-30),
                          titulo:
                              conversa.titulo === "Nova conversa"
                                  ? (mensagens
                                        .find((item) => item.papel === "user")
                                        ?.texto?.slice(0, 36) ??
                                    conversa.titulo)
                                  : conversa.titulo,
                          actualizada: Date.now(),
                      }
                    : conversa,
            );
            try {
                window.sessionStorage.setItem(
                    chaveConversa,
                    JSON.stringify({
                        activa: conversaActiva,
                        conversas: actualizadas,
                    }),
                );
            } catch {
                /* armazenamento opcional */
            }
            return actualizadas;
        });
    }, [chaveConversa, conversaActiva, mensagens]);

    useEffect(() => {
        const lista = listaRef.current;
        if (lista)
            lista.scrollTo({
                top: lista.scrollHeight,
                behavior: reduzirMovimento ? "auto" : "smooth",
            });
    }, [mensagens, aEnviar, aberto, reduzirMovimento]);

    useEffect(() => {
        if (aberto) requestAnimationFrame(() => campoRef.current?.focus());
    }, [aberto]);

    useEffect(
        () => () => {
            window.clearTimeout(limiteGravacaoRef.current);
            if (gravadorAudioRef.current) {
                gravadorAudioRef.current.ondataavailable = null;
                gravadorAudioRef.current.onstop = null;
                if (gravadorAudioRef.current.state !== "inactive")
                    gravadorAudioRef.current.stop();
            }
            streamAudioRef.current
                ?.getTracks()
                .forEach((track) => track.stop());
        },
        [],
    );

    const enviar = async (texto = pergunta) => {
        const mensagem = texto.trim();
        if (!mensagem || aEnviar) return;
        // Só entradas com texto: mensagens que são só cartões ficam resumidas ou de fora.
        const historico = mensagens
            .filter((item) => item.papel === "user" || item.papel === "assistant")
            .map((item) => ({
                papel: item.papel === "user" ? "user" : "assistant",
                mensagem: String(textoDoAssistente(item) ?? "").trim().slice(0, 1200),
            }))
            .filter((item) => item.mensagem !== "")
            .slice(-8);
        const utilizador = {
            id: `${Date.now()}-user`,
            papel: "user",
            texto: mensagem,
        };
        setMensagens((anteriores) => [...anteriores, utilizador]);
        setPergunta("");
        setErro("");
        setAEnviar(true);
        ultimaPerguntaRef.current = null;

        try {
            // Com uma tarefa à espera do cliente, uma frase longa é um pedido novo, não um nome.
            let activa = tarefa;
            if (["cliente", "escolher_cliente"].includes(activa?.etapa) && mensagem.split(/\s+/).length > 4) {
                activa = null;
                setTarefa(null);
            }
            if (activa?.tipo === "registar_pagamento") {
                if (tarefa.etapa === "cliente") {
                    await procurarClientes(mensagem, tarefa);
                } else if (tarefa.etapa === "valor") {
                    const valor = Number(
                        mensagem
                            .replace(/\s/g, "")
                            .replace(/\.(?=\d{3}(?:,|$))/g, "")
                            .replace(",", "."),
                    );
                    if (!Number.isFinite(valor) || valor <= 0)
                        throw new Error(
                            "Indique um valor pago superior a zero, como 500,00.",
                        );
                    // Reparte já, e o método escolhe-se na folha "Confirma o pagamento?".
                    if (tarefa.factura) await preverPagamento({ factura_id: tarefa.factura.id, valor_pago: valor, metodo_pagamento: "dinheiro" }, { ...tarefa, valor });
                    else await distribuirPagamento(valor, tarefa);
                } else if (tarefa.etapa === "referencia") {
                    const payload = {
                        factura_id: tarefa.factura.id,
                        valor_pago: tarefa.valor,
                        metodo_pagamento: tarefa.metodo,
                        referencia_pagamento: mensagem.trim(),
                    };
                    await preverPagamento(payload);
                }
                return;
            }
            if (
                ["nova_zona", "nova_ocorrencia", "registar_producao"].includes(
                    activa?.tipo,
                )
            ) {
                if (tarefa.tipo === "nova_zona" && tarefa.etapa === "nome") {
                    setTarefa({
                        ...tarefa,
                        etapa: "confirmar",
                        nome: mensagem.trim(),
                    });
                    setMensagens((anteriores) => [
                        ...anteriores,
                        {
                            id: `${Date.now()}-assistant`,
                            papel: "assistant",
                            texto: "Confirme a criação desta zona.",
                            tarefaCard: {
                                tipo: "zona_previa",
                                nome: mensagem.trim(),
                            },
                        },
                    ]);
                } else if (
                    tarefa.tipo === "nova_ocorrencia" &&
                    tarefa.etapa === "descricao"
                ) {
                    if (mensagem.trim().length < 5)
                        throw new Error(
                            "Descreva a ocorrência com pelo menos cinco caracteres.",
                        );
                    setTarefa({
                        ...tarefa,
                        etapa: "confirmar",
                        descricao: mensagem.trim(),
                    });
                    setMensagens((anteriores) => [
                        ...anteriores,
                        {
                            id: `${Date.now()}-assistant`,
                            papel: "assistant",
                            texto: "Confira o tipo e a descrição antes de registar a ocorrência.",
                            tarefaCard: {
                                tipo: "ocorrencia_previa",
                                tipoOcorrencia: tarefa.tipoOcorrencia,
                                descricao: mensagem.trim(),
                            },
                        },
                    ]);
                } else if (
                    tarefa.tipo === "registar_producao" &&
                    tarefa.etapa === "periodo_manual"
                ) {
                    const valor = mensagem.match(
                        /^(?:(0?[1-9]|1[0-2])[/.\-](20\d{2})|(20\d{2})-(0?[1-9]|1[0-2]))$/,
                    );
                    if (!valor)
                        throw new Error(
                            "Indique o mês e o ano no formato MM/AAAA, por exemplo 09/2026.",
                        );
                    escolherPeriodo(
                        valor[3]
                            ? `${valor[3]}-${String(valor[4]).padStart(2, "0")}`
                            : `${valor[2]}-${String(valor[1]).padStart(2, "0")}`,
                    );
                } else if (
                    tarefa.tipo === "registar_producao" &&
                    tarefa.etapa === "volume"
                ) {
                    const volume = Number(
                        mensagem
                            .replace(/\s/g, "")
                            .replace(/\.(?=\d{3}(?:,|$))/g, "")
                            .replace(",", "."),
                    );
                    if (!Number.isFinite(volume) || volume < 0)
                        throw new Error(
                            "Indique um volume igual ou superior a zero, em m³.",
                        );
                    const payload = {
                        zona_id: tarefa.zona?.id ?? null,
                        mes: tarefa.mes,
                        ano: tarefa.ano,
                        volume_m3: volume,
                    };
                    const previa = await previewPost(
                        "/assistente/tarefas/producao/prever",
                        payload,
                    );
                    setTarefa({
                        ...tarefa,
                        etapa: "confirmar",
                        payload,
                        previa,
                    });
                    setMensagens((anteriores) => [
                        ...anteriores,
                        {
                            id: `${Date.now()}-assistant`,
                            papel: "assistant",
                            texto: previa.vai_substituir
                                ? "Já existe um registo neste período. Confirme se quer substituir o volume guardado."
                                : "Confira o volume e confirme o registo.",
                            tarefaCard: { tipo: "producao_previa", previa },
                        },
                    ]);
                }
                return;
            }
            if (activa?.tipo === "nova_leitura") {
                if (tarefa.etapa === "cliente") {
                    await procurarClientes(mensagem, tarefa);
                } else if (tarefa.etapa === "periodo_manual") {
                    const valor = mensagem.match(
                        /^(?:(0?[1-9]|1[0-2])[/.\-](20\d{2})|(20\d{2})-(0?[1-9]|1[0-2]))$/,
                    );
                    if (!valor)
                        throw new Error(
                            "Indique o mês e o ano no formato MM/AAAA, por exemplo 09/2026.",
                        );
                    escolherPeriodo(
                        valor[3]
                            ? `${valor[3]}-${String(valor[4]).padStart(2, "0")}`
                            : `${valor[2]}-${String(valor[1]).padStart(2, "0")}`,
                    );
                } else if (tarefa.etapa === "contador") {
                    const leitura = Number(
                        mensagem
                            .replace(/\s/g, "")
                            .replace(/\.(?=\d{3}(?:,|$))/g, "")
                            .replace(",", "."),
                    );
                    if (!Number.isFinite(leitura) || leitura < 0)
                        throw new Error(
                            "Indique um valor numérico igual ou superior a zero, como 1234,50.",
                        );
                    const payload = {
                        cliente_id: tarefa.cliente.id,
                        mes: tarefa.mes,
                        ano: tarefa.ano,
                        leitura_actual: leitura,
                    };
                    const previa = await previewPost(
                        "/assistente/tarefas/leitura/prever",
                        payload,
                    );
                    if (
                        previa.plano.retroactiva &&
                        !previa.plano.pode_aplicar
                    ) {
                        setMensagens((anteriores) => [
                            ...anteriores,
                            {
                                id: `${Date.now()}-assistant`,
                                papel: "assistant",
                                texto: "Esta leitura retroactiva afectaria uma factura que não pode ser recalculada. Não fiz alterações. A equipa deve regularizar essa factura na página de Leituras.",
                            },
                        ]);
                        setTarefa(null);
                    } else {
                        const proximaEtapa = previa.plano.retroactiva
                            ? "motivo"
                            : "confirmar";
                        setTarefa({
                            ...tarefa,
                            etapa: proximaEtapa,
                            payload,
                            previa,
                        });
                        setMensagens((anteriores) => [
                            ...anteriores,
                            {
                                id: `${Date.now()}-assistant`,
                                papel: "assistant",
                                texto: previa.plano.retroactiva
                                    ? "Esta leitura altera a sequência de um mês seguinte. Reveja a prévia e indique o motivo da inserção retroactiva para continuar."
                                    : "Confira a leitura e a estimativa da factura. Ainda não registei nada.",
                                tarefaCard: { tipo: "previa_leitura", previa },
                            },
                        ]);
                    }
                } else if (tarefa.etapa === "motivo") {
                    if (mensagem.trim().length < 5)
                        throw new Error(
                            "O motivo deve ter pelo menos cinco caracteres.",
                        );
                    const payload = {
                        ...tarefa.payload,
                        motivo: mensagem.trim(),
                    };
                    setTarefa({ ...tarefa, etapa: "confirmar", payload });
                    setMensagens((anteriores) => [
                        ...anteriores,
                        {
                            id: `${Date.now()}-assistant`,
                            papel: "assistant",
                            texto: "Motivo registado na prévia. Confira os valores e confirme se quer aplicar a leitura e emitir a factura.",
                            tarefaCard: {
                                tipo: "previa_leitura",
                                previa: tarefa.previa,
                            },
                        },
                    ]);
                }
                return;
            }
            ultimaPerguntaRef.current = mensagem;
            const resultado = await previewPost("/assistente/perguntar", {
                mensagem,
                historico,
                pagina: paginaActual,
            });
            ultimaPerguntaRef.current = null;
            // Relato de uma operação com dados ("a Maria Langa veio pagar 4 500 MT"):
            // a tarefa começa já, sem um passo intermédio (canvas "5 · Pagamento").
            const primeira = resultado.resposta?.acoes?.[0];
            if (primeira?.iniciar && primeira.tipo === "workflow") {
                await executarAccao(primeira);
                return;
            }
            const novaResposta = { id: `${Date.now()}-assistant`, papel: "assistant", resposta: resultado.resposta };
            setMensagens((anteriores) => [...anteriores, novaResposta]);
            // Chat fechado entretanto: notificação com a resposta e som de gota.
            if (!abertoRef.current && !vozAbertaRef.current) {
                setNotificacao({ pergunta: mensagem, item: novaResposta });
                somGota();
            } else if (document.hidden) {
                somGota();
            }
        } catch (falha) {
            setErro(
                falha.message ||
                    "Não foi possível obter uma resposta. Tenta novamente.",
            );
        } finally {
            setAEnviar(false);
        }
    };

    const iniciarOuPararAudio = async () => {
        if (aGravar) {
            window.clearTimeout(limiteGravacaoRef.current);
            if (gravadorAudioRef.current?.state === "recording")
                gravadorAudioRef.current.stop();
            return;
        }
        if (
            !navigator.mediaDevices?.getUserMedia ||
            typeof MediaRecorder === "undefined"
        ) {
            setErro(
                "Este navegador não permite gravar áudio. Pode escrever a pergunta no chat.",
            );
            return;
        }

        setErro("");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });
            streamAudioRef.current = stream;
            const tipos = [
                "audio/webm;codecs=opus",
                "audio/ogg;codecs=opus",
                "audio/mp4",
                "audio/webm",
                "audio/ogg",
            ];
            const mimeType = tipos.find((tipo) =>
                MediaRecorder.isTypeSupported(tipo),
            );
            const gravador = new MediaRecorder(
                stream,
                mimeType ? { mimeType } : undefined,
            );
            partesAudioRef.current = [];
            gravadorAudioRef.current = gravador;
            gravador.ondataavailable = (evento) => {
                if (evento.data.size > 0)
                    partesAudioRef.current.push(evento.data);
            };
            gravador.onstop = async () => {
                window.clearTimeout(limiteGravacaoRef.current);
                pararMedidor();
                somFimVoz();
                stream.getTracks().forEach((track) => track.stop());
                streamAudioRef.current = null;
                setAGravar(false);
                if (audioCanceladoRef.current) {
                    audioCanceladoRef.current = false;
                    partesAudioRef.current = [];
                    return;
                }
                const audio = new Blob(partesAudioRef.current, {
                    type: gravador.mimeType || "audio/webm",
                });
                partesAudioRef.current = [];
                if (!audio.size) {
                    setErro("Não foi captado áudio. Tente gravar novamente.");
                    return;
                }

                setATranscrever(true);
                try {
                    const formulario = new FormData();
                    const extensao = audio.type.includes("ogg")
                        ? "ogg"
                        : audio.type.includes("mp4")
                          ? "mp4"
                          : "webm";
                    formulario.append("audio", audio, `mensagem.${extensao}`);
                    const resposta = await fetch(
                        "/assistente/transcrever-audio",
                        {
                            method: "POST",
                            headers: {
                                Accept: "application/json",
                                "X-Requested-With": "XMLHttpRequest",
                                "X-CSRF-TOKEN":
                                    document.querySelector(
                                        'meta[name="csrf-token"]',
                                    )?.content ?? "",
                            },
                            credentials: "same-origin",
                            body: formulario,
                        },
                    );
                    const resultado = await resposta.json();
                    if (!resposta.ok) {
                        const mensagem = resultado.errors
                            ? Object.values(resultado.errors).flat()[0]
                            : resultado.message;
                        throw new Error(
                            mensagem || "Não foi possível transcrever o áudio.",
                        );
                    }
                    // No passo "Leitura actual" o ditado preenche o campo grande.
                    if (tarefa?.tipo === "nova_leitura" && tarefa.etapa === "contador") {
                        const valorDitado = lerNumero(String(resultado.texto).replace(/[^\d.,\s]/g, "").trim());
                        setVozAberta(false);
                        if (valorDitado === null) throw new Error("Não percebi um número no áudio. Diga só o valor do contador.");
                        setLeituraDigitada(String(valorDitado).replace(".", ","));
                    } else {
                        // Conversa por voz: a transcrição e a resposta ficam no ecrã de audição.
                        setVozTranscricao(resultado.texto);
                        await enviar(resultado.texto);
                    }
                } catch (falha) {
                    setErro(
                        falha.message ||
                            "Não foi possível transcrever o áudio. Tente novamente.",
                    );
                } finally {
                    setATranscrever(false);
                }
            };
            gravador.start();
            pararDeFalar();
            setAFalarVoz(false);
            somInicioVoz();
            // Nova conversa por voz: só as trocas a partir daqui aparecem e são lidas.
            if (!vozAbertaRef.current) {
                vozInicioRef.current = mensagens.length;
                faladoRef.current = mensagens.at(-1)?.id ?? null;
            }
            setAGravar(true);
            setVozAberta(true);
            setVozTranscricao("");
            setVozAviso("");
            limiteGravacaoRef.current = window.setTimeout(() => {
                if (gravador.state === "recording") gravador.stop();
            }, 60000);
            iniciarMedidor(stream, gravador);
        } catch (falha) {
            streamAudioRef.current
                ?.getTracks()
                .forEach((track) => track.stop());
            streamAudioRef.current = null;
            setAGravar(false);
            setErro(
                falha.name === "NotAllowedError"
                    ? "Permita o acesso ao microfone para gravar a pergunta."
                    : "Não consegui iniciar o microfone. Verifique se está ligado e tente novamente.",
            );
        }
    };

    /**
     * Mede o som do microfone: move as ondas do ecrã de voz e pára sozinho
     * depois de 1,6 s de silêncio (ou aos 8 s se ninguém falar).
     */
    function iniciarMedidor(stream, gravador) {
        const Contexto = window.AudioContext || window.webkitAudioContext;
        if (!Contexto) return;
        const contexto = new Contexto();
        const analisador = contexto.createAnalyser();
        analisador.fftSize = 1024;
        contexto.createMediaStreamSource(stream).connect(analisador);
        audioContextoRef.current = contexto;
        const amostras = new Uint8Array(analisador.fftSize);
        const inicio = performance.now();
        let ultimoSom = inicio;
        let falou = false;
        let ultimaPintura = 0;
        const medir = (agora) => {
            analisador.getByteTimeDomainData(amostras);
            let soma = 0;
            for (const amostra of amostras) {
                const valor = (amostra - 128) / 128;
                soma += valor * valor;
            }
            const rms = Math.sqrt(soma / amostras.length);
            if (agora - ultimaPintura > 60) {
                setNivelVoz(Math.min(1, rms * 7));
                ultimaPintura = agora;
            }
            if (rms > 0.035) {
                falou = true;
                ultimoSom = agora;
            }
            const semFala = !falou && agora - inicio > 8000;
            if ((falou && agora - ultimoSom > 1600) || semFala) {
                if (semFala) {
                    audioCanceladoRef.current = true;
                    setVozAviso("Não ouvi nada. Toque no microfone e fale perto do telefone.");
                }
                if (gravador.state === "recording") gravador.stop();
                return;
            }
            medidorRef.current = requestAnimationFrame(medir);
        };
        medidorRef.current = requestAnimationFrame(medir);
    }

    function pararMedidor() {
        cancelAnimationFrame(medidorRef.current);
        audioContextoRef.current?.close?.().catch(() => {});
        audioContextoRef.current = null;
        setNivelVoz(0);
    }

    // Cancelar o ditado: pára o microfone e descarta o áudio sem enviar.
    const cancelarAudio = () => {
        audioCanceladoRef.current = true;
        window.clearTimeout(limiteGravacaoRef.current);
        setVozAberta(false);
        if (gravadorAudioRef.current?.state === "recording") gravadorAudioRef.current.stop();
        else audioCanceladoRef.current = false;
    };

    const placeholder =
        tarefa?.etapa === "cliente"
            ? "Escreva o nome ou número do cliente…"
            : tarefa?.etapa === "nome"
              ? "Nome da nova zona…"
              : tarefa?.etapa === "descricao"
                ? "Descreva o que aconteceu…"
                : tarefa?.etapa === "periodo_manual"
                  ? "Ou escreva o mês, ex.: 09/2026"
                  : tarefa?.etapa === "contador"
                    ? "Valor actual do contador…"
                    : tarefa?.etapa === "volume"
                      ? "Volume produzido em m³…"
                      : tarefa?.tipo === "registar_pagamento" &&
                          tarefa?.etapa === "valor"
                        ? "Valor recebido…"
                        : tarefa?.etapa === "referencia"
                          ? "Referência da transacção…"
                          : tarefa?.etapa === "motivo"
                            ? "Motivo da leitura retroactiva…"
                            : tarefa
                              ? "Escolha uma opção acima…"
                              : "Pergunte ou peça uma tarefa…";
    const entradaDisponivel = ![
        "escolher_cliente",
        "factura",
        "metodo",
        "periodo",
        "tipo",
        "zona",
        "confirmar",
    ].includes(tarefa?.etapa);

    // ── Contexto da página, papéis e pontos de acesso ──────────────────────
    const papeis = pagina.props.auth?.roles ?? [];
    const caminho = (pagina.url ?? "/").split(/[?#]/, 1)[0];
    // O Painel vive em /admin/dashboard, /gestor/… — o menu usa /dashboard.
    const caminhoMenu = caminho.replace(/^\/(admin|gestor|tecnico|caixa)(?=\/dashboard)/, "");
    const destinos = groups.flatMap((grupo) => grupo.subgrupos?.flatMap((sub) => sub.items) ?? grupo.items ?? []);
    const paginaActual =
        destinos
            .flatMap((item) => [item.href, ...(item.activoEm ?? [])].filter(Boolean).map((prefixo) => ({ prefixo, label: item.label })))
            .filter(({ prefixo }) => caminhoMenu === prefixo || caminhoMenu.startsWith(`${prefixo}/`))
            .sort((a, b) => b.prefixo.length - a.prefixo.length)[0]?.label ?? "esta página";
    const tarefasPermitidas = TAREFAS.filter((item) => item.papeis.some((papel) => papeis.includes(papel)));
    const podeTarefa = (id) => tarefasPermitidas.some((item) => item.tarefa === id);
    const sugestaoDaPagina = Object.entries(SUGESTOES_DE_PAGINA).find(([prefixo]) => caminhoMenu === prefixo || caminhoMenu.startsWith(`${prefixo}/`))?.[1];
    const sugestaoValida = sugestaoDaPagina && (!sugestaoDaPagina.tarefa || podeTarefa(sugestaoDaPagina.tarefa)) ? sugestaoDaPagina : null;
    const chaveSugestao = `aqua-sugestao-vista:${caminho}`;

    const enviarRef = useRef(null);
    enviarRef.current = enviar;
    const executarRef = useRef(null);
    executarRef.current = executarAccao;

    const abrirComPergunta = (texto) => {
        setAberto(true);
        if (texto) enviarRef.current?.(texto);
    };

    // Ctrl + K abre a paleta em qualquer página; o menu e a barra inferior
    // disparam "aqua:abrir" para abrir o painel (opcionalmente com pergunta).
    useEffect(() => {
        if (!assistenteDisponivel) return undefined;
        const atalho = (evento) => {
            if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === "k") {
                evento.preventDefault();
                setPaleta((valor) => !valor);
            }
        };
        const abrir = (evento) => {
            setAberto(true);
            if (evento.detail?.pergunta) enviarRef.current?.(evento.detail.pergunta);
        };
        const abrirPaleta = () => setPaleta(true);
        window.addEventListener("keydown", atalho);
        window.addEventListener("aqua:abrir", abrir);
        window.addEventListener("aqua:paleta", abrirPaleta);
        return () => {
            window.removeEventListener("keydown", atalho);
            window.removeEventListener("aqua:abrir", abrir);
            window.removeEventListener("aqua:paleta", abrirPaleta);
        };
    }, [assistenteDisponivel]);

    // Cronómetro do ditado (limite de 60 s já existe no gravador).
    useEffect(() => {
        if (!aGravar) {
            setSegundosGravacao(0);
            return undefined;
        }
        const inicio = Date.now();
        const temporizador = window.setInterval(() => setSegundosGravacao(Math.floor((Date.now() - inicio) / 1000)), 250);
        return () => window.clearInterval(temporizador);
    }, [aGravar]);

    // Sugestão contextual: uma por página e por sessão, só depois de a
    // pessoa estar uns segundos na página, e nunca enquanto o chat está aberto.
    useEffect(() => {
        setSugestaoVisivel(null);
        if (!assistenteDisponivel || !sugestaoValida) return undefined;
        try {
            if (window.sessionStorage.getItem(chaveSugestao)) return undefined;
        } catch {
            /* armazenamento opcional */
        }
        const temporizador = window.setTimeout(() => {
            setSugestaoVisivel(sugestaoValida);
            // Notificação da Aqua: som de gota (só com o painel fechado).
            if (!abertoRef.current) somGota();
        }, 8000);
        return () => window.clearTimeout(temporizador);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [caminho, assistenteDisponivel]);

    const marcarSugestaoVista = () => {
        setSugestaoVisivel(null);
        try {
            window.sessionStorage.setItem(chaveSugestao, "1");
        } catch {
            /* armazenamento opcional */
        }
    };

    const aceitarSugestao = () => {
        const sugestao = sugestaoVisivel;
        marcarSugestaoVista();
        if (!sugestao) return;
        setAberto(true);
        if (sugestao.tarefa) executarRef.current?.({ tipo: "workflow", tarefa: sugestao.tarefa });
        else enviarRef.current?.(sugestao.pergunta);
    };

    // Uma resposta por voz que arranca uma tarefa (ex.: pagamento) mostra o fluxo no chat.
    useEffect(() => {
        if (vozAberta && tarefa && !aGravar && !aTranscrever && !aEnviar) {
            pararDeFalar();
            setAFalarVoz(false);
            setVozAberta(false);
            setAberto(true);
        }
    }, [vozAberta, tarefa, aGravar, aTranscrever, aEnviar]);

    // Conversa por voz contínua: lê a resposta nova em voz alta e volta a ouvir.
    useEffect(() => {
        if (!vozAberta || aEnviar || aGravar || aTranscrever || tarefa) return;
        const recente = mensagens.at(-1);
        if (!recente || recente.papel !== "assistant" || recente.id === faladoRef.current) return;
        if (mensagens.length - 1 < vozInicioRef.current) return;
        faladoRef.current = recente.id;
        setAFalarVoz(true);
        falar(textoParaFalar(recente), () => {
            setAFalarVoz(false);
            window.setTimeout(() => {
                if (vozAbertaRef.current && !tarefaRef.current) iniciarVozRef.current?.();
            }, 350);
        });
    }, [vozAberta, mensagens, aEnviar, aGravar, aTranscrever, tarefa]);

    const fecharVoz = () => {
        pararDeFalar();
        setAFalarVoz(false);
        if (aGravar) cancelarAudio();
        setVozAberta(false);
    };

    // Abrir o chat apaga a notificação pendente.
    useEffect(() => {
        if (aberto) setNotificacao(null);
    }, [aberto]);

    // Manter premida a mascote (ou o evento "aqua:voz") abre a conversa por voz em ecrã inteiro.
    const iniciarVozRef = useRef(null);
    iniciarVozRef.current = () => {
        setNotificacao(null);
        if (!aGravar && !aTranscrever && !aEnviar) iniciarOuPararAudio();
    };
    useEffect(() => {
        if (!assistenteDisponivel) return undefined;
        const abrirVoz = () => iniciarVozRef.current?.();
        window.addEventListener("aqua:voz", abrirVoz);
        return () => window.removeEventListener("aqua:voz", abrirVoz);
    }, [assistenteDisponivel]);

    if (!assistenteDisponivel) return null;

    // Ecrãs especiais dos fluxos (canvas "3 · Leitura", "4 · Sucesso", "5 · Pagamento").
    const confirmaPagamento = tarefa?.tipo === "registar_pagamento" && tarefa.etapa === "confirmar" && (tarefa.previa || tarefa.distribuicao);
    const ficaEmAberto = Number(tarefa?.distribuicao?.fica_em_aberto ?? tarefa?.previa?.saldo_depois ?? 0);
    const escreveLeitura = tarefa?.tipo === "nova_leitura" && tarefa.etapa === "contador" && tarefa.contexto;
    const confirmaLeitura = tarefa?.tipo === "nova_leitura" && tarefa.etapa === "confirmar" && tarefa.payload;
    const fluxo = confirmaPagamento ? null : infoFluxo(tarefa);
    const ultimaDaAqua = [...mensagens].reverse().find((item) => item.papel === "assistant");
    const erroDePergunta = Boolean(erro && !tarefa && ultimaPerguntaRef.current);
    const humorCabecalho = concluido
        ? "feliz"
        : aGravar
          ? "ouvir"
          : aTranscrever
            ? "processar"
            : aEnviar
              ? "pensar"
              : erroDePergunta
                ? "ops"
                : confirmaPagamento && ficaEmAberto > 0
                  ? "atencao"
                  : ultimaDaAqua
                    ? humorDaMensagem(ultimaDaAqua)
                    : "ola";
    // Mascote do botão flutuante: processa enquanto espera, e com uma resposta
    // por ver mostra a expressão dela (uma resposta simples acende a ideia).
    const humorNotificacao = notificacao ? humorDaMensagem(notificacao.item) : null;
    const humorLancador = notificacao
        ? humorNotificacao === "ola"
            ? "ideia"
            : humorNotificacao
        : aEnviar || aTranscrever
          ? "processar"
          : sugestaoVisivel
            ? "ideia"
            : "ola";
    const tituloCabecalho = concluido ? (concluido.tipo === "leitura" ? "Registar leitura" : "Registar pagamento") : (fluxo?.titulo ?? "Aqua");
    const [estadoTexto, estadoPonto, estadoCor] = concluido
        ? ["Concluído", "bg-[#2EA063]", "text-[#1E7148] dark:text-[#7DD3A3]"]
        : confirmaPagamento && !aEnviar
          ? ["Precisa da sua confirmação", "bg-[#D98A00]", "text-[#8A4F00] dark:text-[#F3C77A]"]
          : aGravar
        ? ["A ouvir…", "bg-[#0059FF]", cor.ligacao]
        : aTranscrever
          ? ["A transcrever o áudio…", "bg-[#0059FF]", cor.ligacao]
          : aEnviar
            ? ["A pensar…", "bg-[#0059FF]", cor.ligacao]
            : erroDePergunta
              ? ["Em pausa por instantes", "bg-[#8C97B0]", cor.texto3]
              : fluxo
                ? [`Com a Aqua · passo ${fluxo.actual + 1} de ${fluxo.passos.length}`, "bg-[#0059FF]", cor.texto3]
                : humorCabecalho === "atencao"
                  ? ["Precisa da sua atenção", "bg-[#D98A00]", "text-[#8A4F00] dark:text-[#F3C77A]"]
                  : [`Pronta · a ver ${paginaActual}`, "bg-[#2EA063]", cor.texto3];
    // Ecrã inicial enquanto não há perguntas nesta conversa (também depois de
    // cancelar uma tarefa começada por um botão).
    const inicio = !mensagens.some((item) => item.papel === "user") && !aEnviar && !tarefa && !erro && !concluido;
    const visiveis = mensagens.filter((item) => item.id !== "boas-vindas");
    const ultima = mensagens.at(-1);
    const seguimentos = !tarefa && !aEnviar && !aTranscrever && !erro && ultima?.papel === "assistant" ? (ultima.resposta?.seguimentos ?? []) : [];

    // Cartão "Hoje": só dados reais (ciclo do mês e alertas do Painel).
    const { ciclo, alertasPendentes = 0 } = pagina.props;
    const gestao = papeis.some((papel) => ["administrador", "gestor"].includes(papel));
    const hoje = [];
    if (ciclo && ciclo.clientes > 0 && ciclo.lidas < ciclo.clientes && papeis.some((papel) => ["administrador", "gestor", "tecnico"].includes(papel))) {
        const prazo = ciclo.diasParaLimite > 1 ? ` · faltam ${ciclo.diasParaLimite} dias` : ciclo.diasParaLimite === 1 ? " · falta 1 dia" : ciclo.diasParaLimite === 0 ? " · termina hoje" : " · prazo passou";
        hoje.push({
            valor: `${Math.floor((ciclo.lidas / ciclo.clientes) * 100)}%`,
            tom: ciclo.diasParaLimite < 0 ? "vermelho" : "azul",
            titulo: `Leituras de ${ciclo.mes}${prazo}`,
            progresso: (ciclo.lidas / ciclo.clientes) * 100,
            onClick: () => router.visit("/leituras"),
        });
    }
    if (gestao && alertasPendentes > 0) {
        hoje.push({ valor: String(alertasPendentes), tom: "ambar", titulo: alertasPendentes === 1 ? "Alerta no Painel por resolver" : "Alertas no Painel por resolver", onClick: () => router.visit("/dashboard") });
    }
    if (ciclo && !ciclo.producaoRegistada && podeTarefa("registar_producao")) {
        hoje.push({ valor: "!", tom: "vermelho", titulo: `Produção de ${ciclo.mes} por registar`, onClick: () => executarAccao({ tipo: "workflow", tarefa: "registar_producao" }) });
    }
    const anterior = conversas.find((conversa) => conversa.id !== conversaActiva && conversa.mensagens?.some((item) => item.papel === "user"));
    const sugestoesIniciais = (papeis.some((papel) => ["administrador", "gestor"].includes(papel))
        ? SUGESTOES_POR_PAPEL.gestao
        : papeis.includes("caixa")
          ? SUGESTOES_POR_PAPEL.caixa
          : SUGESTOES_POR_PAPEL.tecnico
    )
        .filter((sugestao) => !sugestao.tarefa || podeTarefa(sugestao.tarefa))
        .slice(0, 3)
        .map((sugestao) => ({
            ...sugestao,
            onClick: () => (sugestao.tarefa ? executarAccao({ tipo: "workflow", tarefa: sugestao.tarefa }) : enviar(sugestao.pergunta)),
        }));

    const ctx = {
        tarefa,
        aEnviar,
        irPara: (url) => router.visit(url),
        executarAccao,
        carregarPaginaConsulta,
        seleccionarResumoCliente,
        escolherCliente,
        escolherPeriodo,
        pedirOutroMes,
        escolherTipoOcorrencia,
        escolherZonaProducao,
        escolherFacturaPagamento,
        escolherMetodoPagamento,
        confirmarTarefaLeitura,
        confirmarTarefaPagamento,
        confirmarTarefaOperacional,
        cancelarTarefa,
        iniciarRegistoLeitura,
        iniciarRegistoPagamento,
        enviar,
        podeTarefa,
    };

    const terminarConcluido = () => {
        setConcluido(null);
        novaConversa();
    };

    const painel = expandido
        ? "inset-0 h-dvh md:left-auto md:w-[min(640px,92vw)] md:rounded-l-3xl md:border-l shadow-[-18px_0_55px_rgba(4,26,83,0.2)] dark:shadow-[-18px_0_55px_rgba(0,0,0,0.45)]"
        : "inset-x-0 bottom-0 h-[88dvh] rounded-t-[28px] shadow-[0_-12px_40px_rgba(3,9,35,0.2)] md:inset-x-auto md:bottom-6 md:right-6 md:h-[min(800px,calc(100dvh-3rem))] md:w-[400px] md:rounded-3xl md:border md:shadow-[0_24px_60px_rgba(4,26,83,0.18)] dark:md:shadow-[0_24px_60px_rgba(0,0,0,0.55)]";

    return (
        <>
            {paleta && (
                <Paleta
                    onFechar={() => setPaleta(false)}
                    onPerguntar={(texto) => {
                        setPaleta(false);
                        abrirComPergunta(texto);
                    }}
                    onAbrirNoPainel={(texto) => {
                        setPaleta(false);
                        setAberto(true);
                        setPergunta(texto);
                    }}
                    destinos={destinos}
                    tarefas={tarefasPermitidas}
                    onTarefa={(id) => {
                        setPaleta(false);
                        setAberto(true);
                        executarAccao({ tipo: "workflow", tarefa: id });
                    }}
                    onIrPara={(href) => {
                        setPaleta(false);
                        router.visit(href);
                    }}
                />
            )}

            <Lancador
                aberto={aberto}
                onAbrir={() => (aberto ? fechar() : setAberto(true))}
                onFalar={() => iniciarVozRef.current?.()}
                pendente={Boolean(notificacao)}
                humor={humorLancador}
                sugestao={notificacao ? null : sugestaoVisivel}
                onAceitar={aceitarSugestao}
                onDispensar={marcarSugestaoVista}
                accionadorRef={accionadorRef}
            />

            <AnimatePresence>
                {aberto && (
                    <motion.div
                        key="aqua-fundo"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className={`fixed inset-0 z-[65] bg-[rgba(3,9,35,0.38)] dark:bg-black/60 ${expandido ? "" : "md:hidden"}`}
                        onClick={fechar}
                        aria-hidden="true"
                    />
                )}
                {aberto && (
                    <motion.aside
                        id="aqua-guia"
                        key="aqua-guia"
                        initial={reduzirMovimento ? false : { opacity: 0, y: 24, scale: 0.985 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={reduzirMovimento ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.99 }}
                        transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                        className={`fixed z-[66] flex flex-col overflow-hidden border-[#E1E7F3] leading-normal dark:border-[#262C38] ${cor.fundo} ${cor.texto} ${painel}`}
                        aria-label="Conversa com a Aqua"
                        role="dialog"
                        onKeyDown={(evento) => {
                            if (evento.key === "Escape" && !aGravar) fechar();
                        }}
                    >
                        <header className={`shrink-0 ${cor.superficie} ${fluxo ? "" : `border-b ${cor.borda}`} pt-[env(safe-area-inset-top)] md:pt-0`}>
                            <span className="mx-auto mt-2 block h-[5px] w-10 rounded-full bg-[#C9D2E3] md:hidden dark:bg-[#363E51]" aria-hidden="true" />
                            <div className="flex items-center gap-2.5 py-2.5 pl-4 pr-3">
                                <Mascote humor={humorCabecalho} tamanho={40} />
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-base font-extrabold">{tituloCabecalho}</div>
                                    <div className={`flex items-center gap-1.5 text-xs font-semibold ${estadoCor}`}>
                                        <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${estadoPonto}`} />
                                        <span className="truncate">{estadoTexto}</span>
                                    </div>
                                </div>
                                {!fluxo && !concluido && !confirmaPagamento && (
                                    <BotaoIcone rotulo="Conversas anteriores" onClick={() => setMenuConversas((valor) => !valor)} activo={menuConversas} expandido={menuConversas}>
                                        <History className="h-5 w-5" />
                                    </BotaoIcone>
                                )}
                                <BotaoIcone rotulo="Fechar a Aqua" onClick={fechar}>
                                    <X className="h-[18px] w-[18px]" />
                                </BotaoIcone>
                            </div>
                        </header>

                        {fluxo && !concluido && <ProgressoTarefa tarefa={tarefa} />}

                        {menuConversas && !fluxo && (
                            <div className={`max-h-72 shrink-0 overflow-y-auto border-b p-2 ${cor.borda} ${cor.superficie}`} aria-label="Conversas anteriores">
                                <div className="mb-1 flex gap-2">
                                    <button type="button" onClick={novaConversa} className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[14px] text-sm font-bold ${cor.primario}`}>
                                        <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
                                        Nova conversa
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setExpandido((valor) => !valor);
                                            setMenuConversas(false);
                                        }}
                                        className={`hidden min-h-11 items-center justify-center gap-2 rounded-[14px] px-3.5 text-sm font-bold md:flex ${cor.suave}`}
                                    >
                                        {expandido ? <Shrink className="h-4 w-4" aria-hidden="true" /> : <Expand className="h-4 w-4" aria-hidden="true" />}
                                        {expandido ? "Reduzir" : "Painel largo"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const ligar = !somAtivo;
                                            definirSons(ligar);
                                            setSomAtivo(ligar);
                                            if (ligar) somGota();
                                        }}
                                        aria-pressed={somAtivo}
                                        aria-label={somAtivo ? "Desligar os sons da Aqua" : "Ligar os sons da Aqua"}
                                        title={somAtivo ? "Sons ligados" : "Sons desligados"}
                                        className={`flex min-h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${cor.suave}`}
                                    >
                                        {somAtivo ? <Volume2 className="h-4 w-4" aria-hidden="true" /> : <VolumeX className="h-4 w-4" aria-hidden="true" />}
                                    </button>
                                </div>
                                {conversas.map((conversa) => (
                                    <div key={conversa.id} className={`flex items-center gap-1 rounded-[14px] ${conversa.id === conversaActiva ? "bg-[#F0F4FF] dark:bg-[#0E1C3F]" : "hover:bg-[#F4F6FB] dark:hover:bg-[#1E232D]"}`}>
                                        <button type="button" onClick={() => abrirConversa(conversa)} className="min-h-11 min-w-0 flex-1 px-3 py-2 text-left">
                                            <span className={`block truncate text-sm font-bold ${cor.texto}`}>{conversa.titulo || "Nova conversa"}</span>
                                            <span className={`block text-[11px] ${cor.texto3}`}>
                                                {new Date(conversa.actualizada ?? Date.now()).toLocaleString("pt-MZ", { dateStyle: "short", timeStyle: "short" })}
                                            </span>
                                        </button>
                                        <BotaoIcone rotulo={`Apagar conversa ${conversa.titulo || "sem título"}`} onClick={() => apagarConversa(conversa.id)} perigo>
                                            <Trash2 className="h-4 w-4" />
                                        </BotaoIcone>
                                    </div>
                                ))}
                                {conversas.length > 1 && (
                                    <button type="button" onClick={limparConversas} className="mt-1 flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-xs font-bold text-[#B42318] hover:bg-[#FDF1F0] dark:text-[#F4A39A] dark:hover:bg-[#2D1714]">
                                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                        Limpar todas as conversas
                                    </button>
                                )}
                            </div>
                        )}

                        <div ref={listaRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4" aria-live="polite" aria-relevant="additions text">
                            <div className="flex flex-col gap-3.5">
                                {concluido ? (
                                    concluido.tipo === "leitura" ? (
                                        <SucessoLeitura concluido={concluido} ciclo={ciclo} irPara={(url) => router.visit(url)} />
                                    ) : (
                                        <SucessoPagamento concluido={concluido} irPara={(url) => router.visit(url)} />
                                    )
                                ) : inicio ? (
                                    <EcraInicial
                                        nome={auth?.user?.name}
                                        hoje={hoje.slice(0, 3)}
                                        conversaAnterior={anterior ? { titulo: anterior.titulo, onAbrir: () => abrirConversa(anterior) } : null}
                                        sugestoes={sugestoesIniciais}
                                    />
                                ) : (
                                    visiveis.map((item) => <Mensagem key={item.id} item={item} ctx={ctx} />)
                                )}
                                {escreveLeitura && !concluido && (
                                    <LeituraActual
                                        contexto={tarefa.contexto}
                                        valor={leituraDigitada}
                                        onValor={setLeituraDigitada}
                                        onDitar={iniciarOuPararAudio}
                                        onOutroMes={pedirOutroMes}
                                        desactivado={aEnviar || aTranscrever}
                                    />
                                )}
                                {(aEnviar || aTranscrever) &&<APensar modo={aTranscrever ? "transcrever" : tarefa ? "tarefa" : "pergunta"} />}
                                {erro &&
                                    !aEnviar &&
                                    (erroDePergunta ? (
                                        <CartaoErro mensagem={erro} podeTentar onTentar={tentarDeNovo} />
                                    ) : (
                                        <p role="alert" className={`rounded-2xl px-3.5 py-3 text-sm ${tarefa ? cor.ambar : cor.vermelho}`}>
                                            {erro}
                                        </p>
                                    ))}
                            </div>
                        </div>

                        {concluido ? (
                            <BarraAccoes
                                empilhado
                                primario={{
                                    rotulo: concluido.tipo === "leitura" ? "Ler o próximo contador" : "Registar outro pagamento",
                                    onClick: () => (concluido.tipo === "leitura" ? iniciarRegistoLeitura() : iniciarRegistoPagamento()),
                                }}
                                secundario={{ rotulo: "Terminar por agora", onClick: terminarConcluido }}
                            />
                        ) : escreveLeitura ? (
                            <BarraAccoes
                                secundario={{ rotulo: "Voltar", onClick: voltarAoCliente, disabled: aEnviar }}
                                primario={{
                                    rotulo: "Rever e confirmar",
                                    onClick: reverLeitura,
                                    disabled: aEnviar || aTranscrever || lerNumero(leituraDigitada) === null,
                                }}
                            />
                        ) : confirmaLeitura ? (
                            <BarraAccoes
                                secundario={{ rotulo: "Corrigir", onClick: () => setTarefa({ ...tarefa, etapa: "contador" }), disabled: aEnviar }}
                                primario={{ rotulo: aEnviar ? "A gravar…" : "Confirmar e emitir", onClick: () => confirmarTarefaLeitura(tarefa.payload), disabled: aEnviar }}
                            />
                        ) : (
                        <form
                            onSubmit={(evento) => {
                                evento.preventDefault();
                                enviar();
                            }}
                            className={`shrink-0 border-t px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 ${cor.borda} ${cor.superficie}`}
                        >
                            {seguimentos.length > 0 && (
                                <div className="-mx-3 mb-2.5 flex gap-2 overflow-x-auto px-3 [scrollbar-width:none]" aria-label="Perguntas de seguimento">
                                    {seguimentos.map((texto) => (
                                        <button
                                            key={texto}
                                            type="button"
                                            onClick={() => enviar(texto)}
                                            className="h-9 shrink-0 rounded-full border border-[#D6E2FF] bg-[#F0F4FF] px-3.5 text-[13px] font-semibold text-[#0A2A78] transition hover:border-[#9DBBFF] dark:border-[#1B2F66] dark:bg-[#0E1C3F] dark:text-[#9DBBFF]"
                                        >
                                            {texto}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <div className={`flex items-end gap-1.5 rounded-3xl border p-1 pl-4 transition focus-within:border-[#9DBBFF] dark:focus-within:border-[#1B2F66] ${cor.borda} ${cor.campo}`}>
                                <label htmlFor="aqua-pergunta" className="sr-only">
                                    Mensagem para a Aqua
                                </label>
                                <textarea
                                    id="aqua-pergunta"
                                    ref={campoRef}
                                    value={pergunta}
                                    onChange={(evento) => setPergunta(evento.target.value)}
                                    onKeyDown={(evento) => {
                                        if (evento.key === "Enter" && !evento.shiftKey) {
                                            evento.preventDefault();
                                            enviar();
                                        }
                                    }}
                                    rows={1}
                                    maxLength={1200}
                                    placeholder={placeholder}
                                    disabled={!entradaDisponivel || aEnviar || aTranscrever || aGravar}
                                    className={`max-h-28 min-h-11 min-w-0 flex-1 resize-none border-0 bg-transparent px-0 py-[11px] text-[15px] leading-snug outline-none placeholder:truncate placeholder:text-[#8C97B0] focus:!border-0 focus:!shadow-none focus:!outline-none focus:ring-0 focus-visible:!shadow-none disabled:cursor-not-allowed ${cor.texto}`}
                                />
                                <button
                                    type="button"
                                    onClick={iniciarOuPararAudio}
                                    disabled={!entradaDisponivel || aEnviar || aTranscrever}
                                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition hover:bg-[#E6EEFF] disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-[#262C38] ${cor.texto2}`}
                                    aria-label="Ditar por voz"
                                    title="Ditar por voz"
                                >
                                    <Mic className="h-5 w-5" aria-hidden="true" />
                                </button>
                                <button
                                    type="submit"
                                    disabled={!pergunta.trim() || aEnviar || aTranscrever || aGravar || !entradaDisponivel}
                                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#041A53] text-white transition hover:bg-[#0A2A78] disabled:cursor-not-allowed disabled:bg-[#C9D2E3] dark:bg-[#0059FF] dark:hover:bg-[#0050E6] dark:disabled:bg-[#363E51]"
                                    aria-label="Enviar"
                                >
                                    <ArrowUp className="h-5 w-5" strokeWidth={2.4} aria-hidden="true" />
                                </button>
                            </div>
                        </form>
                        )}

                        {confirmaPagamento && (
                            <FolhaPagamento
                                tarefa={tarefa}
                                metodo={metodoFolha}
                                onMetodo={setMetodoFolha}
                                referencia={referenciaFolha}
                                onReferencia={setReferenciaFolha}
                                onEditar={editarPagamento}
                                onConfirmar={confirmarFolhaPagamento}
                                aEnviar={aEnviar}
                                erro={erro}
                            />
                        )}

                    </motion.aside>
                )}
            </AnimatePresence>

            {notificacao && !aberto && !vozAberta && (
                <NotificacaoAqua
                    notificacao={notificacao}
                    humor={humorDaMensagem(notificacao.item)}
                    onAbrir={() => setAberto(true)}
                    onDispensar={() => setNotificacao(null)}
                >
                    <Mensagem
                        item={notificacao.item}
                        ctx={{
                            ...ctx,
                            // Os botões da notificação abrem o chat e seguem a acção lá.
                            executarAccao: (acao) => {
                                setAberto(true);
                                executarAccao(acao);
                            },
                            enviar: (texto) => {
                                setAberto(true);
                                enviar(texto);
                            },
                            irPara: (url) => {
                                setNotificacao(null);
                                router.visit(url);
                            },
                        }}
                    />
                </NotificacaoAqua>
            )}

            {/* Conversa por voz em ecrã inteiro, com o resto da app desfocado. */}
            <AnimatePresence>
                {vozAberta && (
                    <motion.div
                        key="aqua-voz"
                        initial={reduzirMovimento ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Conversa por voz com a Aqua"
                        className="fixed inset-0 z-[90] flex items-stretch justify-center bg-[rgba(3,9,35,0.45)] backdrop-blur-xl md:items-center md:p-6 dark:bg-black/60"
                        onKeyDown={(evento) => {
                            if (evento.key === "Escape") fecharVoz();
                        }}
                    >
                        <motion.div
                            initial={reduzirMovimento ? false : { y: 24, scale: 0.98 }}
                            animate={{ y: 0, scale: 1 }}
                            transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
                            className="relative h-full w-full overflow-hidden md:h-[min(860px,100%)] md:max-w-[460px] md:rounded-[32px] md:shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
                        >
                            <EcraVoz
                                fase={aGravar ? "ouvir" : aTranscrever ? "transcrever" : aEnviar ? "pensar" : aFalarVoz ? "falar" : "resposta"}
                                segundos={segundosGravacao}
                                nivel={nivelVoz}
                                titulo="Falar com a Aqua"
                                subtitulo={`A ver ${paginaActual}`}
                                conversa={mensagens
                                    .slice(vozInicioRef.current)
                                    .filter((item) => item.id !== "boas-vindas")
                                    .map((item) =>
                                        item.papel === "user" ? (
                                            <p key={item.id} className="ml-auto max-w-[85%] rounded-[18px] rounded-br-md bg-white/15 px-3.5 py-2.5 text-[15px] leading-snug text-white">
                                                {item.texto}
                                            </p>
                                        ) : (
                                            <div key={item.id} className="rounded-[22px] bg-[#F4F6FB] p-3 text-left text-[#030923] dark:bg-[#161A22] dark:text-[#F4F6FB]">
                                                <Mensagem item={item} ctx={ctx} />
                                            </div>
                                        ),
                                    )}
                                aviso={vozAviso || (!aGravar && !aTranscrever && !aEnviar ? erro : "")}
                                humorResposta={ultima?.papel === "assistant" ? humorDaMensagem(ultima) : "ola"}
                                onParar={iniciarOuPararAudio}
                                onFalar={() => {
                                    pararDeFalar();
                                    setAFalarVoz(false);
                                    iniciarOuPararAudio();
                                }}
                                onCancelar={fecharVoz}
                                onEscrever={() => {
                                    fecharVoz();
                                    setAberto(true);
                                    requestAnimationFrame(() => campoRef.current?.focus());
                                }}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

function BotaoIcone({ rotulo, onClick, children, activo = false, expandido, perigo = false, disabled = false }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={rotulo}
            title={rotulo}
            aria-expanded={expandido}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] transition disabled:opacity-40 ${
                perigo
                    ? "text-[#8C97B0] hover:bg-[#FDF1F0] hover:text-[#B42318] dark:hover:bg-[#2D1714] dark:hover:text-[#F4A39A]"
                    : `text-[#363E51] hover:bg-[#EDF1F8] dark:text-[#C9D2E3] dark:hover:bg-[#262C38] ${activo ? "bg-[#EDF1F8] dark:bg-[#262C38]" : "bg-[#F4F6FB] dark:bg-[#1E232D]"}`
            }`}
        >
            {children}
        </button>
    );
}
