import { Head, router } from "@inertiajs/react";
import { Activity, AlertTriangle, CheckCircle2, Clock, Database, HardDrive, ListChecks, Mail, MemoryStick, RefreshCw, XCircle } from "lucide-react";
import { useState } from "react";
import DevLayout from "@/Layouts/DevLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import SecondaryButton from "@/Components/SecondaryButton";
import StatusBadge from "@/Components/StatusBadge";
import { cn } from "@/lib/utils";

const nivelTom = { alto: "rose", medio: "amber" };

function Linha({ rotulo, children }) {
    return (
        <div className="flex items-start justify-between gap-3 py-1 text-sm">
            <dt className="text-slate-500 dark:text-slate-400">{rotulo}</dt>
            <dd className="text-right font-medium text-slate-900 dark:text-white">{children ?? "—"}</dd>
        </div>
    );
}

function Cartao({ icone: Icone, titulo, estado, children }) {
    const tom = estado === "ok" ? "emerald" : estado === "aviso" ? "amber" : "rose";
    const texto = estado === "ok" ? "Operacional" : estado === "aviso" ? "Atenção" : "Com problema";

    return (
        <AnimatedPanel className="p-5">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        <Icone className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="font-semibold text-slate-950 dark:text-white">{titulo}</h3>
                </div>
                <StatusBadge tone={tom}>{texto}</StatusBadge>
            </div>
            <dl className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">{children}</dl>
        </AnimatedPanel>
    );
}

const sim = (v) => (v ? "Sim" : "Não");
const mb = (v) => (v == null ? "—" : v >= 1024 ? `${(v / 1024).toFixed(1)} GB` : `${v} MB`);

export default function Saude({ servicos, aplicacao, alertas }) {
    const [aActualizar, setAActualizar] = useState(false);
    const { base_dados: bd, fila, agendador, cache, email, armazenamento: disco } = servicos;

    const actualizar = () => {
        setAActualizar(true);
        router.reload({ onFinish: () => setAActualizar(false) });
    };

    const estadoFila = !fila.ok ? "erro" : (fila.falhados ?? 0) > 0 || (fila.mais_antigo_min ?? 0) >= 10 ? "aviso" : "ok";
    const estadoAgendador = !agendador.ok ? "erro" : agendador.ha_min == null || agendador.ha_min >= 5 ? (aplicacao.ambiente === "production" ? "erro" : "aviso") : "ok";
    const estadoEmail = !email.ok ? "erro" : email.mailer === "log" || (email.gmail_configurado && !email.gmail_ligado) || (email.falhas_24h ?? 0) > 0 ? "aviso" : "ok";
    const estadoDisco = !disco.ok ? "erro" : !disco.gravavel || (disco.livre_pct ?? 100) < 10 ? "erro" : "ok";

    return (
        <DevLayout
            header={
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">Desenvolvedor</p>
                        <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">Saúde do sistema</h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Estado dos serviços da aplicação. Só leitura: esta página não altera nada.
                        </p>
                    </div>
                    <SecondaryButton type="button" onClick={actualizar} disabled={aActualizar}>
                        <RefreshCw className={cn("mr-2 h-4 w-4", aActualizar && "animate-spin")} aria-hidden="true" />
                        Verificar de novo
                    </SecondaryButton>
                </div>
            }
        >
            <Head title="Saúde do sistema" />

            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <AnimatedPanel className="p-5">
                        <div className="flex items-center gap-3">
                            {alertas.length === 0 ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                            ) : (
                                <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />
                            )}
                            <h3 className="font-semibold text-slate-950 dark:text-white">
                                {alertas.length === 0 ? "Tudo em ordem" : `${alertas.length} alerta(s)`}
                            </h3>
                        </div>
                        {alertas.length > 0 && (
                            <ul className="mt-4 space-y-3">
                                {alertas.map((alerta) => (
                                    <li key={alerta.titulo} className="flex items-start gap-3">
                                        <StatusBadge tone={nivelTom[alerta.nivel] ?? "slate"}>{alerta.nivel === "alto" ? "Alto" : "Médio"}</StatusBadge>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{alerta.titulo}</p>
                                            <p className="text-sm text-slate-600 dark:text-slate-400">{alerta.detalhe}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </AnimatedPanel>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <Cartao icone={Database} titulo="Base de dados" estado={bd.ok ? "ok" : "erro"}>
                            <Linha rotulo="Motor">{bd.driver} {bd.versao ? `(${bd.versao.split(" ")[0] === "PostgreSQL" ? bd.versao.split(" ")[1] : bd.versao})` : ""}</Linha>
                            <Linha rotulo="Base">{bd.base}</Linha>
                            <Linha rotulo="Resposta">{bd.ms == null ? "—" : `${bd.ms} ms`}</Linha>
                            {bd.erro && <Linha rotulo="Erro">{bd.erro}</Linha>}
                        </Cartao>

                        <Cartao icone={ListChecks} titulo="Fila de jobs" estado={estadoFila}>
                            <Linha rotulo="Ligação">{fila.ligacao}</Linha>
                            <Linha rotulo="Pendentes">{fila.pendentes}</Linha>
                            <Linha rotulo="Em curso">{fila.em_curso}</Linha>
                            <Linha rotulo="Mais antigo à espera">{fila.mais_antigo_min == null ? "—" : `${fila.mais_antigo_min} min`}</Linha>
                            <Linha rotulo="Falhados">{fila.falhados}</Linha>
                        </Cartao>

                        <Cartao icone={Clock} titulo="Agendador" estado={estadoAgendador}>
                            <Linha rotulo="Último pulso">{agendador.ultimo_pulso ? new Date(agendador.ultimo_pulso * 1000).toLocaleString("pt-PT") : "Nunca"}</Linha>
                            <Linha rotulo="Há">{agendador.ha_min == null ? "—" : `${agendador.ha_min} min`}</Linha>
                            <Linha rotulo="Tarefa diária">notificacoes:gerar às 08:00</Linha>
                        </Cartao>

                        <Cartao icone={MemoryStick} titulo="Cache" estado={cache.ok ? "ok" : "erro"}>
                            <Linha rotulo="Driver">{cache.driver}</Linha>
                            <Linha rotulo="Escrita e leitura">{cache.ok ? `${cache.ms} ms` : cache.erro}</Linha>
                        </Cartao>

                        <Cartao icone={Mail} titulo="Email" estado={estadoEmail}>
                            <Linha rotulo="Mailer">{email.mailer}</Linha>
                            <Linha rotulo="Gmail configurado">{sim(email.gmail_configurado)}</Linha>
                            <Linha rotulo="Gmail ligado">{email.gmail_ligado ? email.gmail_conta ?? "Sim" : "Não"}</Linha>
                            <Linha rotulo="Enviados (24 h)">{email.enviados_24h}</Linha>
                            <Linha rotulo="Falhados (24 h)">{email.falhas_24h}</Linha>
                        </Cartao>

                        <Cartao icone={HardDrive} titulo="Armazenamento" estado={estadoDisco}>
                            <Linha rotulo="Gravável">{sim(disco.gravavel)}</Linha>
                            <Linha rotulo="Livre">{disco.livre_pct == null ? "—" : `${mb(disco.livre_mb)} de ${mb(disco.total_mb)} (${disco.livre_pct}%)`}</Linha>
                            <Linha rotulo="Logs em ficheiro">{disco.logs_kb} KB</Linha>
                            <Linha rotulo="Canal de log">{disco.canal_log}</Linha>
                        </Cartao>
                    </div>

                    <AnimatedPanel className="p-5">
                        <div className="flex items-center gap-3">
                            <Activity className="h-5 w-5 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
                            <h3 className="font-semibold text-slate-950 dark:text-white">Aplicação</h3>
                        </div>
                        <dl className="mt-4 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
                            <Linha rotulo="Nome">{aplicacao.nome}</Linha>
                            <Linha rotulo="Ambiente">{aplicacao.ambiente}</Linha>
                            <Linha rotulo="Debug">
                                {aplicacao.debug ? <span className="text-rose-600">Ligado</span> : "Desligado"}
                            </Linha>
                            <Linha rotulo="Laravel">{aplicacao.laravel}</Linha>
                            <Linha rotulo="PHP">{aplicacao.php}</Linha>
                            <Linha rotulo="Fuso horário">{aplicacao.fuso}</Linha>
                            <Linha rotulo="Hora do servidor">{aplicacao.hora_servidor}</Linha>
                            <Linha rotulo="Manutenção">{sim(aplicacao.manutencao)}</Linha>
                            <Linha rotulo="URL">{aplicacao.url}</Linha>
                        </dl>
                    </AnimatedPanel>
                </div>
            </div>
        </DevLayout>
    );
}
