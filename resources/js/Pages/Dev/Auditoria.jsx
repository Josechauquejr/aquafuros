import { Head, router } from "@inertiajs/react";
import { Search, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import DevLayout from "@/Layouts/DevLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import Pagination from "@/Components/Pagination";
import StatusBadge from "@/Components/StatusBadge";
import TextInput from "@/Components/TextInput";
import { formatDateTime } from "@/lib/utils";

function Detalhes({ detalhes }) {
    if (!detalhes) return <span className="text-slate-400">—</span>;
    const campos = Object.entries(detalhes.campos ?? {});
    const extra = Object.entries(detalhes).filter(([chave]) => !["campos", "metodo", "estado"].includes(chave));

    return (
        <div className="space-y-0.5 text-xs text-slate-600 dark:text-slate-400">
            {[...campos, ...extra].map(([chave, valor]) => (
                <p key={chave}>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{chave}:</span> {String(valor)}
                </p>
            ))}
        </div>
    );
}

export default function Auditoria({ registos, filtros }) {
    const [search, setSearch] = useState(filtros.search ?? "");

    useEffect(() => {
        if (search === (filtros.search ?? "")) return;
        const temporizador = setTimeout(
            () => router.get("/dev/auditoria", { search }, { preserveState: true, preserveScroll: true, replace: true }),
            350,
        );
        return () => clearTimeout(temporizador);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    return (
        <DevLayout
            header={
                <div>
                    <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">Desenvolvedor</p>
                    <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">Auditoria do painel</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Tudo o que foi alterado a partir do painel do Desenvolvedor. O registo só se acrescenta: não pode ser editado nem apagado.
                    </p>
                </div>
            }
        >
            <Head title="Auditoria do painel" />

            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-7xl space-y-4 px-4 sm:px-6 lg:px-8">
                    <div className="relative max-w-sm">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                        <TextInput
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Pesquisar acção ou alvo"
                            className="block w-full pl-9"
                        />
                    </div>

                    <AnimatedPanel className="overflow-hidden">
                        {registos.data.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-slate-500 dark:text-slate-400">
                                <ShieldCheck className="h-8 w-8" aria-hidden="true" />
                                Ainda não há acções registadas.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                                    <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                                        <tr>
                                            <th className="px-4 py-3">Quando</th>
                                            <th className="px-4 py-3">Quem</th>
                                            <th className="px-4 py-3">Acção</th>
                                            <th className="px-4 py-3">Alvo</th>
                                            <th className="px-4 py-3">Detalhes</th>
                                            <th className="px-4 py-3">Origem</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {registos.data.map((registo) => (
                                            <tr key={registo.id} className="align-top">
                                                <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{formatDateTime(registo.created_at)}</td>
                                                <td className="px-4 py-3 text-slate-900 dark:text-white">{registo.user?.name ?? "—"}</td>
                                                <td className="px-4 py-3">
                                                    <StatusBadge tone={registo.detalhes?.estado >= 400 ? "rose" : "cyan"}>{registo.acao}</StatusBadge>
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{registo.alvo ?? "—"}</td>
                                                <td className="px-4 py-3"><Detalhes detalhes={registo.detalhes} /></td>
                                                <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{registo.ip}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <Pagination paginador={registos} />
                    </AnimatedPanel>
                </div>
            </div>
        </DevLayout>
    );
}
