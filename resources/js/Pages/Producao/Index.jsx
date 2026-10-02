import { Head, router, useForm } from "@inertiajs/react";
import { Droplets, Plus, Trash2, TrendingDown } from "lucide-react";
import { useState } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import ConfirmDialog from "@/Components/ConfirmDialog";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import KpiCard from "@/Components/KpiCard";
import PrimaryButton from "@/Components/PrimaryButton";
import SeletorMes from "@/Components/SeletorMes";
import GraficoSerie, { formatarCompacto } from "@/Components/charts/GraficoSerie";
import TextInput from "@/Components/TextInput";
import { formatVolume } from "@/lib/utils";

const selectClasses =
    "mt-1 block w-full rounded-md border-slate-300 bg-white text-sm text-slate-950 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
const pct = (v) => (v === null || v === undefined ? "—" : `${Number(v).toLocaleString("pt-PT", { maximumFractionDigits: 1 })}%`);

export default function Index({ mesReferencia, registos, perdas, zonas, historico, filtros }) {
    const [ano, mes] = mesReferencia.valor.split("-").map(Number);
    const form = useForm({ mes, ano, zona_id: "", volume_m3: "" });
    const [paraApagar, setParaApagar] = useState(null);

    const guardar = (evento) => {
        evento.preventDefault();
        form.transform((d) => ({ ...d, mes, ano })).post("/producao", { preserveScroll: true, onSuccess: () => form.setData("volume_m3", "") });
    };

    return (
        <AdminLayout
            header={
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">Operação</p>
                        <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">Produção de água e perdas</h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Registe a água captada ou bombeada em cada mês (lida no contador de produção). A diferença para o que se factura são as perdas.
                        </p>
                    </div>
                    <SeletorMes rota="/producao" mesReferencia={mesReferencia} extra={filtros} />
                </div>
            }
        >
            <Head title="Produção de água" />
            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-5xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                        <KpiCard label="Produzida" value={formatVolume(perdas.produzidoM3)} detail={mesReferencia.rotulo} icon={Droplets} tone="cyan" />
                        <KpiCard label="Facturada" value={formatVolume(perdas.facturadoM3)} detail="leituras com factura válida" icon={Droplets} tone="emerald" />
                        <KpiCard label="Perdas" value={perdas.perdasM3 === null ? "—" : formatVolume(perdas.perdasM3)} detail="produzida − facturada" icon={TrendingDown} tone={perdas.perdasPct > 30 ? "rose" : "amber"} />
                        <KpiCard label="Perdas (%)" value={pct(perdas.perdasPct)} detail={perdas.temDados ? "acima de 30% é preocupante" : "falta registar a produção do mês"} icon={TrendingDown} tone={perdas.perdasPct > 30 ? "rose" : "emerald"} />
                    </section>

                    <div className="grid gap-6 lg:grid-cols-2">
                        <AnimatedPanel className="p-6">
                            <h3 className="font-semibold text-slate-950 dark:text-white">Registar produção de {mesReferencia.rotulo}</h3>
                            <form onSubmit={guardar} className="mt-4 space-y-4">
                                <div>
                                    <InputLabel htmlFor="zona_producao" value="Zona" />
                                    <select id="zona_producao" value={form.data.zona_id} onChange={(e) => form.setData("zona_id", e.target.value)} className={selectClasses}>
                                        <option value="">Sistema todo</option>
                                        {zonas.map((z) => (
                                            <option key={z.id} value={z.id}>{z.nome}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <InputLabel htmlFor="volume" value="Volume captado (m³)" />
                                    <TextInput id="volume" type="number" min="0" step="0.01" value={form.data.volume_m3} onChange={(e) => form.setData("volume_m3", e.target.value)} className="mt-1 block w-full" required />
                                    <InputError message={form.errors.volume_m3} className="mt-1" />
                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Voltar a registar o mesmo mês e zona corrige o valor.</p>
                                </div>
                                <PrimaryButton disabled={form.processing}>
                                    <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                                    Guardar
                                </PrimaryButton>
                            </form>
                        </AnimatedPanel>

                        <AnimatedPanel className="overflow-hidden">
                            <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
                                <h3 className="font-semibold text-slate-950 dark:text-white">Registos do mês</h3>
                            </div>
                            {registos.length === 0 ? (
                                <p className="px-6 py-8 text-sm text-slate-500 dark:text-slate-400">Ainda não há produção registada neste mês.</p>
                            ) : (
                                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {registos.map((r) => (
                                        <li key={r.id} className="flex items-center justify-between gap-3 px-6 py-3 text-sm">
                                            <span className="font-medium text-slate-900 dark:text-white">{r.zona?.nome ?? "Sistema todo"}</span>
                                            <span className="flex items-center gap-3">
                                                <span className="text-slate-700 dark:text-slate-300">{formatVolume(r.volume_m3)}</span>
                                                <button type="button" onClick={() => setParaApagar(r)} className="inline-flex h-9 w-9 items-center justify-center text-slate-400 hover:text-rose-600" aria-label="Apagar registo">
                                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                                </button>
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {perdas.porZona.length > 0 && (
                                <div className="border-t border-slate-200 px-6 py-4 dark:border-slate-800">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Perdas por zona</p>
                                    <ul className="mt-2 space-y-1 text-sm">
                                        {perdas.porZona.map((z) => (
                                            <li key={z.zona} className="flex justify-between gap-3">
                                                <span className="text-slate-700 dark:text-slate-300">{z.zona}</span>
                                                <span className={z.perdasPct > 30 ? "font-semibold text-rose-600" : "font-semibold text-slate-900 dark:text-white"}>{pct(z.perdasPct)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </AnimatedPanel>
                    </div>

                    <GraficoSerie
                        titulo="Produzida vs. facturada"
                        descricao="Últimos 6 meses (sistema todo ou soma das zonas)"
                        icone={Droplets}
                        dados={historico}
                        series={[
                            { chave: "produzido", label: "Produzida", cor: "#2a78d6" },
                            { chave: "facturado", label: "Facturada", cor: "#1baf7a" },
                        ]}
                        tipo="bar"
                        formatar={formatVolume}
                        formatarEixo={formatarCompacto}
                    />
                </div>
            </div>
            <ConfirmDialog
                show={Boolean(paraApagar)}
                onClose={() => setParaApagar(null)}
                tone="simples"
                title="Apagar registo de produção"
                description={`O registo de ${paraApagar ? formatVolume(paraApagar.volume_m3) : ""} (${paraApagar?.zona?.nome ?? "Sistema todo"}) deixa de contar para as perdas de água deste mês.`}
                confirmLabel="Apagar"
                onConfirm={() => router.delete(`/producao/${paraApagar.id}`, { preserveScroll: true, onFinish: () => setParaApagar(null) })}
            />
        </AdminLayout>
    );
}
