import { Head, router, useForm } from "@inertiajs/react";
import { Droplets, Gauge, Layers, MapPin, Save, Search, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import CabecalhoLista from "@/Components/CabecalhoLista";
import ConfirmDialog from "@/Components/ConfirmDialog";
import Ilustracao from "@/Components/Ilustracao";
import InputError from "@/Components/InputError";
import PrimaryButton from "@/Components/PrimaryButton";
import SeletorMes from "@/Components/SeletorMes";
import StatusBadge from "@/Components/StatusBadge";
import GraficoSerie, { formatarCompacto } from "@/Components/charts/GraficoSerie";
import { cn, formatVolume } from "@/lib/utils";
import useAbrirNovo from "@/hooks/useAbrirNovo";

const pct = (v) => (v === null || v === undefined ? "—" : `${Number(v).toLocaleString("pt-PT", { maximumFractionDigits: 1 })}%`);
const LIMITE = 30;

/**
 * Produção de água: a conta à vista (Produzida − Facturada = Perdas, com o
 * limite de 30% marcado) e o registo de todas as zonas numa tabela, com um
 * campo em cada linha, em vez de um formulário de cada vez.
 */
export default function Index({ mesReferencia, registos, perdas, zonas, historico, filtros, facturadoPorZona = {} }) {
    const [ano, mes] = mesReferencia.valor.split("-").map(Number);
    const registoDe = useMemo(() => Object.fromEntries(registos.map((r) => [r.zona_id ?? "sistema", r])), [registos]);
    const [modo, setModo] = useState(registoDe.sistema ? "sistema" : "zona");
    const [valores, setValores] = useState({});
    const [texto, setTexto] = useState("");
    const [estado, setEstado] = useState("todas");
    const [soComClientes, setSoComClientes] = useState(true);
    const [paraApagar, setParaApagar] = useState(null);
    const sistema = useForm({ mes, ano, zona_id: "", volume_m3: "" });
    const [aGuardar, setAGuardar] = useState(false);
    const [erros, setErros] = useState({});
    const registoRef = useRef(null);
    useAbrirNovo(() => registoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));

    const termo = texto.trim().toLowerCase();
    const linhas = zonas
        .filter((z) => !soComClientes || z.clientes_activos > 0)
        .filter((z) => !termo || z.nome.toLowerCase().includes(termo))
        .filter((z) => estado === "todas" || (estado === "por" ? !registoDe[z.id] : Boolean(registoDe[z.id])));
    const prontas = Object.entries(valores).filter(([, v]) => v !== "" && v !== null && Number(v) >= 0);

    const guardarZonas = () => {
        if (prontas.length === 0) return;
        router.post(
            "/producao",
            { mes, ano, registos: prontas.map(([zona_id, volume_m3]) => ({ zona_id: Number(zona_id), volume_m3 })) },
            {
                preserveScroll: true,
                onStart: () => setAGuardar(true),
                onFinish: () => setAGuardar(false),
                onSuccess: () => setValores({}),
                onError: (e) => setErros(e),
            },
        );
    };

    const guardarSistema = (evento) => {
        evento.preventDefault();
        sistema.transform((d) => ({ ...d, mes, ano, zona_id: "" })).post("/producao", { preserveScroll: true, onSuccess: () => sistema.setData("volume_m3", "") });
    };

    const perdasAcima = perdas.perdasPct !== null && perdas.perdasPct >= LIMITE;
    const caixa = "flex min-w-[150px] flex-1 flex-col gap-1 rounded-[14px] border border-[#E3E8F2] p-4 dark:border-slate-800";

    return (
        <AdminLayout>
            <Head title="Produção de água" />
            <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
                <CabecalhoLista contexto="Terreno · uma vez por mês" titulo="Produção de água" resumo="Quanta água sai do furo e quanta chega às facturas.">
                    <SeletorMes rota="/producao" mesReferencia={mesReferencia} extra={filtros} />
                </CabecalhoLista>

                <AnimatedPanel className="flex flex-col gap-4 p-6">
                    <div className="flex flex-wrap items-stretch gap-3">
                        <div className={caixa}>
                            <span className="text-sm text-slate-500 dark:text-slate-400">Produzida</span>
                            <strong className="text-2xl tabular-nums text-ink dark:text-[#F2F5FB]">{perdas.temDados ? formatVolume(perdas.produzidoM3) : "Por registar"}</strong>
                        </div>
                        <span className="self-center text-2xl text-slate-400" aria-hidden="true">−</span>
                        <div className={caixa}>
                            <span className="text-sm text-slate-500 dark:text-slate-400">Facturada</span>
                            <strong className="text-2xl tabular-nums text-ink dark:text-[#F2F5FB]">{formatVolume(perdas.facturadoM3)}</strong>
                        </div>
                        <span className="self-center text-2xl text-slate-400" aria-hidden="true">=</span>
                        <div className={cn(caixa, "flex-row items-center gap-3", perdasAcima ? "border-[#F3C6C1] bg-rose-50 dark:border-[rgba(244,163,154,0.3)] dark:bg-[rgba(244,163,154,0.08)]" : "border-[#B9CCFF] bg-[#F7F9FF] dark:border-[rgba(110,162,255,0.32)] dark:bg-[rgba(0,89,255,0.10)]")}>
                            <Ilustracao nome="grafico" largura={80} className="hidden sm:block" />
                            <span className="flex flex-col gap-1">
                                <span className="text-sm text-slate-500 dark:text-slate-400">Perdas</span>
                                <strong className={cn("text-2xl tabular-nums", perdasAcima ? "text-rose-700 dark:text-rose-300" : "text-brand dark:text-cyan-300")}>
                                    {perdas.perdasPct === null ? "Depois do registo" : `${pct(perdas.perdasPct)} · ${formatVolume(perdas.perdasM3)}`}
                                </strong>
                            </span>
                        </div>
                    </div>
                    {perdas.perdasPct !== null && (
                        <div className="relative h-2.5 rounded-full bg-[#E8ECF4] dark:bg-slate-800" role="img" aria-label={`Perdas ${pct(perdas.perdasPct)}; limite ${LIMITE}%`}>
                            <span className={cn("block h-full rounded-full", perdasAcima ? "bg-rose-600" : "bg-cyan-500")} style={{ width: `${Math.min(100, Math.max(0, perdas.perdasPct))}%` }} />
                            <span className="absolute -top-1 h-[18px] w-0.5 bg-ink dark:bg-[#F2F5FB]" style={{ left: `${LIMITE}%` }} aria-hidden="true" />
                        </div>
                    )}
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                        Limite: abaixo de {LIMITE}% de perdas. Mais do que isso costuma ser fuga, ligação ilegal ou contador avariado.
                    </span>
                </AnimatedPanel>

                <AnimatedPanel ref={registoRef} id="formulario-producao" className="overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8ECF4] px-6 py-5 dark:border-slate-800">
                        <h2 className="text-lg font-bold text-ink dark:text-[#F2F5FB]">Registar a água captada</h2>
                        <div role="radiogroup" aria-label="Registar por" className="inline-flex gap-1.5 rounded-[14px] border border-slate-200 p-1.5 dark:border-slate-800">
                            {[
                                ["zona", "Por zona", Layers],
                                ["sistema", "Sistema todo", Gauge],
                            ].map(([chave, rotulo, Icone]) => (
                                <button
                                    key={chave}
                                    type="button"
                                    role="radio"
                                    aria-checked={modo === chave}
                                    onClick={() => setModo(chave)}
                                    className={cn("inline-flex min-h-[40px] items-center gap-2 rounded-[10px] px-3.5 text-sm font-bold", modo === chave ? "bg-brand text-white dark:bg-cyan-500" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/[0.04]")}
                                >
                                    <Icone className="h-4 w-4" aria-hidden="true" />
                                    {rotulo}
                                </button>
                            ))}
                        </div>
                    </div>

                    {modo === "zona" ? (
                        <>
                            <div className="flex flex-wrap items-center gap-2.5 border-b border-[#E8ECF4] px-[18px] py-3.5 dark:border-slate-800">
                                <label className="flex min-h-[44px] flex-[1_1_220px] items-center gap-2.5 rounded-[10px] border border-[#DDE2EE] px-3 focus-within:border-cyan-500 dark:border-slate-800 dark:bg-[#1E232D]">
                                    <Search className="h-[18px] w-[18px] text-slate-500" aria-hidden="true" />
                                    <input type="search" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Procurar zona" aria-label="Procurar zona" className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] focus:!border-0 focus:!shadow-none focus:ring-0 dark:text-[#F2F5FB]" />
                                </label>
                                <select value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Estado" className="min-h-[44px] rounded-[10px] border-[#DDE2EE] text-sm dark:border-slate-800 dark:bg-[#1E232D] dark:text-[#F2F5FB]">
                                    <option value="todas">Todas as zonas</option>
                                    <option value="por">Por registar</option>
                                    <option value="reg">Registadas</option>
                                </select>
                                <label className="inline-flex min-h-[44px] items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                    <input type="checkbox" checked={soComClientes} onChange={(e) => setSoComClientes(e.target.checked)} className="h-[18px] w-[18px] rounded" />
                                    Só zonas com clientes
                                </label>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[720px] text-left text-sm">
                                    <thead className="border-b border-[#E8ECF4] bg-[#F7F9FD] text-xs font-bold tracking-[0.6px] text-slate-500 dark:border-slate-800 dark:bg-white/[0.02] dark:text-slate-400">
                                        <tr>
                                            <th className="px-6 py-3">ZONA</th>
                                            <th className="px-3 py-3 text-right">CLIENTES</th>
                                            <th className="px-3 py-3">ÁGUA CAPTADA</th>
                                            <th className="px-3 py-3 text-right">FACTURADA</th>
                                            <th className="px-6 py-3">ESTADO</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#EEF1F7] dark:divide-slate-800">
                                        {linhas.map((z) => {
                                            const registo = registoDe[z.id];
                                            const valor = valores[z.id] ?? "";
                                            const pronto = valor !== "";
                                            return (
                                                <tr key={z.id}>
                                                    <td className="px-6 py-3">
                                                        <strong className="text-[15px] text-ink dark:text-[#F2F5FB]">{z.nome}</strong>
                                                    </td>
                                                    <td className="px-3 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">{z.clientes_activos}</td>
                                                    <td className="px-3 py-3">
                                                        <label className="inline-flex items-center gap-2">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                value={valor}
                                                                placeholder={registo ? String(Number(registo.volume_m3)) : "0"}
                                                                onChange={(e) => setValores((v) => ({ ...v, [z.id]: e.target.value }))}
                                                                aria-label={`Água captada em ${z.nome}`}
                                                                className={cn("min-h-[44px] w-36 rounded-[10px] border-[#DDE2EE] text-right tabular-nums dark:border-slate-800 dark:bg-[#1E232D] dark:text-[#F2F5FB]", pronto && "!border-[#9DB8FF] !bg-[#F7F9FF] dark:!bg-[rgba(0,89,255,0.08)]")}
                                                            />
                                                            <span className="text-slate-500">m³</span>
                                                        </label>
                                                    </td>
                                                    <td className="px-3 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">{formatVolume(facturadoPorZona[z.id] ?? 0)}</td>
                                                    <td className="px-6 py-3">
                                                        {pronto ? (
                                                            <StatusBadge tone="cyan">Pronta a guardar</StatusBadge>
                                                        ) : registo ? (
                                                            <span className="inline-flex items-center gap-2">
                                                                <StatusBadge tone="emerald">{formatVolume(registo.volume_m3)}</StatusBadge>
                                                                <button type="button" onClick={() => setParaApagar(registo)} aria-label={`Apagar registo de ${z.nome}`} className="inline-flex h-9 w-9 items-center justify-center rounded-[9px] text-slate-400 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-white/[0.06]">
                                                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                                                </button>
                                                            </span>
                                                        ) : (
                                                            <StatusBadge tone="amber">Por registar</StatusBadge>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {linhas.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                                                    <MapPin className="mx-auto mb-2 h-5 w-5" aria-hidden="true" />
                                                    Nenhuma zona com estes filtros.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <InputError message={Object.values(erros)[0]} className="px-6 pt-2" />
                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E8ECF4] px-6 py-4 dark:border-slate-800">
                                <span className="text-sm text-slate-500 dark:text-slate-400">Voltar a registar o mesmo mês e zona corrige o valor.</span>
                                <PrimaryButton type="button" onClick={guardarZonas} disabled={prontas.length === 0 || aGuardar} className="min-h-[48px]">
                                    <Save className="h-[18px] w-[18px]" aria-hidden="true" />
                                    {aGuardar ? "A guardar…" : prontas.length === 0 ? "Guardar" : `Guardar ${prontas.length} ${prontas.length === 1 ? "zona" : "zonas"}`}
                                </PrimaryButton>
                            </div>
                        </>
                    ) : (
                        <form onSubmit={guardarSistema} className="flex flex-col gap-4 p-6">
                            <label className="flex flex-col gap-1.5">
                                <span className="text-sm font-semibold text-ink dark:text-[#F2F5FB]">Água captada no sistema todo</span>
                                <span className="inline-flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        required
                                        value={sistema.data.volume_m3}
                                        onChange={(e) => sistema.setData("volume_m3", e.target.value)}
                                        placeholder={registoDe.sistema ? String(Number(registoDe.sistema.volume_m3)) : "Leitura do contador de produção"}
                                        className="min-h-[48px] w-64 rounded-md border-[#DDE2EE] text-right tabular-nums dark:border-slate-800 dark:bg-[#1E232D] dark:text-[#F2F5FB]"
                                    />
                                    <span className="text-slate-500">m³</span>
                                </span>
                                <InputError message={sistema.errors.volume_m3} />
                            </label>
                            <p className="text-sm text-slate-600 dark:text-slate-300">Use quando há um só contador à saída do furo. Assim não se vê em que zona se perde água.</p>
                            <div className="flex flex-wrap items-center gap-3">
                                <PrimaryButton disabled={sistema.processing} className="min-h-[48px]">
                                    <Save className="h-[18px] w-[18px]" aria-hidden="true" />
                                    Guardar
                                </PrimaryButton>
                                {registoDe.sistema && (
                                    <button type="button" onClick={() => setParaApagar(registoDe.sistema)} className="text-sm font-semibold text-rose-700 hover:text-rose-800 dark:text-rose-300">
                                        Apagar o registo actual ({formatVolume(registoDe.sistema.volume_m3)})
                                    </button>
                                )}
                            </div>
                        </form>
                    )}
                </AnimatedPanel>

                <GraficoSerie
                    titulo="Produzida vs. facturada"
                    descricao="Últimos 6 meses (sistema todo ou soma das zonas)"
                    icone={Droplets}
                    dados={historico}
                    series={[
                        { chave: "produzido", label: "Produzida", cor: "#0059FF" },
                        { chave: "facturado", label: "Facturada", cor: "#9DBBFF" },
                    ]}
                    tipo="bar"
                    formatar={formatVolume}
                    formatarEixo={formatarCompacto}
                />
            </div>
            <ConfirmDialog
                show={Boolean(paraApagar)}
                onClose={() => setParaApagar(null)}
                tone="simples"
                title="Apagar este registo de produção?"
                description={`O registo de ${paraApagar ? formatVolume(paraApagar.volume_m3) : ""} (${paraApagar?.zona?.nome ?? "Sistema todo"}) deixa de contar para as perdas de água deste mês.`}
                confirmLabel="Apagar"
                onConfirm={() => router.delete(`/producao/${paraApagar.id}`, { preserveScroll: true, onFinish: () => setParaApagar(null) })}
            />
        </AdminLayout>
    );
}
