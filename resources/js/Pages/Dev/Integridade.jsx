import { Head, Link } from "@inertiajs/react";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import DevLayout from "@/Layouts/DevLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import { Campo, Campos, Destaque, Destaques, Explicacao } from "@/Components/DataTable/Detalhe";
import useCartaoDeLinha, { linhaClicavel } from "@/Components/DataTable/useCartaoDeLinha";
import StatusBadge from "@/Components/StatusBadge";
import { ExpandableCard } from "@/Components/ui/expandable-card";
import { cn } from "@/lib/utils";

const tomGravidade = { alto: "rose", medio: "amber", baixo: "slate" };
const rotuloGravidade = { alto: "Alto", medio: "Médio", baixo: "Baixo" };
const ordem = ["alto", "medio", "baixo"];

export default function Integridade({ verificacoes }) {
    const comProblemas = verificacoes.filter((v) => v.total > 0);
    const comErro = verificacoes.filter((v) => v.erro);
    const ordenadas = [...verificacoes].sort((a, b) => (b.total > 0) - (a.total > 0) || ordem.indexOf(a.gravidade) - ordem.indexOf(b.gravidade));
    const cartao = useCartaoDeLinha(ordenadas, (v) => v.chave);
    const v = cartao.linha;

    return (
        <DevLayout
            header={
                <div>
                    <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">Desenvolvedor</p>
                    <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">Integridade dos dados</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Verificações só de leitura. Nada é corrigido aqui: mostram o que parece errado e onde, para decidir com calma. Clique numa verificação para ver o detalhe.
                    </p>
                </div>
            }
        >
            <Head title="Integridade dos dados" />

            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-5xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <AnimatedPanel className="flex items-center gap-3 p-5">
                        {comProblemas.length === 0 && comErro.length === 0 ? (
                            <CheckCircle2 className="h-6 w-6 text-emerald-600" aria-hidden="true" />
                        ) : (
                            <ShieldAlert className="h-6 w-6 text-amber-600" aria-hidden="true" />
                        )}
                        <p className="font-semibold text-slate-950 dark:text-white">
                            {comProblemas.length === 0 && comErro.length === 0
                                ? `As ${verificacoes.length} verificações passaram sem problemas.`
                                : `${comProblemas.length} de ${verificacoes.length} verificações com registos suspeitos${comErro.length ? `, ${comErro.length} não conseguiram correr` : ""}.`}
                        </p>
                    </AnimatedPanel>

                    <AnimatedPanel className="divide-y divide-slate-100 dark:divide-slate-800">
                        {ordenadas.map((item) => (
                            <div key={item.chave} {...cartao.propsLinha(item)} className={cn("flex flex-wrap items-center gap-3 px-5 py-4", linhaClicavel)}>
                                <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-slate-950 dark:text-white">{item.titulo}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{item.descricao}</p>
                                    {item.erro && <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{item.erro}</p>}
                                </div>
                                <StatusBadge tone={tomGravidade[item.gravidade]}>{rotuloGravidade[item.gravidade]}</StatusBadge>
                                {item.erro ? (
                                    <StatusBadge tone="amber">Sem resultado</StatusBadge>
                                ) : item.total === 0 ? (
                                    <StatusBadge tone="emerald">OK</StatusBadge>
                                ) : (
                                    <Link href={`/dev/integridade/${item.chave}`} className="rounded-md bg-rose-50 px-3 py-1 text-sm font-semibold text-rose-700 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300">
                                        {item.total} registo(s) →
                                    </Link>
                                )}
                            </div>
                        ))}
                    </AnimatedPanel>
                </div>
            </div>

            {v && (
                <ExpandableCard
                    open={cartao.aberta}
                    onOpenChange={(valor) => !valor && cartao.fechar()}
                    title={v.titulo}
                    description="Verificação de integridade"
                    footer={
                        v.total > 0 && !v.erro ? (
                            <div className="flex justify-end">
                                <Link href={`/dev/integridade/${v.chave}`} className="rounded-md bg-rose-600 px-4 py-2 text-xs font-semibold uppercase text-white hover:bg-rose-500">
                                    Ver os {v.total} registo(s)
                                </Link>
                            </div>
                        ) : null
                    }
                >
                    <Destaques>
                        <Destaque rotulo="Resultado" tom={v.erro ? "neutro" : v.total === 0 ? "sucesso" : "perigo"}>
                            {v.erro ? "Sem resultado" : v.total === 0 ? "Tudo certo" : `${v.total} suspeito(s)`}
                        </Destaque>
                        <Destaque rotulo="Gravidade">{rotuloGravidade[v.gravidade]}</Destaque>
                    </Destaques>
                    <Campos className="mt-5">
                        <Campo rotulo="Tabela">{v.tabela}</Campo>
                        <Campo rotulo="O que verifica" largo>{v.descricao}</Campo>
                    </Campos>
                    {v.erro && <Explicacao tom="aviso" titulo="A verificação não correu" className="mt-5">{v.erro}</Explicacao>}
                    {v.total > 0 && !v.erro && <Explicacao tom="aviso" titulo="O que fazer" className="mt-5">Abra a lista, confirme cada caso no explorador de dados e corrija pelo fluxo normal do sistema. Nada é alterado automaticamente.</Explicacao>}
                </ExpandableCard>
            )}
        </DevLayout>
    );
}
