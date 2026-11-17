import { Head, Link, router, useForm, usePage } from "@inertiajs/react";
import { AlertTriangle, ArrowLeft, Banknote, ChevronDown, ChevronRight, Droplet, FileText, Pause, Pencil, Phone, Play, Plus, Printer, RotateCcw, Trash2, Wallet } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import StatusBadge from "@/Components/StatusBadge";
import AbasEstado from "@/Components/AbasEstado";
import ConfirmDialog from "@/Components/ConfirmDialog";
import ConfirmarComTexto from "@/Components/ConfirmarComTexto";
import EstadoVazio from "@/Components/EstadoVazio";
import { formatDate, formatMoney, formatNumero } from "@/lib/utils";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import Modal from "@/Components/Modal";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import TextInput from "@/Components/TextInput";
import { previewPost } from "@/lib/previewPost";
import { consumoLeitura } from "@/lib/consumoLeitura";
import { cn } from "@/lib/utils";

const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const mesesLongos = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const estadosCliente = { ativo: ["Activo", "emerald"], inativo: ["Inactivo", "slate"], cortado: ["Cortado", "slate"] };
const metodos = { dinheiro: "Dinheiro", mpesa: "M-Pesa", "e-mola": "E-Mola", banco: "Banco" };

// Cor por tipo de acontecimento, como no design: alteração (azul), dinheiro
// (verde), leitura (neutro), cobrança (âmbar).
const TIPOS = {
    alt: "bg-cyan-100 text-brand dark:bg-[rgba(110,162,255,0.16)] dark:text-cyan-300",
    din: "bg-emerald-50 text-emerald-700 dark:bg-[rgba(46,160,99,0.16)] dark:text-emerald-300",
    lei: "bg-[#EEF1F7] text-slate-600 dark:bg-white/[0.06] dark:text-slate-300",
    cob: "bg-amber-50 text-amber-700 dark:bg-[rgba(243,199,122,0.14)] dark:text-amber-300",
};
const ICONES = { editar: Pencil, novo: Plus, factura: FileText, alerta: AlertTriangle, dinheiro: Banknote, gota: Droplet, telefone: Phone };

function quando(dataHora) {
    const d = new Date(String(dataHora).replace(" ", "T"));
    const dia = `${String(d.getDate()).padStart(2, "0")} ${meses[d.getMonth()]} ${d.getFullYear()}`;
    const hora = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    return hora === "00:00" ? dia : `${dia}, ${hora}`;
}

function diasAte(data) {
    const alvo = new Date(String(data).slice(0, 10) + "T00:00:00");
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return Math.round((alvo - hoje) / 86400000);
}

function EstadoFactura({ factura }) {
    if (factura.deleted_at || factura.estado === "anulada") return <StatusBadge tone="slate">Anulada</StatusBadge>;
    if (factura.estado === "paga") return <StatusBadge tone="emerald">Paga</StatusBadge>;
    if (["pendente", "parcial"].includes(factura.estado) && factura.data_vencimento && diasAte(factura.data_vencimento) < 0) {
        const dias = -diasAte(factura.data_vencimento);
        return <StatusBadge tone={dias > 30 ? "rose" : "amber"}>Vencida há {dias} {dias === 1 ? "dia" : "dias"}</StatusBadge>;
    }
    if (factura.estado === "parcial") return <StatusBadge tone="cyan">Parcial</StatusBadge>;
    return <StatusBadge tone="slate">Por pagar</StatusBadge>;
}

/** Linha das listas dos separadores: título, detalhe, valor à direita e etiqueta. */
function LinhaLista({ href, titulo, detalhe, valor, etiqueta, externo }) {
    const corpo = (
        <>
            <span className="flex min-w-0 flex-1 flex-col">
                <strong className="text-[15px] text-ink dark:text-[#F2F5FB]">{titulo}</strong>
                <span className="text-[13px] text-slate-500 dark:text-slate-400">{detalhe}</span>
            </span>
            {valor && <span className="text-[15px] font-bold tabular-nums text-ink dark:text-[#F2F5FB]">{valor}</span>}
            {etiqueta}
            {href && <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />}
        </>
    );
    const classe = "flex min-h-[60px] flex-wrap items-center gap-3 px-6 py-3";
    if (!href) return <li className={classe}>{corpo}</li>;
    return (
        <li>
            {externo ? (
                <a href={href} className={cn(classe, "hover:bg-slate-50 dark:hover:bg-white/[0.03]")}>{corpo}</a>
            ) : (
                <Link href={href} className={cn(classe, "hover:bg-slate-50 dark:hover:bg-white/[0.03]")}>{corpo}</Link>
            )}
        </li>
    );
}

function Cartao({ titulo, children, className = "" }) {
    return (
        <AnimatedPanel className={cn("flex flex-col gap-3.5 p-5", className)}>
            <span className="text-xs font-bold tracking-[0.6px] text-slate-500 dark:text-slate-400">{titulo}</span>
            {children}
        </AnimatedPanel>
    );
}

function Par({ rotulo, children }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[13px] text-slate-500 dark:text-slate-400">{rotulo}</span>
            <strong className="break-words text-[15px] text-ink dark:text-[#F2F5FB]">{children ?? "—"}</strong>
        </div>
    );
}

export default function Show({ cliente, zonas = [], tarifas = [], ajustesLeitura = [], situacao, historico = [] }) {
    const { auth } = usePage().props;
    const ehAdministrador = auth.roles?.includes("administrador");
    const [editar, setEditar] = useState(false);
    const [previewInicial, setPreviewInicial] = useState(null);
    const correcaoInicialForm = useForm({ leitura_inicial: "", confirmar_leitura_inicial: true, motivo_leitura_inicial: "" });
    const [ajusteParaReverter, setAjusteParaReverter] = useState(null);
    const reversaoForm = useForm({ motivo: "" });
    const form = useForm({ nome: "", endereco: "", zona_id: "", telefone: "", email: "", tarifa_id: "", estado: "ativo", leitura_inicial: "" });
    const [separador, setSeparador] = useState("hist");
    const [filtroHist, setFiltroHist] = useState("tudo");
    const [menuAberto, setMenuAberto] = useState(false);
    const [suspenderAberto, setSuspenderAberto] = useState(false);
    const [motivoEstado, setMotivoEstado] = useState("");
    const [removerAccao, setRemoverAccao] = useState(null);
    const [paraReverter, setParaReverter] = useState(null);
    const menuRef = useRef(null);
    const [estadoNome, estadoTom] = estadosCliente[cliente.estado] ?? [cliente.estado, "slate"];
    const pagamentos = cliente.pagamentos ?? [];
    const facturas = cliente.facturas ?? [];
    const leituras = cliente.leituras ?? [];
    const resumo = cliente.resumo_consumo ?? { total: 0, quantidade: 0, primeira: null, evolucao: [] };
    const maxConsumo = Math.max(1, ...(resumo.evolucao ?? []).map((item) => Number(item.consumo)));

    const abrirEdicao = () => {
        form.setData({ nome: cliente.nome ?? "", endereco: cliente.endereco ?? "", zona_id: cliente.zona_id ?? "", telefone: cliente.telefone ?? "", email: cliente.email ?? "", tarifa_id: cliente.tarifa_id ?? "", estado: cliente.estado ?? "ativo", leitura_inicial: cliente.leitura_inicial ?? "" });
        form.clearErrors();
        setEditar(true);
    };
    const guardarEdicao = async (event) => {
        event.preventDefault();
        const leituraInicialAlterada = cliente.leitura_inicial == null
            ? form.data.leitura_inicial !== "" && form.data.leitura_inicial != null
            : form.data.leitura_inicial !== "" && Number(form.data.leitura_inicial) !== Number(cliente.leitura_inicial);
        if (ehAdministrador && leituraInicialAlterada) {
            try {
                const plano = await previewPost(`/clientes/${cliente.numero_cliente}/previsualizar-leitura-inicial`, { leitura_inicial: form.data.leitura_inicial });
                setPreviewInicial(plano);
                correcaoInicialForm.setData({
                    leitura_inicial: form.data.leitura_inicial,
                    confirmar_leitura_inicial: true,
                    motivo_leitura_inicial: "",
                });
                correcaoInicialForm.clearErrors();
            } catch (error) {
                form.setError("leitura_inicial", error.message);
            }
            return;
        }
        form.put(`/clientes/${cliente.numero_cliente}`, { preserveScroll: true, onSuccess: () => setEditar(false) });
    };
    const confirmarLeituraInicial = (event) => {
        event.preventDefault();
        if (!previewInicial?.pode_aplicar) return;
        correcaoInicialForm.put(`/clientes/${cliente.numero_cliente}/leitura-inicial`, {
            preserveScroll: true,
            onSuccess: () => { setPreviewInicial(null); setEditar(false); },
        });
    };
    const abrirReversao = (ajuste) => {
        reversaoForm.reset();
        reversaoForm.clearErrors();
        setAjusteParaReverter(ajuste);
    };
    const confirmarReversao = (event) => {
        event.preventDefault();
        if (!ajusteParaReverter || reversaoForm.data.motivo.trim().length < 5) return;
        reversaoForm.post(`/ajustes-leitura/${ajusteParaReverter.id}/reverter`, {
            preserveScroll: true,
            onSuccess: () => setAjusteParaReverter(null),
        });
    };


    useEffect(() => {
        if (!menuAberto) return undefined;
        const fechar = (e) => {
            if (e.type === "keydown" ? e.key === "Escape" : !menuRef.current?.contains(e.target)) setMenuAberto(false);
        };
        document.addEventListener("mousedown", fechar);
        document.addEventListener("keydown", fechar);
        return () => {
            document.removeEventListener("mousedown", fechar);
            document.removeEventListener("keydown", fechar);
        };
    }, [menuAberto]);

    const deve = Number(cliente.saldo_em_aberto ?? 0);
    const cortado = cliente.estado === "cortado";
    const iniciais = cliente.nome.trim().split(/\s+/).filter(Boolean).map((p, i, arr) => (i === 0 || i === arr.length - 1 ? p[0] : "")).join("").toUpperCase();
    const ultimos = (resumo.evolucao ?? []).slice(-6);
    const maxUlt = Math.max(1, ...ultimos.map((u) => Number(u.consumo)));
    const media = ultimos.length ? Math.round(ultimos.reduce((t, u) => t + Number(u.consumo), 0) / ultimos.length) : 0;
    const eventos = historico.filter((e) => filtroHist === "tudo" || e.tipo === filtroHist);
    const passouLimite = situacao?.limiteCorte && deve >= situacao.limiteCorte;

    const alternarSuspensao = () => {
        router.put(
            `/clientes/${cliente.numero_cliente}`,
            {
                nome: cliente.nome,
                endereco: cliente.endereco ?? "",
                zona_id: cliente.zona_id ?? "",
                telefone: cliente.telefone ?? "",
                email: cliente.email ?? "",
                tarifa_id: cliente.tarifa_id,
                estado: cortado ? "ativo" : "cortado",
                motivo_estado: motivoEstado,
            },
            { preserveScroll: true, onFinish: () => { setSuspenderAberto(false); setMotivoEstado(""); } },
        );
    };

    const linhaMenu = "flex min-h-[44px] w-full items-center gap-3 rounded-[10px] px-3 text-left text-sm font-semibold hover:bg-slate-50 dark:hover:bg-white/[0.06]";

    return (
        <AdminLayout>
            <Head title={`Ficha do cliente · ${cliente.nome}`} />
            <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
                <Link href="/clientes" className="inline-flex items-center gap-2 self-start text-sm font-semibold text-cyan-700 hover:text-cyan-800 dark:text-cyan-400">
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Clientes
                </Link>

                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-lg font-bold text-brand dark:bg-[#262C38] dark:text-[#F2F5FB]">{iniciais}</span>
                        <div className="flex min-w-0 flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-2.5">
                                <h1 className="text-[28px] font-bold leading-tight tracking-[-0.6px] text-ink sm:text-4xl dark:text-[#F2F5FB]">{cliente.nome}</h1>
                                <StatusBadge tone={estadoTom}>{estadoNome}</StatusBadge>
                            </div>
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                                {cliente.numero_cliente} · {cliente.zona?.nome ?? cliente.bairro ?? "sem zona"} · Tarifa {cliente.tarifa?.nome?.toLowerCase() ?? "—"} · cliente desde {formatDate(cliente.data_adesao ?? cliente.created_at)}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {deve > 0 && (
                            <Link
                                href={`/pagamentos?cliente_id=${cliente.id}`}
                                className="inline-flex min-h-[48px] items-center gap-2 rounded-md bg-brand px-5 text-[15px] font-bold text-white hover:bg-brand-hover dark:bg-cyan-500 dark:hover:bg-cyan-600"
                            >
                                <Wallet className="h-[18px] w-[18px]" aria-hidden="true" />
                                Receber pagamento
                            </Link>
                        )}
                        <SecondaryButton type="button" onClick={abrirEdicao} className="min-h-[48px]">
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                            Editar
                        </SecondaryButton>
                        <div ref={menuRef} className="relative">
                            <SecondaryButton type="button" onClick={() => setMenuAberto((v) => !v)} aria-haspopup="menu" aria-expanded={menuAberto} className="min-h-[48px]">
                                Mais
                                <ChevronDown className="h-4 w-4" aria-hidden="true" />
                            </SecondaryButton>
                            {menuAberto && (
                                <div role="menu" className="absolute right-0 top-[56px] z-30 flex w-60 flex-col rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-800 dark:bg-[#262C38]">
                                    <a role="menuitem" href={`/clientes/${cliente.numero_cliente}/imprimir`} className={cn(linhaMenu, "text-ink dark:text-[#F2F5FB]")}>
                                        <Printer className="h-4 w-4 text-slate-500" aria-hidden="true" /> Imprimir ficha
                                    </a>
                                    <button type="button" role="menuitem" onClick={() => { setMenuAberto(false); setSuspenderAberto(true); }} className={cn(linhaMenu, "text-ink dark:text-[#F2F5FB]")}>
                                        {cortado ? <Play className="h-4 w-4 text-slate-500" aria-hidden="true" /> : <Pause className="h-4 w-4 text-slate-500" aria-hidden="true" />}
                                        {cortado ? "Reactivar (abrir a água)" : "Suspender (fechar a água)"}
                                    </button>
                                    <div className="my-1 border-t border-[#E8ECF4] dark:border-slate-700" />
                                    <button
                                        type="button"
                                        role="menuitem"
                                        onClick={() => {
                                            setMenuAberto(false);
                                            setRemoverAccao({ metodo: "delete", url: `/clientes/${cliente.numero_cliente}` });
                                        }}
                                        className={cn(linhaMenu, "text-rose-700 dark:text-rose-300")}
                                    >
                                        <Trash2 className="h-4 w-4" aria-hidden="true" /> Remover cliente
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
                    <div className="flex flex-col gap-4">
                        <Cartao titulo="SITUAÇÃO">
                            <div className="flex flex-col gap-1">
                                <span className="text-[13px] text-slate-500 dark:text-slate-400">Deve</span>
                                <span className={cn("text-[30px] font-bold tabular-nums", deve > 0 ? "text-ink dark:text-[#F2F5FB]" : "text-slate-500")}>{deve > 0 ? formatMoney(deve) : "Em dia"}</span>
                                {situacao?.vencidas > 0 && (
                                    <StatusBadge tone={situacao.diasAtraso > 30 ? "rose" : "amber"} className="self-start">
                                        {situacao.vencidas} {situacao.vencidas === 1 ? "factura vencida" : "facturas vencidas"} há {situacao.diasAtraso} dias
                                    </StatusBadge>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-3 border-t border-[#E8ECF4] pt-3.5 dark:border-slate-800">
                                <Par rotulo="Crédito disponível">{formatMoney(situacao?.credito ?? 0)}</Par>
                                <Par rotulo="Promessa">{situacao?.promessa ? `${formatMoney(situacao.promessa.valor)} até ${formatDate(situacao.promessa.data)}` : "—"}</Par>
                                <Par rotulo="Limite de corte">{situacao?.limiteCorte ? formatMoney(situacao.limiteCorte) : "—"}</Par>
                            </div>
                            {passouLimite && (
                                <p className="rounded-md bg-rose-100 px-3 py-2.5 text-[13px] leading-relaxed text-rose-700 dark:bg-[rgba(244,163,154,0.14)] dark:text-rose-300">
                                    Já passou o limite de corte.{situacao.promessa ? ` Se não pagar até ${formatDate(situacao.promessa.data)}, entra em risco de corte.` : " Está em risco de corte."}
                                </p>
                            )}
                        </Cartao>

                        <Cartao titulo="CONSUMO · ÚLTIMOS 6 MESES">
                            {ultimos.length ? (
                                <>
                                    <div className="flex h-24 items-end gap-2" role="img" aria-label={`Consumo dos últimos meses, média de ${media} m³`}>
                                        {ultimos.map((u, i) => {
                                            const v = Number(u.consumo);
                                            return (
                                                <div key={`${u.ano}-${u.mes}`} className="flex flex-1 flex-col items-center gap-1">
                                                    <span className="text-[11px] font-semibold tabular-nums text-slate-600 dark:text-slate-300">{formatNumero(v)}</span>
                                                    <div className={cn("w-full max-w-[28px] rounded-t-md", i === ultimos.length - 1 ? "bg-cyan-500" : "bg-[#B9CCFF] dark:bg-cyan-900")} style={{ height: `${Math.max(4, (v / maxUlt) * 70)}px` }} />
                                                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{meses[u.mes - 1]}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <span className="text-[13px] text-slate-500 dark:text-slate-400">Média: {media} m³ por mês · em m³</span>
                                </>
                            ) : (
                                <span className="text-sm text-slate-500 dark:text-slate-400">Ainda sem leituras para mostrar.</span>
                            )}
                        </Cartao>

                        <Cartao titulo="CONTACTO E LIGAÇÃO">
                            <div className="grid grid-cols-2 gap-3">
                                <Par rotulo="Telefone">{cliente.telefone}</Par>
                                <Par rotulo="Email">{cliente.email}</Par>
                                <Par rotulo="Morada">{cliente.endereco}</Par>
                                <Par rotulo="Leitura inicial">{cliente.leitura_inicial != null ? `${formatNumero(cliente.leitura_inicial)} m³` : null}</Par>
                            </div>
                        </Cartao>
                    </div>

                    <AnimatedPanel className="min-w-0 overflow-hidden">
                        <AbasEstado
                            rotulo="Informação do cliente"
                            activa={separador}
                            onEscolher={(aba) => setSeparador(aba.chave)}
                            abas={[
                                { chave: "hist", rotulo: "Histórico" },
                                { chave: "fac", rotulo: "Facturas", contagem: facturas.length },
                                { chave: "pag", rotulo: "Pagamentos", contagem: pagamentos.filter((p) => !p.deleted_at).length },
                                { chave: "lei", rotulo: "Leituras", contagem: leituras.filter((l) => !l.deleted_at).length },
                            ]}
                        />

                        {separador === "hist" && (
                            <div className="flex flex-col gap-4 p-6">
                                <div role="group" aria-label="Filtrar histórico" className="flex flex-wrap gap-2">
                                    {[["tudo", "Tudo"], ["alt", "Alterações"], ["din", "Dinheiro"], ["lei", "Leituras"], ["cob", "Cobrança"]].map(([chave, rotulo]) => (
                                        <button
                                            key={chave}
                                            type="button"
                                            aria-pressed={filtroHist === chave}
                                            onClick={() => setFiltroHist(chave)}
                                            className={cn(
                                                "min-h-[36px] rounded-full border px-3.5 text-sm font-semibold",
                                                filtroHist === chave
                                                    ? "border-[#B9CCFF] bg-cyan-100 text-brand dark:border-[rgba(110,162,255,0.32)] dark:bg-[rgba(110,162,255,0.16)] dark:text-cyan-300"
                                                    : "border-[#DDE2EE] text-ink hover:bg-slate-50 dark:border-slate-800 dark:text-[#F2F5FB]",
                                            )}
                                        >
                                            {rotulo}
                                        </button>
                                    ))}
                                </div>
                                {eventos.length === 0 ? (
                                    <EstadoVazio ilustracao="pesquisa" titulo="Nada neste filtro">Ainda não há registos deste tipo para o cliente.</EstadoVazio>
                                ) : (
                                    <ol className="flex flex-col">
                                        {eventos.map((e, i) => {
                                            const Icone = ICONES[e.icone] ?? FileText;
                                            return (
                                                <li key={e.chave} className="relative flex gap-3.5 pb-5">
                                                    {i < eventos.length - 1 && <span className="absolute left-[17px] top-10 h-[calc(100%-2.5rem)] w-px bg-[#E8ECF4] dark:bg-slate-800" aria-hidden="true" />}
                                                    <span className={cn("z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full", TIPOS[e.tipo])}>
                                                        <Icone className="h-4 w-4" aria-hidden="true" />
                                                    </span>
                                                    <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-1">
                                                        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                                                            <strong className="text-[15px] text-ink dark:text-[#F2F5FB]">{e.titulo}</strong>
                                                            <span className="text-[13px] text-slate-500 dark:text-slate-400">{quando(e.quando)}</span>
                                                        </div>
                                                        <span className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{e.texto}</span>
                                                        {e.quem && <span className="text-[13px] text-slate-500 dark:text-slate-400">{e.quem.startsWith("registada") ? e.quem : `por ${e.quem}`}</span>}
                                                        {e.reverter && ehAdministrador && (
                                                            <button type="button" onClick={() => setParaReverter(e)} className="mt-1 inline-flex items-center gap-1.5 self-start text-[13px] font-semibold text-cyan-700 hover:text-cyan-800 dark:text-cyan-400">
                                                                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Reverter alteração
                                                            </button>
                                                        )}
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ol>
                                )}
                            </div>
                        )}

                        {separador === "fac" &&
                            (facturas.length === 0 ? (
                                <EstadoVazio ilustracao="factura" titulo="Ainda sem facturas">A primeira factura sai depois da primeira leitura confirmada.</EstadoVazio>
                            ) : (
                                <ul className="divide-y divide-[#EEF1F7] dark:divide-slate-800">
                                    {facturas.map((f) => (
                                        <LinhaLista
                                            key={f.id}
                                            href={`/facturas/${f.numero_factura}`}
                                            titulo={`${f.numero_factura} · ${mesesLongos[f.mes - 1]}`}
                                            detalhe={f.data_vencimento ? `vence a ${formatDate(f.data_vencimento)}` : formatDate(f.created_at)}
                                            valor={formatMoney(f.total_pagar)}
                                            etiqueta={<EstadoFactura factura={f} />}
                                        />
                                    ))}
                                </ul>
                            ))}

                        {separador === "pag" &&
                            (pagamentos.length === 0 ? (
                                <EstadoVazio ilustracao="recibo" titulo="Ainda sem pagamentos">Os recibos deste cliente aparecem aqui.</EstadoVazio>
                            ) : (
                                <ul className="divide-y divide-[#EEF1F7] dark:divide-slate-800">
                                    {pagamentos.map((p) => (
                                        <LinhaLista
                                            key={p.id}
                                            href={`/pagamentos/${p.numero_recibo}/imprimir`}
                                            titulo={p.numero_recibo}
                                            detalhe={`${formatDate(p.pago_em ?? p.created_at)} · ${metodos[p.metodo_pagamento] ?? p.metodo_pagamento}${p.referencia_pagamento ? ` · ref. ${p.referencia_pagamento}` : ""}`}
                                            valor={formatMoney(p.valor_pago)}
                                            etiqueta={p.deleted_at ? <StatusBadge tone="slate">Estornado</StatusBadge> : p.factura ? <StatusBadge tone="slate">{mesesLongos[p.factura.mes - 1]}</StatusBadge> : null}
                                        />
                                    ))}
                                </ul>
                            ))}

                        {separador === "lei" && (
                            <>
                                {leituras.length === 0 && cliente.leitura_inicial == null ? (
                                    <EstadoVazio ilustracao="contador" titulo="Ainda sem leituras">As leituras mensais deste cliente aparecem aqui.</EstadoVazio>
                                ) : (
                                    <ul className="divide-y divide-[#EEF1F7] dark:divide-slate-800">
                                        {leituras.map((l) => (
                                            <LinhaLista
                                                key={l.id}
                                                href={l.deleted_at ? null : `/leituras/${l.id}`}
                                                titulo={`${mesesLongos[l.mes - 1]} ${l.ano}`}
                                                detalhe={`${formatNumero(l.leitura_actual)} m³ · ${formatDate(l.created_at)}`}
                                                valor={`${formatNumero(consumoLeitura(l))} m³`}
                                                etiqueta={l.deleted_at ? <StatusBadge tone="slate">Anulada</StatusBadge> : l.confirmado ? <StatusBadge tone="emerald">Confirmada</StatusBadge> : <StatusBadge tone="amber">Por confirmar</StatusBadge>}
                                            />
                                        ))}
                                        {cliente.leitura_inicial != null && (
                                            <LinhaLista titulo="Abertura do contador" detalhe="Valor inicial, não gera factura" valor={`${formatNumero(cliente.leitura_inicial)} m³`} etiqueta={<StatusBadge tone="slate">Não facturável</StatusBadge>} />
                                        )}
                                    </ul>
                                )}
                                {ajustesLeitura.length > 0 && (
                                    <div className="flex flex-col gap-3 border-t border-[#E8ECF4] p-6 dark:border-slate-800">
                                        <span className="text-xs font-bold tracking-[0.6px] text-slate-500 dark:text-slate-400">AJUSTES DE LEITURA</span>
                                        {ajustesLeitura.map((ajuste) => {
                                            const tipo = ajuste.tipo === "insercao_retroactiva" ? "Inserção retroactiva" : ajuste.tipo === "leitura_inicial" ? "Alteração da leitura inicial" : "Reversão de ajuste";
                                            const podeReverter = ehAdministrador && ["insercao_retroactiva", "leitura_inicial"].includes(ajuste.tipo) && !ajuste.reversao;
                                            return (
                                                <div key={ajuste.id} className="rounded-[14px] border border-[#E3E8F2] p-4 dark:border-slate-800">
                                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                                        <div>
                                                            <p className="font-bold text-ink dark:text-[#F2F5FB]">{tipo}</p>
                                                            <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">{formatDate(ajuste.criado_em)} · {ajuste.utilizador ?? "Utilizador removido"}</p>
                                                            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">Motivo: {ajuste.motivo}</p>
                                                        </div>
                                                        {podeReverter && (
                                                            <SecondaryButton type="button" onClick={() => abrirReversao(ajuste)} className="min-h-[40px]">
                                                                <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reverter
                                                            </SecondaryButton>
                                                        )}
                                                    </div>
                                                    {ajuste.reversao && (
                                                        <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-600 dark:bg-[#1E232D] dark:text-slate-300">
                                                            Revertido em {formatDate(ajuste.reversao.criado_em)} por {ajuste.reversao.utilizador ?? "Utilizador removido"} — {ajuste.reversao.motivo}
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        )}
                    </AnimatedPanel>
                </div>
            </div>

            <ConfirmDialog
                show={suspenderAberto}
                onClose={() => setSuspenderAberto(false)}
                onConfirm={alternarSuspensao}
                title={cortado ? "Voltar a abrir a água?" : `Fechar a água de ${cliente.nome}?`}
                description={cortado ? "O cliente volta a ficar activo. Fica registado no histórico." : "Fica marcado como cortado até reactivar. A dívida mantém-se e fica registado no histórico."}
                confirmLabel={cortado ? "Reactivar" : "Suspender"}
                tone={cortado ? "primary" : "danger"}
                ilustracao={cortado ? "confirmar" : "torneira"}
                campo={{
                    rotulo: "Motivo",
                    valor: motivoEstado,
                    onChange: setMotivoEstado,
                    placeholder: cortado ? "Ex.: pagou a dívida toda" : "Ex.: dívida acima do limite",
                    obrigatorio: true,
                }}
            />
            <ConfirmarComTexto
                accao={removerAccao}
                palavra="REMOVER"
                titulo={`Remover ${cliente.nome}?`}
                descricao="O cliente vai para a lixeira com as suas facturas, leituras e pagamentos. As facturas em aberto são anuladas. Pode ser recuperado durante 30 dias. Escreva REMOVER para confirmar."
                rotulo="Remover cliente"
                onClose={() => setRemoverAccao(null)}
            />
            <ConfirmDialog
                show={Boolean(paraReverter)}
                onClose={() => setParaReverter(null)}
                onConfirm={() => router.post(`/clientes/historico/${paraReverter.reverter}/reverter`, {}, { preserveScroll: true, onFinish: () => setParaReverter(null) })}
                title="Reverter esta alteração?"
                description={paraReverter ? `${paraReverter.titulo}: ${paraReverter.texto} Os valores anteriores voltam a ficar activos.` : ""}
                confirmLabel="Reverter"
            />
            <Modal show={editar} onClose={() => setEditar(false)} title="Editar cliente" description={`${cliente.numero_cliente} · ${cliente.nome}`} variante="painel">
                <form onSubmit={guardarEdicao} className="space-y-4">
                    <div><InputLabel htmlFor="cliente-nome" value="Nome" /><TextInput id="cliente-nome" required value={form.data.nome} onChange={(e) => form.setData("nome", e.target.value)} className="mt-1 block w-full" /><InputError message={form.errors.nome} className="mt-1" /></div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div><InputLabel htmlFor="cliente-zona" value="Zona / bairro" /><select id="cliente-zona" value={form.data.zona_id} onChange={(e) => form.setData("zona_id", e.target.value)} className="mt-1 block w-full rounded-md border-slate-300 bg-white text-base text-ink shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"><option value="">Sem zona</option>{zonas.map((zona) => <option key={zona.id} value={zona.id}>{zona.nome}</option>)}</select><InputError message={form.errors.zona_id} className="mt-1" /></div>
                        <div><InputLabel htmlFor="cliente-telefone" value="Telefone" /><TextInput id="cliente-telefone" value={form.data.telefone} onChange={(e) => form.setData("telefone", e.target.value)} className="mt-1 block w-full" /><InputError message={form.errors.telefone} className="mt-1" /></div>
                    </div>
                    <div><InputLabel htmlFor="cliente-email" value="Email" /><TextInput id="cliente-email" type="email" value={form.data.email} onChange={(e) => form.setData("email", e.target.value)} className="mt-1 block w-full" /><InputError message={form.errors.email} className="mt-1" /></div>
                    <div><InputLabel htmlFor="cliente-endereco" value="Endereço" /><TextInput id="cliente-endereco" value={form.data.endereco} onChange={(e) => form.setData("endereco", e.target.value)} className="mt-1 block w-full" /><InputError message={form.errors.endereco} className="mt-1" /></div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div><InputLabel htmlFor="cliente-tarifa" value="Tarifa" /><select id="cliente-tarifa" required value={form.data.tarifa_id} onChange={(e) => form.setData("tarifa_id", e.target.value)} className="mt-1 block w-full rounded-md border-slate-300 bg-white text-base text-ink shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"><option value="">Seleccione</option>{tarifas.map((tarifa) => <option key={tarifa.id} value={tarifa.id}>{tarifa.nome}</option>)}</select><InputError message={form.errors.tarifa_id} className="mt-1" /></div>
                        <div><InputLabel htmlFor="cliente-estado" value="Estado" /><select id="cliente-estado" value={form.data.estado} onChange={(e) => form.setData("estado", e.target.value)} className="mt-1 block w-full rounded-md border-slate-300 bg-white text-base text-ink shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"><option value="ativo">Activo</option><option value="inativo">Inactivo</option><option value="cortado">Cortado</option></select><InputError message={form.errors.estado} className="mt-1" /></div>
                    </div>
                    {ehAdministrador && <div><InputLabel htmlFor="cliente-leitura-inicial" value="Leitura inicial do contador" /><TextInput id="cliente-leitura-inicial" type="number" min="0" step="0.01" value={form.data.leitura_inicial} onChange={(e) => form.setData("leitura_inicial", e.target.value)} className="mt-1 block w-full" /><InputError message={form.errors.leitura_inicial} className="mt-1" /><p className="mt-1 text-xs text-muted-foreground">É o valor de abertura, não é consumo mensal e não gera factura. Uma alteração mostra primeiro o efeito no primeiro mês.</p></div>}
                    <div className="flex justify-end gap-2 border-t border-border pt-4"><SecondaryButton type="button" onClick={() => setEditar(false)}>Cancelar</SecondaryButton><PrimaryButton type="submit" disabled={form.processing}>{form.processing ? "A guardar…" : "Guardar alterações"}</PrimaryButton></div>
                </form>
            </Modal>
            <Modal show={Boolean(previewInicial)} onClose={() => setPreviewInicial(null)} title="Pré-visualizar leitura inicial" maxWidth="md">
                {previewInicial && <form onSubmit={confirmarLeituraInicial} className="space-y-4">
                    <p className="text-sm text-muted-foreground">Leitura inicial: <strong>{formatNumero(previewInicial.leitura_inicial_antes)} → {formatNumero(previewInicial.leitura_inicial_depois)} m³</strong>.</p>
                    {previewInicial.primeira ? <div className="rounded-lg border border-border p-4 text-sm"><p>Primeira leitura mensal: <strong>{previewInicial.primeira.periodo}</strong> · contador {formatNumero(previewInicial.primeira.contador)} m³</p><p className="mt-1">Consumo: {formatNumero(previewInicial.primeira.consumo_antes)} → <strong>{formatNumero(previewInicial.primeira.consumo_depois)} m³</strong></p>{previewInicial.factura?.factura && <p className="mt-1">Factura {previewInicial.factura.factura.numero_factura}: {formatMoney(previewInicial.factura.total_antes)} → <strong>{previewInicial.factura.total_depois == null ? "—" : formatMoney(previewInicial.factura.total_depois)}</strong></p>}</div> : <p className="text-sm">Ainda não há leituras mensais; apenas o valor de abertura será actualizado.</p>}
                    <InputError message={correcaoInicialForm.errors.leitura_inicial} />
                    {!previewInicial.pode_aplicar && <p className="rounded-md bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">A factura afectada tem pagamentos ou não está pendente. Regularize-a antes de alterar a leitura inicial.</p>}
                    <div><InputLabel htmlFor="motivo-inicial-ficha" value="Motivo da alteração" /><textarea id="motivo-inicial-ficha" rows={3} required minLength={5} maxLength={1000} value={correcaoInicialForm.data.motivo_leitura_inicial} onChange={(e) => correcaoInicialForm.setData("motivo_leitura_inicial", e.target.value)} className="mt-1 block w-full rounded-md border-slate-300 bg-white text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900" /><InputError message={correcaoInicialForm.errors.motivo_leitura_inicial} className="mt-1" /></div>
                    <div className="flex justify-end gap-2"><SecondaryButton type="button" onClick={() => setPreviewInicial(null)}>Cancelar</SecondaryButton><PrimaryButton type="submit" disabled={!previewInicial.pode_aplicar || correcaoInicialForm.processing}>{correcaoInicialForm.processing ? "A guardar…" : "Confirmar correcção"}</PrimaryButton></div>
                </form>}
            </Modal>
            <Modal show={Boolean(ajusteParaReverter)} onClose={() => setAjusteParaReverter(null)} title="Reverter ajuste de leitura" maxWidth="md">
                {ajusteParaReverter && <form onSubmit={confirmarReversao} className="space-y-4">
                    <p className="text-sm text-muted-foreground">A reversão restaura os valores anteriores ao ajuste #{ajusteParaReverter.id}. A acção será auditada e será recusada se leituras, facturas ou pagamentos tiverem mudado desde então.</p>
                    <div><InputLabel htmlFor="motivo-reversao-ajuste" value="Motivo da reversão" /><textarea id="motivo-reversao-ajuste" rows={3} required minLength={5} maxLength={1000} value={reversaoForm.data.motivo} onChange={(event) => reversaoForm.setData("motivo", event.target.value)} className="mt-1 block w-full rounded-md border-slate-300 bg-white text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900" /><InputError message={reversaoForm.errors.motivo || reversaoForm.errors.ajuste} className="mt-1" /></div>
                    <div className="flex justify-end gap-2 border-t border-border pt-4"><SecondaryButton type="button" onClick={() => setAjusteParaReverter(null)}>Cancelar</SecondaryButton><PrimaryButton type="submit" disabled={reversaoForm.processing || reversaoForm.data.motivo.trim().length < 5}>{reversaoForm.processing ? "A reverter…" : "Confirmar reversão"}</PrimaryButton></div>
                </form>}
            </Modal>
        </AdminLayout>
    );
}
