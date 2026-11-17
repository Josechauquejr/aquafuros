import { Head, usePage } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import { ListaTrabalho, SaudacaoPainel } from "@/Components/PainelPapel";
import StatusBadge from "@/Components/StatusBadge";
import { formatVolume } from "@/lib/utils";
import BarraProgresso from "@/Components/BarraProgresso";

const ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** Painel do técnico: a ronda de leituras do mês — quem falta ler e o que espera confirmação. */
export default function Dashboard({ contadores, leiturasPorConfirmar = [], clientesSemLeitura = [] }) {
    const { ciclo } = usePage().props;
    const faltam = contadores.clientesSemLeituraEsteMes;
    const total = ciclo?.clientes ?? faltam;
    const lidos = Math.max(0, total - faltam);
    const pct = total > 0 ? Math.round((lidos / total) * 100) : 0;
    const dias = Math.max(ciclo?.diasParaLimite ?? 0, 0);

    return (
        <AdminLayout>
            <Head title="Painel" />
            <div className="mx-auto flex max-w-7xl flex-col gap-7 px-4 sm:px-6 lg:px-8">
                <SaudacaoPainel
                    ilustracao="contador"
                    frase={
                        faltam > 0 ? (
                            <>
                                Faltam <strong className="text-ink dark:text-[#F2F5FB]">{faltam} contadores</strong> por ler em {ciclo?.mes ?? "este mês"}.
                            </>
                        ) : (
                            "Todos os contadores deste mês estão lidos."
                        )
                    }
                    accao={{ rotulo: faltam > 0 ? "Continuar leituras" : "Ver leituras", href: "/leituras" }}
                />

                <AnimatedPanel className="flex flex-col gap-3.5 p-6">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-lg text-ink dark:text-[#F2F5FB]">
                            <strong className="text-[28px] tabular-nums">{lidos}</strong> de {total} clientes lidos
                        </span>
                        {faltam > 0 && (
                            <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                                {ciclo?.diasParaLimite >= 0 ? `Faltam ${dias} ${dias === 1 ? "dia" : "dias"} · ${Math.ceil(faltam / Math.max(dias, 1))} por dia` : `Limite (${ciclo?.leiturasAte}) ultrapassado`}
                            </span>
                        )}
                    </div>
                    <BarraProgresso pct={Math.max(pct, 1)} className="h-2.5" />
                    <span className="text-sm text-slate-500 dark:text-slate-400">Registou {contadores.leiturasRegistadasEsteMes} leituras este mês.</span>
                </AnimatedPanel>

                <div className="grid items-start gap-6 lg:grid-cols-2">
                    <ListaTrabalho
                        titulo="Por ler"
                        contagem={faltam}
                        verTodos="/leituras"
                        vazio="Não falta ninguém este mês."
                        itens={clientesSemLeitura.map((c) => ({
                            chave: c.id,
                            href: `/leituras?cliente=${c.id}`,
                            titulo: c.nome,
                            detalhe: `${c.numero_cliente}${c.bairro ? ` · ${c.bairro}` : ""}`,
                            direita: <StatusBadge tone="amber">Por ler</StatusBadge>,
                        }))}
                    />
                    <ListaTrabalho
                        titulo="Por confirmar"
                        contagem={contadores.leiturasPendentesConfirmacao}
                        verTodos="/leituras?estado=pendente"
                        vazio="Nada à espera de confirmação."
                        itens={leiturasPorConfirmar.map((l) => ({
                            chave: l.id,
                            href: `/leituras/${l.id}`,
                            titulo: l.cliente?.nome ?? "Cliente removido",
                            detalhe: `${ABREV[l.mes - 1]}/${l.ano} · ${formatVolume(Number(l.leitura_actual) - Number(l.leitura_anterior))}`,
                            direita: <StatusBadge tone="amber">Por confirmar</StatusBadge>,
                        }))}
                    />
                </div>
            </div>
        </AdminLayout>
    );
}
