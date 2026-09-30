import { Head, Link, router, usePage } from "@inertiajs/react";
import { ArrowLeft, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import DevLayout from "@/Layouts/DevLayout";
import ConfirmDialog from "@/Components/ConfirmDialog";
import DataTable from "@/Components/DataTable/DataTable";
import InlineNotice from "@/Components/InlineNotice";
import StatusBadge from "@/Components/StatusBadge";
import { formatDateTime } from "@/lib/utils";

// Valores que o servidor assume quando o parâmetro não vem no URL.
const padroes = { periodo: "todos", sort: "eliminado", dir: "desc" };

function Prazo({ utilizador }) {
    return (
        <StatusBadge tone={utilizador.dias_restantes <= 5 ? "rose" : "amber"}>
            {utilizador.dias_restantes > 0 ? `${utilizador.dias_restantes} dia(s) restante(s)` : "elimina no próximo acesso"}
        </StatusBadge>
    );
}

export default function Lixeira({ utilizadores, diasRetencao, filtros }) {
    const { flash } = usePage().props;
    const [paraEliminar, setParaEliminar] = useState(null);

    const colunas = [
        {
            chave: "item",
            titulo: "Utilizador",
            ordenavel: true,
            render: (u) => (
                <>
                    <p className="font-semibold text-slate-900 dark:text-white">{u.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                </>
            ),
        },
        { chave: "papel", titulo: "Papel", render: (u) => u.papel ?? "—" },
        { chave: "eliminado", titulo: "Eliminado em", ordenavel: true, render: (u) => formatDateTime(u.eliminado_em) },
        { chave: "prazo", titulo: "Prazo", render: (u) => <Prazo utilizador={u} /> },
    ];

    const cartao = (u) => (
        <div className="space-y-1.5">
            <p className="font-semibold text-slate-900 dark:text-white">{u.name}</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">
                {u.username} · {u.papel ?? "—"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Eliminado em {formatDateTime(u.eliminado_em)}</p>
            <Prazo utilizador={u} />
        </div>
    );

    const accoes = (u) => ({
        principal: {
            icone: RotateCcw,
            curto: "Recuperar",
            destaque: true,
            rotulo: `Recuperar utilizador ${u.name}`,
            onClick: () => router.post(`/dev/users/lixeira/${u.id}/restaurar`, {}, { preserveScroll: true }),
        },
        menu: [{ icone: Trash2, rotulo: "Apagar definitivamente", tone: "danger", onClick: () => setParaEliminar(u) }],
    });

    const confirmarEliminacao = () => {
        if (!paraEliminar) return;
        router.delete(`/dev/users/lixeira/${paraEliminar.id}`, { onFinish: () => setParaEliminar(null), preserveScroll: true });
    };

    return (
        <DevLayout
            header={
                <div>
                    <Link
                        href="/dev/users"
                        className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                        Voltar a Utilizadores
                    </Link>
                    <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">Lixeira de utilizadores</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Utilizadores eliminados ficam aqui {diasRetencao} dias — podem ser recuperados ou apagados
                        definitivamente antes disso.
                    </p>
                </div>
            }
        >
            <Head title="Lixeira de utilizadores" />

            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <InlineNotice show={Boolean(flash.status)}>{flash.status}</InlineNotice>
                    <InlineNotice show={Boolean(flash.error)} tone="error">{flash.error}</InlineNotice>

                    <DataTable
                        rota="/dev/users/lixeira"
                        filtros={filtros}
                        padroes={padroes}
                        paginador={utilizadores}
                        colunas={colunas}
                        cartao={cartao}
                        placeholder="Pesquisar nome, utilizador ou email"
                        periodo
                        accoes={accoes}
                        rotuloAccoes={(u) => `Mais acções sobre ${u.name}`}
                        vazio={{
                            mensagem: "A lixeira está vazia.",
                            mensagemFiltrada: "Nenhum utilizador encontrado para os filtros seleccionados.",
                        }}
                    />
                </div>
            </div>

            <ConfirmDialog
                show={Boolean(paraEliminar)}
                onClose={() => setParaEliminar(null)}
                onConfirm={confirmarEliminacao}
                title="Apagar definitivamente"
                confirmLabel="Apagar para sempre"
                description={paraEliminar ? `Apagar "${paraEliminar.name}" definitivamente? Esta acção não pode ser desfeita.` : ""}
            />
        </DevLayout>
    );
}
