import { ArrowUp, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Droplet, Expand, ExternalLink, Factory, FileText, History, LoaderCircle, MapPinned, MessageSquarePlus, Mic, Plus, Shrink, Sparkles, Square, Trash2, TriangleAlert, UsersRound, WalletCards, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import MascoteAqua from "@/Components/MascoteAqua";
import { formatMoney, formatNumero } from "@/lib/utils";
import { previewPost } from "@/lib/previewPost";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";

function iconeDaAccao(acao) {
    if (acao.tarefa === "nova_leitura") return Plus;
    if (acao.tarefa === "registar_pagamento") return WalletCards;
    const caminho = acao.url?.split("?")[0] ?? "";
    if (caminho.startsWith("/clientes")) return UsersRound;
    if (caminho.startsWith("/facturas")) return FileText;
    if (caminho.startsWith("/pagamentos")) return WalletCards;
    if (caminho.startsWith("/ocorrencias")) return TriangleAlert;
    if (caminho.startsWith("/producao")) return Factory;
    if (caminho.startsWith("/zonas")) return MapPinned;
    return ExternalLink;
}

function textoDoAssistente(mensagem) {
    if (typeof mensagem.texto === "string") return mensagem.texto;
    const resposta = mensagem.resposta;
    return [resposta?.mensagem, ...(resposta?.passos ?? [])].filter(Boolean).join("\n");
}

const SUGESTOES = ["Resume a situação geral do sistema.", "Quanto foi facturado em Setembro?", "Quantos clientes estão cortados?"];
const BOAS_VINDAS = "Olá! Sou a Aqua. Posso ajudar com indicadores de várias áreas. A conversa acompanha-o enquanto navega.";

function mensagensIniciais() {
    return [{ id: "boas-vindas", papel: "assistant", texto: BOAS_VINDAS }];
}

function carregarConversas(chave, chaveAntiga) {
    try {
        const guardado = JSON.parse(window.sessionStorage.getItem(chave) ?? "null");
        if (Array.isArray(guardado?.conversas) && guardado.conversas.length) {
            const activa = guardado.conversas.find((conversa) => conversa.id === guardado.activa) ?? guardado.conversas[0];
            return { conversas: guardado.conversas, activa: activa.id };
        }
        const legado = JSON.parse(window.sessionStorage.getItem(chaveAntiga) ?? "null");
        const conversa = {
            id: `conversa-${Date.now()}`,
            titulo: legado?.find?.((item) => item.papel === "user")?.texto?.slice(0, 36) ?? "Conversa anterior",
            actualizada: Date.now(),
            mensagens: Array.isArray(legado) && legado.length ? legado : mensagensIniciais(),
        };
        return { conversas: [conversa], activa: conversa.id };
    } catch {
        const conversa = { id: `conversa-${Date.now()}`, titulo: "Nova conversa", actualizada: Date.now(), mensagens: mensagensIniciais() };
        return { conversas: [conversa], activa: conversa.id };
    }
}

export default function AquaGuia() {
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
    if (!dadosIniciaisRef.current) dadosIniciaisRef.current = carregarConversas(chaveConversa, `aqua-chat-v1-${auth?.user?.id ?? "sessao"}`);
    const [conversas, setConversas] = useState(dadosIniciaisRef.current.conversas);
    const [conversaActiva, setConversaActiva] = useState(dadosIniciaisRef.current.activa);
    const [mensagens, setMensagens] = useState(() => dadosIniciaisRef.current.conversas.find((conversa) => conversa.id === dadosIniciaisRef.current.activa)?.mensagens ?? mensagensIniciais());
    const listaRef = useRef(null);
    const campoRef = useRef(null);
    const accionadorRef = useRef(null);
    const gravadorAudioRef = useRef(null);
    const streamAudioRef = useRef(null);
    const partesAudioRef = useRef([]);
    const limiteGravacaoRef = useRef(null);

    const fechar = () => {
        setAberto(false);
        setExpandido(false);
        requestAnimationFrame(() => accionadorRef.current?.focus());
    };

    const novaConversa = () => {
        const agora = Date.now();
        const nova = { id: `conversa-${agora}`, titulo: "Nova conversa", actualizada: agora, mensagens: mensagensIniciais() };
        setConversas((anteriores) => [
            nova,
            { ...anteriores.find((conversa) => conversa.id === conversaActiva), mensagens: mensagens.slice(-30), actualizada: agora },
            ...anteriores.filter((conversa) => conversa.id !== conversaActiva),
        ].filter((conversa) => conversa.id).slice(0, 12));
        setConversaActiva(nova.id);
        setMensagens(nova.mensagens);
        setTarefa(null);
        setPergunta("");
        setErro("");
        setMenuConversas(false);
    };

    const abrirConversa = (conversa) => {
        setConversaActiva(conversa.id);
        setMensagens(conversa.mensagens?.length ? conversa.mensagens : mensagensIniciais());
        setTarefa(null);
        setPergunta("");
        setErro("");
        setMenuConversas(false);
    };

    const apagarConversa = (id) => {
        const restantes = conversas.filter((conversa) => conversa.id !== id);
        if (id !== conversaActiva) {
            setConversas(restantes);
            try { window.sessionStorage.setItem(chaveConversa, JSON.stringify({ activa: conversaActiva, conversas: restantes })); } catch { /* armazenamento opcional */ }
            return;
        }
        const proxima = restantes[0] ?? { id: `conversa-${Date.now()}`, titulo: "Nova conversa", actualizada: Date.now(), mensagens: mensagensIniciais() };
        setConversas(restantes.length ? restantes : [proxima]);
        setConversaActiva(proxima.id);
        setMensagens(proxima.mensagens ?? mensagensIniciais());
        setTarefa(null);
        setPergunta("");
        setErro("");
    };

    const limparConversas = () => {
        const nova = { id: `conversa-${Date.now()}`, titulo: "Nova conversa", actualizada: Date.now(), mensagens: mensagensIniciais() };
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
            const resultado = await previewPost("/assistente/tarefas/consulta/pagina", {
                entidade: card.entidade, operacao: "listar", pesquisa: card.pesquisa ?? "",
                periodo: card.periodo ?? "", pagina, limite: card.limite ?? 10,
            });
            setMensagens((anteriores) => [...anteriores, {
                id: `${Date.now()}-assistant`, papel: "assistant", texto: `${card.titulo} · página ${resultado.consulta_card.pagina} de ${resultado.consulta_card.total_paginas}.`,
                resposta: { consulta_card: resultado.consulta_card },
            }]);
        } catch (falha) {
            setErro(falha.message || "Não foi possível carregar mais resultados.");
        } finally {
            setAEnviar(false);
        }
    };

    const iniciarRegistoLeitura = () => {
        setErro("");
        setTarefa({ tipo: "nova_leitura", etapa: "cliente" });
        setMensagens((anteriores) => [...anteriores, {
            id: `${Date.now()}-assistant`, papel: "assistant",
            texto: "Vamos preparar a leitura e a prévia da factura. Qual é o nome ou número do cliente?",
        }]);
    };

    const iniciarRegistoPagamento = () => {
        setErro("");
        setTarefa({ tipo: "registar_pagamento", etapa: "cliente" });
        setMensagens((anteriores) => [...anteriores, {
            id: `${Date.now()}-assistant`, papel: "assistant",
            texto: "Vamos registar o pagamento. Qual é o nome ou número do cliente?",
        }]);
    };

    const iniciarCriacaoZona = () => {
        setTarefa({ tipo: "nova_zona", etapa: "nome" });
        setMensagens((anteriores) => [...anteriores, { id: `${Date.now()}-assistant`, papel: "assistant", texto: "Qual é o nome da nova zona?" }]);
    };

    const iniciarOcorrencia = () => {
        setTarefa({ tipo: "nova_ocorrencia", etapa: "tipo" });
        setMensagens((anteriores) => [...anteriores, { id: `${Date.now()}-assistant`, papel: "assistant", texto: "Que tipo de ocorrência pretende registar?", tarefaCard: { tipo: "tipos_ocorrencia" } }]);
    };

    const iniciarProducao = async () => {
        setAEnviar(true);
        try {
            const resultado = await previewPost("/assistente/tarefas/zonas/listar", {});
            setTarefa({ tipo: "registar_producao", etapa: "periodo", zonas: resultado.zonas ?? [], periodoActual: resultado.periodo_actual });
            setMensagens((anteriores) => [...anteriores, { id: `${Date.now()}-assistant`, papel: "assistant", texto: "A produção é do ciclo actual ou de outro mês?", tarefaCard: { tipo: "periodo", periodoActual: resultado.periodo_actual } }]);
        } catch (falha) {
            setErro(falha.message || "Não consegui carregar os dados para registar a produção.");
        } finally {
            setAEnviar(false);
        }
    };

    const escolherCliente = async (cliente, periodoActual) => {
        if (tarefa?.tipo === "registar_pagamento") {
            setAEnviar(true);
            try {
                const resultado = await previewPost("/assistente/tarefas/cliente/facturas", { cliente_id: cliente.id });
                setTarefa({ ...tarefa, etapa: "factura", cliente, facturas: resultado.facturas });
                setMensagens((anteriores) => [...anteriores, {
                    id: `${Date.now()}-assistant`, papel: "assistant",
                    texto: resultado.facturas.length ? `Encontrei facturas em aberto de ${cliente.nome}. Qual delas está a ser paga?` : `${cliente.nome} não tem facturas pendentes ou parciais para pagar.`,
                    ...(resultado.facturas.length ? { tarefaCard: { tipo: "facturas_pagamento", facturas: resultado.facturas } } : {}),
                }]);
                if (!resultado.facturas.length) setTarefa(null);
            } catch (falha) {
                setErro(falha.message || "Não consegui consultar as facturas deste cliente.");
            } finally {
                setAEnviar(false);
            }
            return;
        }
        setTarefa({ tipo: "nova_leitura", etapa: "periodo", cliente, periodoActual });
        setMensagens((anteriores) => [...anteriores, {
            id: `${Date.now()}-assistant`, papel: "assistant",
            texto: `Encontrei ${cliente.nome}. A leitura é do ciclo actual ou de outro mês?`,
            tarefaCard: { tipo: "periodo", periodoActual },
        }]);
    };

    const escolherFacturaPagamento = (factura) => {
        setTarefa((actual) => ({ ...actual, etapa: "valor", factura }));
        setMensagens((anteriores) => [...anteriores, {
            id: `${Date.now()}-assistant`, papel: "assistant",
            texto: `Factura ${factura.numero} seleccionada. Quanto recebeu? O saldo em falta é ${formatMoney(factura.em_falta + factura.multa_prevista)}.`,
        }]);
    };

    const preverPagamento = async (payload, tarefaActual = tarefa) => {
        const previa = await previewPost("/assistente/tarefas/pagamento/prever", payload);
        setTarefa({ ...tarefaActual, etapa: "confirmar", payload, previa });
        setMensagens((anteriores) => [...anteriores, {
            id: `${Date.now()}-assistant`, papel: "assistant",
            texto: "Confira os dados. O pagamento só será registado depois de confirmar.",
            tarefaCard: { tipo: "previa_pagamento", previa },
        }]);
    };

    const escolherMetodoPagamento = async (metodo) => {
        const actualizada = { ...tarefa, metodo };
        setTarefa(actualizada);
        if (metodo === "dinheiro") {
            setAEnviar(true);
            setErro("");
            try {
                await preverPagamento({ factura_id: tarefa.factura.id, valor_pago: tarefa.valor, metodo_pagamento: metodo }, actualizada);
            } catch (falha) {
                setErro(falha.message || "Não foi possível preparar a prévia do pagamento.");
            } finally {
                setAEnviar(false);
            }
        } else {
            setTarefa({ ...actualizada, etapa: "referencia" });
            setMensagens((anteriores) => [...anteriores, {
                id: `${Date.now()}-assistant`, papel: "assistant",
                texto: "Qual é a referência da transacção?",
            }]);
        }
    };

    const escolherPeriodo = (periodo) => {
        const [ano, mes] = periodo.split("-").map(Number);
        if (tarefa?.tipo === "registar_producao") {
            setTarefa({ ...tarefa, etapa: "zona", mes, ano });
            setMensagens((anteriores) => [...anteriores, { id: `${Date.now()}-assistant`, papel: "assistant", texto: `Qual é a zona da produção de ${String(mes).padStart(2, "0")}/${ano}?`, tarefaCard: { tipo: "zonas_producao", zonas: tarefa.zonas } }]);
            return;
        }
        setTarefa((actual) => ({ ...actual, etapa: "contador", mes, ano }));
        setMensagens((anteriores) => [...anteriores, {
            id: `${Date.now()}-assistant`, papel: "assistant",
            texto: `Certo, ${String(mes).padStart(2, "0")}/${ano}. Qual é a leitura actual indicada no contador?`,
        }]);
    };

    const escolherZonaProducao = (zona) => {
        setTarefa((actual) => ({ ...actual, etapa: "volume", zona }));
        setMensagens((anteriores) => [...anteriores, { id: `${Date.now()}-assistant`, papel: "assistant", texto: `Qual foi o volume produzido em ${zona?.nome ?? "todo o sistema"}, em metros cúbicos?` }]);
    };

    const escolherTipoOcorrencia = (tipo, rotulo) => {
        setTarefa((actual) => ({ ...actual, etapa: "descricao", tipoOcorrencia: tipo }));
        setMensagens((anteriores) => [...anteriores, { id: `${Date.now()}-assistant`, papel: "assistant", texto: `Descreva a ${rotulo.toLocaleLowerCase()} com pelo menos cinco caracteres. Se souber, inclua onde e o que aconteceu.` }]);
    };

    const cancelarTarefa = () => {
        setTarefa(null);
        setMensagens((anteriores) => [...anteriores, { id: `${Date.now()}-assistant`, papel: "assistant", texto: "Está bem. Não registei nem alterei nada." }]);
    };

    const seleccionarResumoCliente = async (cliente, perguntaOriginal, historicoOriginal = []) => {
        setAEnviar(true);
        setErro("");
        try {
            const [respostaIA, detalhe] = await Promise.all([
                previewPost("/assistente/perguntar", { mensagem: perguntaOriginal, cliente_id: cliente.id, historico: historicoOriginal }),
                previewPost("/assistente/tarefas/cliente/resumo", { cliente_id: cliente.id }),
            ]);
            setMensagens((anteriores) => [...anteriores, {
                id: `${Date.now()}-assistant`, papel: "assistant", resposta: respostaIA.resposta,
                tarefaCard: { tipo: "resumo_cliente", cliente: detalhe.clientes[0] },
            }]);
        } catch (falha) {
            setErro(falha.message || "Não foi possível consultar os dados deste cliente.");
        } finally {
            setAEnviar(false);
        }
    };

    const confirmarTarefaLeitura = async (payload) => {
        setAEnviar(true);
        setErro("");
        try {
            const resultado = await previewPost("/assistente/tarefas/leitura/confirmar", { ...payload, confirmacao: true });
            setMensagens((anteriores) => [...anteriores, {
                id: `${Date.now()}-assistant`, papel: "assistant",
                texto: `Leitura confirmada e factura emitida para ${tarefa?.cliente?.nome ?? "o cliente"}.`,
                tarefaCard: { tipo: "factura", leitura: resultado.leitura, factura: resultado.factura },
            }]);
            setTarefa(null);
        } catch (falha) {
            setErro(falha.message || "Não foi possível concluir o registo. Confirme os dados e tente novamente.");
        } finally {
            setAEnviar(false);
        }
    };

    const confirmarTarefaPagamento = async (payload) => {
        setAEnviar(true);
        setErro("");
        try {
            const resultado = await previewPost("/pagamentos", payload);
            setMensagens((anteriores) => [...anteriores, {
                id: `${Date.now()}-assistant`, papel: "assistant",
                texto: `Pagamento registado. Recibo ${resultado.pagamento.numero_recibo}; factura ${resultado.factura.numero_factura} (${resultado.factura.estado}).`,
                tarefaCard: { tipo: "pagamento", ...resultado },
            }]);
            setTarefa(null);
        } catch (falha) {
            setErro(falha.message || "Não foi possível registar o pagamento. Confirme os dados e tente novamente.");
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
                const resultado = await previewPost("/assistente/tarefas/zona/confirmar", { nome: tarefa.nome, confirmacao: true });
                setMensagens((anteriores) => [...anteriores, { id: `${Date.now()}-assistant`, papel: "assistant", texto: `Zona ${resultado.zona.nome} criada.`, tarefaCard: { tipo: "zona_criada", zona: resultado.zona } }]);
            } else if (tarefa.tipo === "nova_ocorrencia") {
                const resultado = await previewPost("/assistente/tarefas/ocorrencia/confirmar", { tipo: tarefa.tipoOcorrencia, descricao: tarefa.descricao, confirmacao: true });
                setMensagens((anteriores) => [...anteriores, { id: `${Date.now()}-assistant`, papel: "assistant", texto: "Ocorrência registada e aberta para acompanhamento.", tarefaCard: { tipo: "ocorrencia_criada", ocorrencia: resultado.ocorrencia } }]);
            } else if (tarefa.tipo === "registar_producao") {
                const resultado = await previewPost("/assistente/tarefas/producao/confirmar", { ...tarefa.payload, confirmacao: true });
                setMensagens((anteriores) => [...anteriores, { id: `${Date.now()}-assistant`, papel: "assistant", texto: "Registo de produção guardado.", tarefaCard: { tipo: "producao_guardada", producao: resultado.producao } }]);
            }
            setTarefa(null);
        } catch (falha) {
            setErro(falha.message || "Não foi possível concluir a operação. Confirme os dados e tente novamente.");
        } finally {
            setAEnviar(false);
        }
    };

    const executarAccao = (acao) => {
        if (acao.tipo !== "workflow") return router.visit(acao.url);
        if (acao.tarefa === "nova_leitura") return iniciarRegistoLeitura();
        if (acao.tarefa === "registar_pagamento") return iniciarRegistoPagamento();
        if (acao.tarefa === "nova_zona") return iniciarCriacaoZona();
        if (acao.tarefa === "nova_ocorrencia") return iniciarOcorrencia();
        if (acao.tarefa === "registar_producao") return iniciarProducao();
    };

    useEffect(() => {
        setConversas((anteriores) => {
            const actualizadas = anteriores.map((conversa) => conversa.id === conversaActiva ? {
                ...conversa,
                mensagens: mensagens.slice(-30),
                titulo: conversa.titulo === "Nova conversa"
                    ? (mensagens.find((item) => item.papel === "user")?.texto?.slice(0, 36) ?? conversa.titulo)
                    : conversa.titulo,
                actualizada: Date.now(),
            } : conversa);
            try { window.sessionStorage.setItem(chaveConversa, JSON.stringify({ activa: conversaActiva, conversas: actualizadas })); } catch { /* armazenamento opcional */ }
            return actualizadas;
        });
    }, [chaveConversa, conversaActiva, mensagens]);

    useEffect(() => {
        const lista = listaRef.current;
        if (lista) lista.scrollTo({ top: lista.scrollHeight, behavior: reduzirMovimento ? "auto" : "smooth" });
    }, [mensagens, aEnviar, aberto, reduzirMovimento]);

    useEffect(() => {
        if (aberto) requestAnimationFrame(() => campoRef.current?.focus());
    }, [aberto]);

    useEffect(() => () => {
        window.clearTimeout(limiteGravacaoRef.current);
        if (gravadorAudioRef.current) {
            gravadorAudioRef.current.ondataavailable = null;
            gravadorAudioRef.current.onstop = null;
            if (gravadorAudioRef.current.state !== "inactive") gravadorAudioRef.current.stop();
        }
        streamAudioRef.current?.getTracks().forEach((track) => track.stop());
    }, []);

    const enviar = async (texto = pergunta) => {
        const mensagem = texto.trim();
        if (!mensagem || aEnviar) return;
        const historico = mensagens
            .filter((item) => item.papel === "user" || item.papel === "assistant")
            .slice(-8)
            .map((item) => ({ papel: item.papel === "user" ? "user" : "assistant", mensagem: textoDoAssistente(item).slice(0, 1200) }));
        const utilizador = { id: `${Date.now()}-user`, papel: "user", texto: mensagem };
        setMensagens((anteriores) => [...anteriores, utilizador]);
        setPergunta("");
        setErro("");
        setAEnviar(true);

        try {
            if (tarefa?.tipo === "registar_pagamento") {
                if (tarefa.etapa === "cliente") {
                    const resultado = await previewPost("/assistente/tarefas/clientes", { pesquisa: mensagem });
                    const clientes = resultado.clientes ?? [];
                    setTarefa({ ...tarefa, etapa: clientes.length ? "escolher_cliente" : "cliente" });
                    setMensagens((anteriores) => [...anteriores, {
                        id: `${Date.now()}-assistant`, papel: "assistant",
                        texto: clientes.length ? "Escolha o cliente correcto:" : "Não encontrei esse cliente activo. Tente o nome ou número de cliente.",
                        ...(clientes.length ? { tarefaCard: { tipo: "clientes", clientes } } : {}),
                    }]);
                } else if (tarefa.etapa === "valor") {
                    const valor = Number(mensagem.replace(/\s/g, "").replace(/\.(?=\d{3}(?:,|$))/g, "").replace(",", "."));
                    if (!Number.isFinite(valor) || valor <= 0) throw new Error("Indique um valor pago superior a zero, como 500,00.");
                    setTarefa({ ...tarefa, etapa: "metodo", valor });
                    setMensagens((anteriores) => [...anteriores, {
                        id: `${Date.now()}-assistant`, papel: "assistant", texto: "Como foi feito o pagamento?",
                        tarefaCard: { tipo: "metodos_pagamento" },
                    }]);
                } else if (tarefa.etapa === "referencia") {
                    const payload = { factura_id: tarefa.factura.id, valor_pago: tarefa.valor, metodo_pagamento: tarefa.metodo, referencia_pagamento: mensagem.trim() };
                    await preverPagamento(payload);
                }
                return;
            }
            if (["nova_zona", "nova_ocorrencia", "registar_producao"].includes(tarefa?.tipo)) {
                if (tarefa.tipo === "nova_zona" && tarefa.etapa === "nome") {
                    setTarefa({ ...tarefa, etapa: "confirmar", nome: mensagem.trim() });
                    setMensagens((anteriores) => [...anteriores, { id: `${Date.now()}-assistant`, papel: "assistant", texto: "Confirme a criação desta zona.", tarefaCard: { tipo: "zona_previa", nome: mensagem.trim() } }]);
                } else if (tarefa.tipo === "nova_ocorrencia" && tarefa.etapa === "descricao") {
                    if (mensagem.trim().length < 5) throw new Error("Descreva a ocorrência com pelo menos cinco caracteres.");
                    setTarefa({ ...tarefa, etapa: "confirmar", descricao: mensagem.trim() });
                    setMensagens((anteriores) => [...anteriores, { id: `${Date.now()}-assistant`, papel: "assistant", texto: "Confira o tipo e a descrição antes de registar a ocorrência.", tarefaCard: { tipo: "ocorrencia_previa", tipoOcorrencia: tarefa.tipoOcorrencia, descricao: mensagem.trim() } }]);
                } else if (tarefa.tipo === "registar_producao" && tarefa.etapa === "periodo_manual") {
                    const valor = mensagem.match(/^(?:(0?[1-9]|1[0-2])[/.\-](20\d{2})|(20\d{2})-(0?[1-9]|1[0-2]))$/);
                    if (!valor) throw new Error("Indique o mês e o ano no formato MM/AAAA, por exemplo 09/2026.");
                    escolherPeriodo(valor[3] ? `${valor[3]}-${String(valor[4]).padStart(2, "0")}` : `${valor[2]}-${String(valor[1]).padStart(2, "0")}`);
                } else if (tarefa.tipo === "registar_producao" && tarefa.etapa === "volume") {
                    const volume = Number(mensagem.replace(/\s/g, "").replace(/\.(?=\d{3}(?:,|$))/g, "").replace(",", "."));
                    if (!Number.isFinite(volume) || volume < 0) throw new Error("Indique um volume igual ou superior a zero, em m³.");
                    const payload = { zona_id: tarefa.zona?.id ?? null, mes: tarefa.mes, ano: tarefa.ano, volume_m3: volume };
                    const previa = await previewPost("/assistente/tarefas/producao/prever", payload);
                    setTarefa({ ...tarefa, etapa: "confirmar", payload, previa });
                    setMensagens((anteriores) => [...anteriores, { id: `${Date.now()}-assistant`, papel: "assistant", texto: previa.vai_substituir ? "Já existe um registo neste período. Confirme se quer substituir o volume guardado." : "Confira o volume e confirme o registo.", tarefaCard: { tipo: "producao_previa", previa } }]);
                }
                return;
            }
            if (tarefa?.tipo === "nova_leitura") {
                if (tarefa.etapa === "cliente") {
                    const resultado = await previewPost("/assistente/tarefas/clientes", { pesquisa: mensagem });
                    const clientes = resultado.clientes ?? [];
                    setTarefa({ ...tarefa, etapa: clientes.length ? "escolher_cliente" : "cliente", periodoActual: resultado.periodo_actual });
                    setMensagens((anteriores) => [...anteriores, {
                        id: `${Date.now()}-assistant`, papel: "assistant",
                        texto: clientes.length ? "Escolha o cliente correcto nos resultados:" : "Não encontrei esse cliente activo. Tente o nome ou número de cliente.",
                        ...(clientes.length ? { tarefaCard: { tipo: "clientes", clientes, periodoActual: resultado.periodo_actual } } : {}),
                    }]);
                } else if (tarefa.etapa === "periodo_manual") {
                    const valor = mensagem.match(/^(?:(0?[1-9]|1[0-2])[/.\-](20\d{2})|(20\d{2})-(0?[1-9]|1[0-2]))$/);
                    if (!valor) throw new Error("Indique o mês e o ano no formato MM/AAAA, por exemplo 09/2026.");
                    escolherPeriodo(valor[3] ? `${valor[3]}-${String(valor[4]).padStart(2, "0")}` : `${valor[2]}-${String(valor[1]).padStart(2, "0")}`);
                } else if (tarefa.etapa === "contador") {
                    const leitura = Number(mensagem.replace(/\s/g, "").replace(/\.(?=\d{3}(?:,|$))/g, "").replace(",", "."));
                    if (!Number.isFinite(leitura) || leitura < 0) throw new Error("Indique um valor numérico igual ou superior a zero, como 1234,50.");
                    const payload = { cliente_id: tarefa.cliente.id, mes: tarefa.mes, ano: tarefa.ano, leitura_actual: leitura };
                    const previa = await previewPost("/assistente/tarefas/leitura/prever", payload);
                    if (previa.plano.retroactiva && !previa.plano.pode_aplicar) {
                        setMensagens((anteriores) => [...anteriores, { id: `${Date.now()}-assistant`, papel: "assistant", texto: "Esta leitura retroactiva afectaria uma factura que não pode ser recalculada. Não fiz alterações. A equipa deve regularizar essa factura na página de Leituras." }]);
                        setTarefa(null);
                    } else {
                        const proximaEtapa = previa.plano.retroactiva ? "motivo" : "confirmar";
                        setTarefa({ ...tarefa, etapa: proximaEtapa, payload, previa });
                        setMensagens((anteriores) => [...anteriores, {
                            id: `${Date.now()}-assistant`, papel: "assistant",
                            texto: previa.plano.retroactiva
                                ? "Esta leitura altera a sequência de um mês seguinte. Reveja a prévia e indique o motivo da inserção retroactiva para continuar."
                                : "Confira a leitura e a estimativa da factura. Ainda não registei nada.",
                            tarefaCard: { tipo: "previa_leitura", previa },
                        }]);
                    }
                } else if (tarefa.etapa === "motivo") {
                    if (mensagem.trim().length < 5) throw new Error("O motivo deve ter pelo menos cinco caracteres.");
                    const payload = { ...tarefa.payload, motivo: mensagem.trim() };
                    setTarefa({ ...tarefa, etapa: "confirmar", payload });
                    setMensagens((anteriores) => [...anteriores, {
                        id: `${Date.now()}-assistant`, papel: "assistant",
                        texto: "Motivo registado na prévia. Confira os valores e confirme se quer aplicar a leitura e emitir a factura.",
                        tarefaCard: { tipo: "previa_leitura", previa: tarefa.previa },
                    }]);
                }
                return;
            }
            const resultado = await previewPost("/assistente/perguntar", { mensagem, historico });
            setMensagens((anteriores) => [...anteriores, { id: `${Date.now()}-assistant`, papel: "assistant", resposta: resultado.resposta }]);
        } catch (falha) {
            setErro(falha.message || "Não foi possível obter uma resposta. Tenta novamente.");
        } finally {
            setAEnviar(false);
        }
    };

    const iniciarOuPararAudio = async () => {
        if (aGravar) {
            window.clearTimeout(limiteGravacaoRef.current);
            if (gravadorAudioRef.current?.state === "recording") gravadorAudioRef.current.stop();
            return;
        }
        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
            setErro("Este navegador não permite gravar áudio. Pode escrever a pergunta no chat.");
            return;
        }

        setErro("");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamAudioRef.current = stream;
            const tipos = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg"];
            const mimeType = tipos.find((tipo) => MediaRecorder.isTypeSupported(tipo));
            const gravador = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
            partesAudioRef.current = [];
            gravadorAudioRef.current = gravador;
            gravador.ondataavailable = (evento) => {
                if (evento.data.size > 0) partesAudioRef.current.push(evento.data);
            };
            gravador.onstop = async () => {
                window.clearTimeout(limiteGravacaoRef.current);
                stream.getTracks().forEach((track) => track.stop());
                streamAudioRef.current = null;
                setAGravar(false);
                const audio = new Blob(partesAudioRef.current, { type: gravador.mimeType || "audio/webm" });
                partesAudioRef.current = [];
                if (!audio.size) {
                    setErro("Não foi captado áudio. Tente gravar novamente.");
                    return;
                }

                setATranscrever(true);
                try {
                    const formulario = new FormData();
                    const extensao = audio.type.includes("ogg") ? "ogg" : audio.type.includes("mp4") ? "mp4" : "webm";
                    formulario.append("audio", audio, `mensagem.${extensao}`);
                    const resposta = await fetch("/assistente/transcrever-audio", {
                        method: "POST",
                        headers: {
                            Accept: "application/json",
                            "X-Requested-With": "XMLHttpRequest",
                            "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.content ?? "",
                        },
                        credentials: "same-origin",
                        body: formulario,
                    });
                    const resultado = await resposta.json();
                    if (!resposta.ok) {
                        const mensagem = resultado.errors ? Object.values(resultado.errors).flat()[0] : resultado.message;
                        throw new Error(mensagem || "Não foi possível transcrever o áudio.");
                    }
                    await enviar(resultado.texto);
                } catch (falha) {
                    setErro(falha.message || "Não foi possível transcrever o áudio. Tente novamente.");
                } finally {
                    setATranscrever(false);
                }
            };
            gravador.start();
            setAGravar(true);
            limiteGravacaoRef.current = window.setTimeout(() => {
                if (gravador.state === "recording") gravador.stop();
            }, 60000);
        } catch (falha) {
            streamAudioRef.current?.getTracks().forEach((track) => track.stop());
            streamAudioRef.current = null;
            setAGravar(false);
            setErro(falha.name === "NotAllowedError"
                ? "Permita o acesso ao microfone para gravar a pergunta."
                : "Não consegui iniciar o microfone. Verifique se está ligado e tente novamente.");
        }
    };

    const placeholder = tarefa?.etapa === "cliente"
        ? "Escreva o nome ou número do cliente…"
        : tarefa?.etapa === "nome"
            ? "Nome da nova zona…"
            : tarefa?.etapa === "descricao"
                ? "Descreva o que aconteceu…"
        : tarefa?.etapa === "periodo_manual"
            ? "Mês e ano (MM/AAAA)…"
                : tarefa?.etapa === "contador"
                ? "Valor actual do contador…"
                    : tarefa?.etapa === "volume"
                        ? "Volume produzido em m³…"
                    : tarefa?.tipo === "registar_pagamento" && tarefa?.etapa === "valor"
                        ? "Valor recebido…"
                        : tarefa?.etapa === "referencia"
                            ? "Referência da transacção…"
                : tarefa?.etapa === "motivo"
                    ? "Motivo da leitura retroactiva…"
                    : tarefa
                        ? "Escolha uma opção acima…"
                        : "Pergunta à Aqua sobre qualquer área…";
    const entradaDisponivel = !["escolher_cliente", "factura", "metodo", "periodo", "tipo", "zona", "confirmar"].includes(tarefa?.etapa);

    if (!assistenteDisponivel) return null;

    return (
        <div
            className={aberto && expandido
                ? "fixed inset-0 z-[65] flex justify-end bg-slate-950/25"
                : "fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-[max(0.75rem,env(safe-area-inset-right))] z-[65] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6"}
            onClick={aberto && expandido ? fechar : undefined}
        >
            <AnimatePresence>
                {aberto && (
                    <motion.aside
                        id="aqua-guia"
                        key="aqua-guia"
                        initial={reduzirMovimento ? false : { opacity: 0, transform: "translateY(8px) scale(0.985)" }}
                        animate={{ opacity: 1, transform: "translateY(0) scale(1)" }}
                        exit={reduzirMovimento ? { opacity: 0 } : { opacity: 0, transform: "translateY(8px) scale(0.99)" }}
                        transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                        className={expandido
                            ? "flex h-dvh w-full flex-col overflow-hidden border-l border-slate-200 bg-white pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-[-18px_0_55px_rgba(4,26,83,0.2)] sm:w-[min(640px,92vw)] sm:rounded-l-[18px] dark:border-slate-800 dark:bg-[#161A22] dark:shadow-[-18px_0_55px_rgba(0,0,0,0.42)]"
                            : "flex h-[min(72dvh,680px)] max-h-[calc(100dvh-6.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-[min(420px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(4,26,83,0.2)] dark:border-slate-800 dark:bg-[#161A22] dark:shadow-[0_18px_55px_rgba(0,0,0,0.42)] sm:w-[min(420px,calc(100vw-2rem))]"}
                        aria-label="Conversa global com a Aqua"
                        onClick={(evento) => evento.stopPropagation()}
                        onKeyDown={(evento) => { if (evento.key === "Escape") fechar(); }}
                    >
                        <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800">
                            <MascoteAqua pequeno />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 text-sm font-bold text-ink dark:text-[#F2F5FB]">
                                    Aqua <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">Disponível</span>
                                </div>
                                <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">Conversa única · indicadores de várias áreas</p>
                            </div>
                            <button type="button" onClick={novaConversa} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#262C38]" aria-label="Criar nova conversa" title="Nova conversa">
                                <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <button type="button" onClick={() => setMenuConversas((aberta) => !aberta)} className={`flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#262C38] ${menuConversas ? "bg-slate-100 dark:bg-[#262C38]" : ""}`} aria-label="Ver conversas anteriores" aria-expanded={menuConversas} title="Conversas anteriores">
                                <History className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <button type="button" onClick={() => apagarConversa(conversaActiva)} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-700 dark:text-slate-300 dark:hover:bg-rose-950/40 dark:hover:text-rose-300" aria-label="Apagar esta conversa" title="Apagar conversa">
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setExpandido((valor) => !valor)}
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#262C38]"
                                aria-label={expandido ? "Voltar ao chat flutuante" : "Expandir conversa em painel lateral"}
                                title={expandido ? "Reduzir conversa" : "Expandir conversa"}
                            >
                                {expandido ? <Shrink className="h-4 w-4" aria-hidden="true" /> : <Expand className="h-4 w-4" aria-hidden="true" />}
                            </button>
                            <button type="button" onClick={fechar} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#262C38]" aria-label="Fechar ajuda">
                                <X className="h-4 w-4" aria-hidden="true" />
                            </button>
                        </header>

                        {menuConversas && (
                            <div className="max-h-48 shrink-0 overflow-y-auto border-b border-slate-100 bg-white p-2 dark:border-slate-800 dark:bg-[#161A22]" aria-label="Conversas anteriores">
                                {conversas.length > 0 && <button type="button" onClick={limparConversas} className="mb-1 flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-xs font-semibold text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/40"><Trash2 className="h-3.5 w-3.5" aria-hidden="true" />Limpar todas as conversas</button>}
                                {conversas.length === 0 ? <p className="px-2 py-3 text-xs text-slate-500">Ainda não há conversas guardadas.</p> : conversas.map((conversa) => (
                                    <div key={conversa.id} className={`flex items-center gap-1 rounded-lg ${conversa.id === conversaActiva ? "bg-blue-50 dark:bg-blue-950/30" : "hover:bg-slate-50 dark:hover:bg-white/[0.04]"}`}>
                                        <button type="button" onClick={() => abrirConversa(conversa)} className="min-w-0 flex-1 px-2.5 py-2 text-left text-xs text-slate-700 dark:text-slate-200">
                                            <span className="block truncate font-semibold">{conversa.titulo || "Nova conversa"}</span>
                                            <span className="block text-[10px] text-slate-400">{new Date(conversa.actualizada ?? Date.now()).toLocaleString("pt-MZ", { dateStyle: "short", timeStyle: "short" })}</span>
                                        </button>
                                        <button type="button" onClick={() => apagarConversa(conversa.id)} className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40 dark:hover:text-rose-300" aria-label={`Apagar conversa ${conversa.titulo || "sem título"}`} title="Apagar conversa">
                                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center gap-2 border-b border-slate-100 bg-[#F7F9FD] px-4 py-2 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-[#1E232D] dark:text-slate-300">
                            <Sparkles className="h-3.5 w-3.5 text-brand dark:text-cyan-300" aria-hidden="true" />
                            <span className="truncate">Contexto geral · indicadores e procedimentos</span>
                            <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
                        </div>

                        <div ref={listaRef} className="min-h-24 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4" aria-live="polite" aria-relevant="additions text">
                            {mensagens.map((item) => (
                                <div key={item.id} className={`flex gap-2.5 ${item.papel === "user" ? "justify-end" : "items-start"}`}>
                                    {item.papel === "assistant" && <MascoteAqua pequeno />}
                                    <div className={`max-w-[92%] rounded-[13px] px-3.5 py-2.5 text-[clamp(0.75rem,0.9vw,0.875rem)] leading-relaxed sm:max-w-[87%] ${item.papel === "user" ? "rounded-tr-[4px] bg-brand text-white shadow-sm dark:bg-[#1B3A85]" : "rounded-tl-[4px] border border-slate-200 bg-white text-slate-800 shadow-sm dark:border-[#3A4352] dark:bg-[#242B38] dark:text-slate-100"}`}>
                                        <p className="whitespace-pre-wrap">{item.texto ?? item.resposta?.mensagem}</p>
                                        {item.resposta?.acoes?.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {item.resposta.acoes.map((acao) => {
                                                    const Icone = iconeDaAccao(acao);
                                                    return <PrimaryButton key={`${item.id}-${acao.tarefa ?? acao.url}`} type="button" onClick={() => executarAccao(acao)} className="min-h-9 px-3 text-xs"><Icone className="h-4 w-4" aria-hidden="true" />{acao.rotulo}</PrimaryButton>;
                                                })}
                                            </div>
                                        )}
                                        {item.resposta?.consulta_card && (() => {
                                            const card = item.resposta.consulta_card;
                                            const resumo = Object.entries(card.resumo ?? {}).map(([chave, valor]) => `${chave.replaceAll("_", " ")}: ${typeof valor === "number" ? new Intl.NumberFormat("pt-MZ", { maximumFractionDigits: 2 }).format(valor) : valor}`).join(" · ");
                                            return <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-sm dark:border-slate-700 dark:bg-[#252B36]">
                                                <p className="font-semibold">{card.titulo}{resumo ? <span className="ml-1 font-normal text-slate-500">· {resumo}</span> : null}</p>
                                                {card.registos?.length ? <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                                    {card.registos.map((registo, indice) => <button key={`${registo.url}-${indice}`} type="button" onClick={() => router.visit(registo.url)} className="flex w-full items-start gap-2 py-2 text-left hover:text-brand dark:hover:text-cyan-300">
                                                        <span className="min-w-0 flex-1"><strong className="block">{registo.titulo}</strong><span className="text-[10px] text-slate-500">{registo.detalhe}</span></span>
                                                        <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                                    </button>)}
                                                </div> : <p className="text-slate-500">Não encontrei registos para estes critérios.</p>}
                                                <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2 dark:border-slate-700">
                                                    <SecondaryButton type="button" disabled={aEnviar || card.pagina <= 1} onClick={() => carregarPaginaConsulta(card, card.pagina - 1)} className="min-h-8 px-2 text-[11px]"><ChevronLeft className="h-3.5 w-3.5" />Anterior</SecondaryButton>
                                                    <span className="text-[10px] text-slate-500">Página {card.pagina} / {card.total_paginas}</span>
                                                    <SecondaryButton type="button" disabled={aEnviar || card.pagina >= card.total_paginas} onClick={() => carregarPaginaConsulta(card, card.pagina + 1)} className="min-h-8 px-2 text-[11px]">Seguinte<ChevronRight className="h-3.5 w-3.5" /></SecondaryButton>
                                                </div>
                                                <PrimaryButton type="button" onClick={() => router.visit(card.url)} className="min-h-9 px-3 text-xs"><ExternalLink className="h-4 w-4" aria-hidden="true" />Abrir {card.titulo.toLocaleLowerCase()}</PrimaryButton>
                                            </div>;
                                        })()}
                                        {item.tarefaCard?.tipo === "escolher_resumo_cliente" && (
                                            <div className="mt-3 flex flex-col gap-2">
                                                {item.tarefaCard.clientes.map((cliente) => <SecondaryButton key={cliente.id} type="button" onClick={() => seleccionarResumoCliente(cliente, item.tarefaCard.pergunta, item.tarefaCard.historico)} className="min-h-10 justify-start px-3 text-xs"><UsersRound className="h-4 w-4" aria-hidden="true" />{cliente.nome}<span className="ml-1 font-normal text-slate-500">{cliente.numero_cliente}</span></SecondaryButton>)}
                                            </div>
                                        )}
                                        {item.tarefaCard?.tipo === "resumo_cliente" && (
                                            <div className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-sm dark:border-slate-700 dark:bg-[#252B36]">
                                                <p><strong>{item.tarefaCard.cliente.nome}</strong> · {item.tarefaCard.cliente.numero_cliente} · {item.tarefaCard.cliente.estado}</p>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <p>Saldo em aberto: <strong>{formatMoney(item.tarefaCard.cliente.calculos.saldo_em_aberto)}</strong></p>
                                                    <p>Saldo vencido: <strong>{formatMoney(item.tarefaCard.cliente.calculos.saldo_vencido)}</strong></p>
                                                    <p>Multas registadas em falta: <strong>{formatMoney(item.tarefaCard.cliente.calculos.multas_registadas_em_falta)}</strong></p>
                                                    <p>Multas previstas: <strong>{formatMoney(item.tarefaCard.cliente.calculos.multas_previstas)}</strong></p>
                                                </div>
                                                {item.tarefaCard.cliente.ultima_factura ? <p>Última factura: <strong>{item.tarefaCard.cliente.ultima_factura.numero}</strong> · {item.tarefaCard.cliente.ultima_factura.periodo} · total {formatMoney(item.tarefaCard.cliente.ultima_factura.total)} · saldo {formatMoney(item.tarefaCard.cliente.ultima_factura.saldo)} · {item.tarefaCard.cliente.ultima_factura.estado}</p> : <p>Sem factura registada.</p>}
                                                {item.tarefaCard.cliente.ultima_leitura ? <p>Última leitura: <strong>{item.tarefaCard.cliente.ultima_leitura.periodo}</strong> · contador {formatNumero(item.tarefaCard.cliente.ultima_leitura.contador)} · consumo {formatNumero(item.tarefaCard.cliente.ultima_leitura.consumo_m3)} m³ · {item.tarefaCard.cliente.ultima_leitura.confirmada ? "confirmada" : "por confirmar"}</p> : <p>Sem leitura registada.</p>}
                                                {item.tarefaCard.cliente.ultimo_pagamento && <p>Último pagamento: recibo <strong>{item.tarefaCard.cliente.ultimo_pagamento.recibo}</strong> · {formatMoney(item.tarefaCard.cliente.ultimo_pagamento.valor)} · {item.tarefaCard.cliente.ultimo_pagamento.data}</p>}
                                                {item.tarefaCard.cliente.facturas_em_aberto.length > 0 && <div className="border-t border-slate-200 pt-2 dark:border-slate-700"><p className="mb-1 font-semibold">Facturas em aberto</p>{item.tarefaCard.cliente.facturas_em_aberto.slice(0, 5).map((factura) => <p key={factura.numero} className="py-0.5">{factura.numero} · {factura.periodo} · saldo {formatMoney(factura.saldo)}{factura.vencida ? " · vencida" : ""} · multa em falta {formatMoney(factura.multa_registada_em_falta + factura.multa_prevista)}</p>)}</div>}
                                                <div className="flex flex-wrap gap-2">
                                                    <PrimaryButton type="button" onClick={() => router.visit(item.tarefaCard.cliente.url)} className="min-h-9 px-3 text-xs"><UsersRound className="h-4 w-4" aria-hidden="true" />Abrir cliente</PrimaryButton>
                                                    {item.tarefaCard.cliente.ultima_factura && <SecondaryButton type="button" onClick={() => router.visit(item.tarefaCard.cliente.ultima_factura.url)} className="min-h-9 px-3 text-xs"><FileText className="h-4 w-4" aria-hidden="true" />Abrir factura</SecondaryButton>}
                                                    {item.tarefaCard.cliente.ultima_leitura && <SecondaryButton type="button" onClick={() => router.visit(item.tarefaCard.cliente.ultima_leitura.url)} className="min-h-9 px-3 text-xs"><Droplet className="h-4 w-4" aria-hidden="true" />Abrir leitura</SecondaryButton>}
                                                </div>
                                            </div>
                                        )}
                                        {item.tarefaCard?.tipo === "clientes" && tarefa?.etapa === "escolher_cliente" && (
                                            <div className="mt-3 flex flex-col gap-2">
                                                {item.tarefaCard.clientes.map((cliente) => <SecondaryButton key={cliente.id} type="button" onClick={() => escolherCliente(cliente, item.tarefaCard.periodoActual)} className="min-h-10 justify-start px-3 text-xs"><UsersRound className="h-4 w-4" aria-hidden="true" />{cliente.nome}<span className="ml-1 font-normal text-slate-500">{cliente.numero_cliente}</span></SecondaryButton>)}
                                                <SecondaryButton type="button" onClick={cancelarTarefa} className="min-h-9 self-start px-3 text-xs"><X className="h-4 w-4" aria-hidden="true" />Cancelar</SecondaryButton>
                                            </div>
                                        )}
                                        {item.tarefaCard?.tipo === "periodo" && tarefa?.etapa === "periodo" && (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <PrimaryButton type="button" onClick={() => escolherPeriodo(tarefa.periodoActual)} className="min-h-9 px-3 text-xs"><CalendarDays className="h-4 w-4" aria-hidden="true" />Ciclo actual</PrimaryButton>
                                                <SecondaryButton type="button" onClick={() => { setTarefa({ ...tarefa, etapa: "periodo_manual" }); setMensagens((anteriores) => [...anteriores, { id: `${Date.now()}-assistant`, papel: "assistant", texto: "Indique o mÃªs e o ano no formato MM/AAAA." }]); }} className="min-h-9 px-3 text-xs"><CalendarDays className="h-4 w-4" aria-hidden="true" />Outro mÃªs</SecondaryButton>
                                                <SecondaryButton type="button" onClick={cancelarTarefa} className="min-h-9 px-3 text-xs"><X className="h-4 w-4" aria-hidden="true" />Cancelar</SecondaryButton>
                                            </div>
                                        )}
                                        {item.tarefaCard?.tipo === "tipos_ocorrencia" && tarefa?.etapa === "tipo" && (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {[["sem_agua", "Falta de água"], ["fuga", "Fuga"], ["avaria", "Avaria"], ["contador", "Contador"], ["reclamacao", "Reclamação"], ["outro", "Outro"]].map(([tipo, rotulo]) => <SecondaryButton key={tipo} type="button" onClick={() => escolherTipoOcorrencia(tipo, rotulo)} className="min-h-9 px-3 text-xs"><TriangleAlert className="h-4 w-4" aria-hidden="true" />{rotulo}</SecondaryButton>)}
                                                <SecondaryButton type="button" onClick={cancelarTarefa} className="min-h-9 px-3 text-xs"><X className="h-4 w-4" aria-hidden="true" />Cancelar</SecondaryButton>
                                            </div>
                                        )}
                                        {item.tarefaCard?.tipo === "zonas_producao" && tarefa?.etapa === "zona" && (
                                            <div className="mt-3 flex flex-col gap-2">
                                                <SecondaryButton type="button" onClick={() => escolherZonaProducao(null)} className="min-h-9 justify-start px-3 text-xs"><Factory className="h-4 w-4" aria-hidden="true" />Sistema todo</SecondaryButton>
                                                {item.tarefaCard.zonas.map((zona) => <SecondaryButton key={zona.id} type="button" onClick={() => escolherZonaProducao(zona)} className="min-h-9 justify-start px-3 text-xs"><MapPinned className="h-4 w-4" aria-hidden="true" />{zona.nome}</SecondaryButton>)}
                                                <SecondaryButton type="button" onClick={cancelarTarefa} className="min-h-9 self-start px-3 text-xs"><X className="h-4 w-4" aria-hidden="true" />Cancelar</SecondaryButton>
                                            </div>
                                        )}
                                        {item.tarefaCard?.tipo === "zona_previa" && (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <PrimaryButton type="button" disabled={aEnviar || tarefa?.etapa !== "confirmar"} onClick={confirmarTarefaOperacional} className="min-h-9 px-3 text-xs"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Confirmar criação</PrimaryButton>
                                                <SecondaryButton type="button" disabled={aEnviar} onClick={cancelarTarefa} className="min-h-9 px-3 text-xs"><X className="h-4 w-4" aria-hidden="true" />Cancelar</SecondaryButton>
                                            </div>
                                        )}
                                        {item.tarefaCard?.tipo === "ocorrencia_previa" && (
                                            <div className="mt-3 space-y-2">
                                                <p className="text-xs">Tipo: <strong>{item.tarefaCard.tipoOcorrencia.replaceAll("_", " ")}</strong></p>
                                                <p className="whitespace-pre-wrap text-xs">{item.tarefaCard.descricao}</p>
                                                <div className="flex flex-wrap gap-2"><PrimaryButton type="button" disabled={aEnviar || tarefa?.etapa !== "confirmar"} onClick={confirmarTarefaOperacional} className="min-h-9 px-3 text-xs"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Registar ocorrência</PrimaryButton><SecondaryButton type="button" disabled={aEnviar} onClick={cancelarTarefa} className="min-h-9 px-3 text-xs"><X className="h-4 w-4" aria-hidden="true" />Cancelar</SecondaryButton></div>
                                            </div>
                                        )}
                                        {item.tarefaCard?.tipo === "producao_previa" && (
                                            <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-xs dark:border-slate-700 dark:bg-[#252B36]">
                                                <p>Período: <strong>{item.tarefaCard.previa.periodo}</strong> · zona <strong>{item.tarefaCard.previa.zona}</strong></p>
                                                <p>Volume: <strong>{formatNumero(item.tarefaCard.previa.volume_m3)} m³</strong></p>
                                                {item.tarefaCard.previa.vai_substituir && <p className="rounded bg-amber-50 p-2 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">O valor guardado ({formatNumero(item.tarefaCard.previa.valor_anterior)} m³) será substituído.</p>}
                                                <div className="flex flex-wrap gap-2"><PrimaryButton type="button" disabled={aEnviar || tarefa?.etapa !== "confirmar"} onClick={confirmarTarefaOperacional} className="min-h-9 px-3 text-xs"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Confirmar registo</PrimaryButton><SecondaryButton type="button" disabled={aEnviar} onClick={cancelarTarefa} className="min-h-9 px-3 text-xs"><X className="h-4 w-4" aria-hidden="true" />Cancelar</SecondaryButton></div>
                                            </div>
                                        )}
                                        {item.tarefaCard?.tipo === "facturas_pagamento" && tarefa?.etapa === "factura" && (
                                            <div className="mt-3 flex flex-col gap-2">
                                                {item.tarefaCard.facturas.map((factura) => <SecondaryButton key={factura.id} type="button" onClick={() => escolherFacturaPagamento(factura)} className="min-h-10 justify-start px-3 text-xs"><FileText className="h-4 w-4" aria-hidden="true" />Factura {factura.numero} · {String(factura.mes).padStart(2, "0")}/{factura.ano} · em falta {formatMoney(factura.em_falta + factura.multa_prevista)}</SecondaryButton>)}
                                                <SecondaryButton type="button" onClick={cancelarTarefa} className="min-h-9 self-start px-3 text-xs"><X className="h-4 w-4" aria-hidden="true" />Cancelar</SecondaryButton>
                                            </div>
                                        )}
                                        {item.tarefaCard?.tipo === "registos" && (
                                            <div className="mt-3 flex flex-col gap-2">
                                                {item.tarefaCard.registos.map((registo) => {
                                                    const Icone = iconeDaAccao({ url: registo.url });
                                                    return <SecondaryButton key={`${registo.url}-${registo.titulo}`} type="button" onClick={() => router.visit(registo.url)} className="min-h-10 justify-start px-3 text-left text-xs"><Icone className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="min-w-0"><strong className="block truncate">{registo.titulo}</strong><span className="block truncate font-normal text-slate-500">{registo.detalhe}</span></span><ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0" aria-hidden="true" /></SecondaryButton>;
                                                })}
                                            </div>
                                        )}
                                        {item.tarefaCard?.tipo === "metodos_pagamento" && tarefa?.etapa === "metodo" && (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {[["dinheiro", "Dinheiro"], ["mpesa", "M-Pesa"], ["e-mola", "E-Mola"], ["banco", "Banco"]].map(([metodo, rotulo]) => <SecondaryButton key={metodo} type="button" onClick={() => escolherMetodoPagamento(metodo)} className="min-h-9 px-3 text-xs"><WalletCards className="h-4 w-4" aria-hidden="true" />{rotulo}</SecondaryButton>)}
                                            </div>
                                        )}
                                        {item.tarefaCard?.tipo === "previa_leitura" && (
                                            <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-xs dark:border-slate-700 dark:bg-[#252B36]">
                                                <p>Período: <strong>{item.tarefaCard.previa.plano.periodo}</strong></p>
                                                <p>Contador: {formatNumero(item.tarefaCard.previa.plano.leitura_anterior)} → <strong>{formatNumero(item.tarefaCard.previa.plano.consumo_novo + item.tarefaCard.previa.plano.leitura_anterior)}</strong> · consumo {formatNumero(item.tarefaCard.previa.plano.consumo_novo)} m³</p>
                                                <p>Valor de consumo estimado: <strong>{formatMoney(item.tarefaCard.previa.previsao_factura.valor_consumo)}</strong></p>
                                                <p>Valor próprio estimado da factura: <strong>{formatMoney(item.tarefaCard.previa.previsao_factura.valor_factura_estimado)}</strong></p>
                                                {item.tarefaCard.previa.previsao_factura.divida_anterior > 0 && <p>Dívida anterior do cliente: {formatMoney(item.tarefaCard.previa.previsao_factura.divida_anterior)}</p>}
                                                <p className="text-slate-500">{item.tarefaCard.previa.previsao_factura.nota}</p>
                                                {item.tarefaCard.previa.avisos.map((aviso) => <p key={aviso} className="rounded bg-amber-50 p-2 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">{aviso}</p>)}
                                                {item.tarefaCard.previa.plano.retroactiva && <p className="rounded bg-amber-50 p-2 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">A inserção altera a leitura e pode recalcular a factura do período seguinte.</p>}
                                                {tarefa?.etapa === "confirmar" && (
                                                    <div className="flex flex-wrap gap-2 pt-1">
                                                        <PrimaryButton type="button" disabled={aEnviar} onClick={() => confirmarTarefaLeitura(tarefa.payload)} className="min-h-10 px-3 text-xs"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Registar, confirmar e emitir factura</PrimaryButton>
                                                        <SecondaryButton type="button" disabled={aEnviar} onClick={cancelarTarefa} className="min-h-10 px-3 text-xs"><X className="h-4 w-4" aria-hidden="true" />Cancelar</SecondaryButton>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {item.tarefaCard?.tipo === "factura" && (
                                            <div className="mt-3 space-y-2 rounded-lg border border-emerald-200 bg-white p-3 text-xs dark:border-emerald-900 dark:bg-[#252B36]">
                                                <p>Leitura {item.tarefaCard.leitura.numero}: {String(item.tarefaCard.leitura.mes).padStart(2, "0")}/{item.tarefaCard.leitura.ano}</p>
                                                <p>Consumo registado: <strong>{formatNumero(item.tarefaCard.leitura.consumo_m3)} m³</strong></p>
                                                <p>Factura <strong>{item.tarefaCard.factura.numero}</strong>: <strong>{formatMoney(item.tarefaCard.factura.total_pagar)}</strong> · {item.tarefaCard.factura.estado}</p>
                                                <PrimaryButton type="button" onClick={() => router.visit(item.tarefaCard.factura.url)} className="min-h-9 px-3 text-xs"><FileText className="h-4 w-4" aria-hidden="true" />Abrir factura</PrimaryButton>
                                            </div>
                                        )}
                                        {item.tarefaCard?.tipo === "previa_pagamento" && (
                                            <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-xs dark:border-slate-700 dark:bg-[#252B36]">
                                                <p>Factura <strong>{item.tarefaCard.previa.factura.numero}</strong> · {String(item.tarefaCard.previa.factura.mes).padStart(2, "0")}/{item.tarefaCard.previa.factura.ano}</p>
                                                <p>Valor recebido: <strong>{formatMoney(item.tarefaCard.previa.valor_pago)}</strong> · método {item.tarefaCard.previa.metodo_pagamento}</p>
                                                <p>Saldo previsto após pagamento: <strong>{formatMoney(item.tarefaCard.previa.saldo_depois)}</strong></p>
                                                {tarefa?.etapa === "confirmar" && <div className="flex flex-wrap gap-2 pt-1"><PrimaryButton type="button" disabled={aEnviar} onClick={() => confirmarTarefaPagamento(tarefa.payload)} className="min-h-10 px-3 text-xs"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Confirmar pagamento</PrimaryButton><SecondaryButton type="button" disabled={aEnviar} onClick={cancelarTarefa} className="min-h-10 px-3 text-xs"><X className="h-4 w-4" aria-hidden="true" />Cancelar</SecondaryButton></div>}
                                            </div>
                                        )}
                                        {item.tarefaCard?.tipo === "pagamento" && (
                                            <div className="mt-3 space-y-2 rounded-lg border border-emerald-200 bg-white p-3 text-xs dark:border-emerald-900 dark:bg-[#252B36]">
                                                <p>Recibo <strong>{item.tarefaCard.pagamento.numero_recibo}</strong> · {formatMoney(item.tarefaCard.pagamento.valor_pago)}</p>
                                                <p>Saldo da factura depois do pagamento: {formatMoney(item.tarefaCard.factura.em_falta)}</p>
                                                <PrimaryButton type="button" onClick={() => router.visit(item.tarefaCard.recibo_url)} className="min-h-9 px-3 text-xs"><FileText className="h-4 w-4" aria-hidden="true" />Abrir recibo</PrimaryButton>
                                            </div>
                                        )}
                                        {item.resposta?.passos?.length > 0 && (
                                            <ol className="mt-2.5 list-decimal space-y-1.5 border-t border-slate-200/80 pt-2.5 pl-4 dark:border-slate-700">
                                                {item.resposta.passos.map((passo, indice) => <li key={`${item.id}-passo-${indice}`}>{passo}</li>)}
                                            </ol>
                                        )}
                                        {item.resposta?.evidencias?.length > 0 && (
                                            <details className="mt-2.5 border-t border-slate-200/80 pt-2 dark:border-slate-700">
                                                <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] font-semibold text-brand dark:text-cyan-300">
                                                    Dados usados <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                                                </summary>
                                                <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-slate-600 dark:text-slate-300">
                                                    {item.resposta.evidencias.map((evidencia, indice) => <li key={`${item.id}-evidencia-${indice}`}>{evidencia}</li>)}
                                                </ul>
                                            </details>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {aEnviar && (
                                <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400" role="status">
                                    <MascoteAqua pequeno />
                                    <span className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-[#1E232D]"><LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />Aqua está a analisar o contexto…</span>
                                </div>
                            )}
                        </div>

                        {mensagens.length === 1 && !aEnviar && (
                            <div className="flex flex-wrap gap-2 px-4 pb-3">
                                {SUGESTOES.map((sugestao) => (
                                    <button key={sugestao} type="button" onClick={() => enviar(sugestao)} className="rounded-full border border-[#CBD8F3] bg-white px-3 py-2 text-left text-[11px] font-semibold text-[#173B86] transition-colors hover:bg-[#F0F4FF] dark:border-slate-700 dark:bg-[#1E232D] dark:text-cyan-200 dark:hover:bg-[#262C38]">
                                        {sugestao}
                                    </button>
                                ))}
                            </div>
                        )}

                        {erro && <p role="alert" className="mx-4 mb-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">{erro}</p>}

                        <form onSubmit={(evento) => { evento.preventDefault(); enviar(); }} className="border-t border-slate-100 p-3 dark:border-slate-800">
                            <div className="flex items-end gap-2 rounded-xl border border-slate-300 bg-white p-2 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15 dark:border-slate-700 dark:bg-[#1E232D] dark:focus-within:border-cyan-500">
                                <textarea
                                    ref={campoRef}
                                    value={pergunta}
                                    onChange={(evento) => setPergunta(evento.target.value)}
                                    onKeyDown={(evento) => { if (evento.key === "Enter" && !evento.shiftKey) { evento.preventDefault(); enviar(); } }}
                                    rows={1}
                                    maxLength={1200}
                                    placeholder={placeholder}
                                    aria-label="Pergunta para Aqua sobre qualquer área"
                                    disabled={!entradaDisponivel || aEnviar || aTranscrever || aGravar}
                                    aria-describedby="aqua-guia-composer-hint"
                                    className="max-h-28 min-h-10 flex-1 resize-y border-0 bg-transparent px-1.5 py-2 text-[13px] text-ink outline-none placeholder:text-slate-400 focus:!border-0 focus:!shadow-none focus:ring-0 dark:text-slate-100"
                                />
                                <button type="button" onClick={iniciarOuPararAudio} disabled={!entradaDisponivel || aEnviar || aTranscrever} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-40 ${aGravar ? "bg-rose-600 text-white hover:bg-rose-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-[#303744] dark:text-slate-100 dark:hover:bg-[#3A4352]"}`} aria-label={aGravar ? "Parar gravação de áudio" : "Gravar pergunta por áudio"} title={aGravar ? "Parar gravação" : "Gravar pergunta por áudio"}>
                                    {aGravar ? <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" /> : <Mic className="h-4 w-4" aria-hidden="true" />}
                                </button>
                                <button type="submit" disabled={!pergunta.trim() || aEnviar || aTranscrever || aGravar || !entradaDisponivel} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400" aria-label="Enviar pergunta">
                                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                                </button>
                            </div>
                            <p id="aqua-guia-composer-hint" className="px-1 pt-2 text-[10px] leading-relaxed text-slate-400">{aGravar ? "A gravar… toque em parar quando terminar (máx. 60 segundos)." : aTranscrever ? "A transcrever o áudio…" : "Enter envia · Shift+Enter quebra a linha · O áudio gravado é enviado ao Gemini para transcrição."}</p>
                        </form>
                    </motion.aside>
                )}
            </AnimatePresence>

            {!expandido && <button
                ref={accionadorRef}
                type="button"
                onClick={() => setAberto((valor) => !valor)}
                className="group flex h-14 items-center gap-2.5 rounded-full bg-brand p-1.5 pr-4 text-white shadow-[0_8px_24px_rgba(4,26,83,0.25)] transition hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 dark:bg-[#0059FF] dark:hover:bg-[#0050E6]"
                aria-label={aberto ? "Fechar ajuda da Aqua" : "Abrir ajuda da Aqua"}
                aria-expanded={aberto}
                aria-controls="aqua-guia"
            >
                <MascoteAqua pequeno />
                <span className="text-sm font-bold">Aqua</span>
                <span className="rounded-full bg-white/15 px-2 py-1 text-[10px] font-semibold">Global</span>
            </button>}
        </div>
    );
}
