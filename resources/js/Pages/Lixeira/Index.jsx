import { Head, router, usePage } from "@inertiajs/react";
import { Eye, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import ConfirmDialog from "@/Components/ConfirmDialog";
import DataTable from "@/Components/DataTable/DataTable";
import { Campo, Campos, Destaque, Destaques, Explicacao } from "@/Components/DataTable/Detalhe";
import InlineNotice from "@/Components/InlineNotice";
import StatusBadge from "@/Components/StatusBadge";
import { formatDateTime } from "@/lib/utils";

const tipos = {
    clientes: { rotulo: "Clientes", singular: "cliente", rotaBase: "/clientes/lixeira" },
    leituras: { rotulo: "Leituras", singular: "leitura", rotaBase: "/leituras/lixeira" },
    pagamentos: { rotulo: "Pagamentos", singular: "pagamento", rotaBase: "/pagamentos/lixeira" },
};

// Valores que o servidor assume quando o parâmetro não vem no URL.
const padroes = { periodo: "todos", tipo: "clientes", sort: "eliminado", dir: "desc" };

const filtrosConfig = [
    {
        chave: "tipo",
        rotulo: "O que procura",
        tipo: "select",
        padrao: "clientes",
        opcoes: Object.entries(tipos).map(([valor, { rotulo }]) => ({ valor, rotulo })),
    },
];

function Expira({ linha }) {
    if (linha.tipo === "pagamentos") return <StatusBadge tone="cyan">Preservado — auditoria</StatusBadge>;
    if (linha.preservado) return <StatusBadge tone="cyan">Preservado — tem histórico</StatusBadge>;

    return (
        <StatusBadge tone={linha.dias_restantes <= 5 ? "rose" : "amber"}>
            {linha.dias_restantes > 0 ? `${linha.dias_restantes} dia(s) restante(s)` : "elimina no próximo acesso"}
        </StatusBadge>
    );
}

export default function Index({ linhas, diasRetencao, filtros }) {
    const { flash } = usePage().props;
    const [paraEliminar, setParaEliminar] = useState(null);
    const tipo = tipos[filtros.tipo];

    const colunas = [
        {
            chave: "item",
            titulo: tipo.rotulo === "Clientes" ? "Cliente" : tipo.rotulo === "Leituras" ? "Leitura" : "Recibo",
            ordenavel: true,
            render: (linha) => (
                <>
                    <p className="font-semibold text-slate-900 dark:text-white">{linha.titulo}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{linha.subtitulo}</p>
                </>
            ),
        },
        { chave: "detalhe", titulo: "Conteúdo", render: (linha) => linha.detalhe },
        {
            chave: "eliminado",
            titulo: "Eliminado em",
            ordenavel: true,
            render: (linha) => formatDateTime(linha.eliminado_em),
        },
        { chave: "expira", titulo: filtros.tipo === "pagamentos" ? "Retenção" : "Prazo", render: (linha) => <Expira linha={linha} /> },
    ];

    const cartao = (linha) => (
        <div className="space-y-1.5">
            <p className="font-semibold text-slate-900 dark:text-white">{linha.titulo}</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">{linha.subtitulo}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Eliminado em {formatDateTime(linha.eliminado_em)}</p>
            <Expira linha={linha} />
        </div>
    );

    const detalhe = {
        titulo: (linha) => linha.titulo,
        descricao: (linha) => linha.subtitulo,
        conteudo: (linha) => (
            <>
                <Destaques>
                    <Destaque rotulo="Eliminado em">{formatDateTime(linha.eliminado_em)}</Destaque>
                    <Destaque rotulo={linha.tipo === "pagamentos" ? "Retenção" : "Prazo para recuperar"}>
                        <Expira linha={linha} />
                    </Destaque>
                </Destaques>
                <Campos className="mt-5">
                    <Campo rotulo="Conteúdo" largo>
                        {linha.detalhe}
                    </Campo>
                </Campos>
                <Explicacao tom="info" titulo="O que acontece a seguir" className="mt-5">
                    {linha.tipo === "pagamentos"
                        ? "Pagamentos anulados permanecem no histórico de auditoria e não são apagados definitivamente. Pode recuperar este registo."
                        : linha.preservado
                        ? "Este cliente tem facturas ou pagamentos no histórico e não é apagado automaticamente. Pode recuperar o cliente e os respectivos registos."
                        : `Fica aqui ${diasRetencao} dias. Pode ser recuperado ou apagado definitivamente antes disso; depois desse prazo é apagado automaticamente.`}
                </Explicacao>
            </>
        ),
    };

    const accoes = (linha) => ({
        principal: {
            icone: RotateCcw,
            curto: "Recuperar",
            destaque: true,
            rotulo: `Recuperar ${tipo.singular} ${linha.titulo}`,
            onClick: () => router.post(`${tipo.rotaBase}/${linha.id}/restaurar`, {}, { preserveScroll: true }),
        },
        menu: [
            { icone: Eye, rotulo: "Ver detalhe", expandir: true },
            ...(!linha.preservado ? [{
                icone: Trash2,
                rotulo: "Apagar definitivamente",
                tone: "danger",
                separadorAntes: true,
                onClick: () => setParaEliminar(linha),
            }] : []),
        ],
    });

    const confirmarEliminacao = () => {
        if (!paraEliminar) return;
        router.delete(`${tipo.rotaBase}/${paraEliminar.id}`, { onFinish: () => setParaEliminar(null), preserveScroll: true });
    };

    return (
        <AdminLayout
            header={
                <div>
                    <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">Administração</p>
                    <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">Lixeira</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Clientes e leituras sem histórico ficam aqui {diasRetencao} dias. Pagamentos anulados e
                        registos financeiros de clientes são preservados para auditoria.
                    </p>
                </div>
            }
        >
            <Head title="Lixeira" />

            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">

                    <DataTable
                        rota="/lixeira"
                        filtros={filtros}
                        padroes={padroes}
                        paginador={linhas}
                        colunas={colunas}
                        cartao={cartao}
                        detalhe={detalhe}
                        placeholder={`Pesquisar ${tipo.rotulo.toLowerCase()} eliminados`}
                        periodo
                        filtrosConfig={filtrosConfig}
                        accoes={accoes}
                        rotuloAccoes={(linha) => `Mais acções sobre ${linha.titulo}`}
                        vazio={{
                            mensagem: `Não há ${tipo.rotulo.toLowerCase()} na lixeira.`,
                            mensagemFiltrada: "Nada encontrado na lixeira para os filtros seleccionados.",
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
                description={
                    paraEliminar
                        ? `Apagar "${paraEliminar.titulo}" definitivamente${
                              paraEliminar.tipo === "clientes" ? ", junto com todas as suas facturas, leituras e pagamentos" : ""
                          }? Esta acção não pode ser desfeita.`
                        : ""
                }
            />
        </AdminLayout>
    );
}
