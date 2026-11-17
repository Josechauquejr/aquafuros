import { Link, usePage } from "@inertiajs/react";
import { ArrowRight, ChevronRight } from "lucide-react";
import AnimatedPanel from "@/Components/AnimatedPanel";
import Ilustracao from "@/Components/Ilustracao";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const saudacao = (h) => (h < 12 ? "Bom dia" : h < 19 ? "Boa tarde" : "Boa noite");

/** Saudação + frase do dia + a única acção principal (como no Painel do administrador). */
export function SaudacaoPainel({ ilustracao, frase, accao }) {
    const { auth } = usePage().props;
    const agora = new Date();
    const nome = (auth?.user?.name ?? "").trim().split(/\s+/)[0];

    return (
        <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-center gap-[18px]">
                <Ilustracao nome={ilustracao} largura={120} className="hidden sm:block" />
                <div className="flex flex-col gap-1.5">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                        {DIAS[agora.getDay()]}, {agora.getDate()} de {MESES[agora.getMonth()]}
                    </span>
                    <h1 className="text-[28px] font-bold leading-tight tracking-[-0.6px] text-ink sm:text-4xl dark:text-[#F2F5FB]">
                        {saudacao(agora.getHours())}
                        {nome ? `, ${nome}` : ""}
                    </h1>
                    <span className="text-base text-slate-600 dark:text-slate-300">{frase}</span>
                </div>
            </div>
            <Link
                href={accao.href}
                className="inline-flex min-h-[48px] items-center gap-2.5 rounded-md bg-brand px-[22px] text-[15px] font-bold text-white transition hover:bg-brand-hover dark:bg-cyan-500 dark:hover:bg-cyan-600"
            >
                {accao.rotulo}
                <ArrowRight className="h-[18px] w-[18px]" aria-hidden="true" />
            </Link>
        </div>
    );
}

/** Cartão com uma lista curta de trabalho e o link "Ver todos". */
export function ListaTrabalho({ titulo, contagem, verTodos, vazio, itens }) {
    return (
        <AnimatedPanel className="min-w-0 overflow-hidden">
            <div className="flex items-baseline justify-between gap-2 px-6 py-5">
                <h2 className="text-lg font-bold text-ink dark:text-[#F2F5FB]">
                    {titulo} {contagem !== undefined && <span className="text-sm font-medium text-slate-500 dark:text-slate-400">· {contagem}</span>}
                </h2>
                {verTodos && (
                    <Link href={verTodos} className="text-sm font-semibold text-cyan-700 hover:text-cyan-800 dark:text-cyan-400">
                        Ver todos
                    </Link>
                )}
            </div>
            {itens.length === 0 ? (
                <p className="border-t border-[#E8ECF4] px-6 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">{vazio}</p>
            ) : (
                <ul className="divide-y divide-[#EEF1F7] border-t border-[#E8ECF4] dark:divide-slate-800 dark:border-slate-800">
                    {itens.map((item) => (
                        <li key={item.chave}>
                            <Link href={item.href} className="flex min-h-[56px] items-center gap-3 px-6 py-3 hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                                <span className="flex min-w-0 flex-1 flex-col">
                                    <strong className="truncate text-[15px] text-ink dark:text-[#F2F5FB]">{item.titulo}</strong>
                                    <span className="truncate text-[13px] text-slate-500 dark:text-slate-400">{item.detalhe}</span>
                                </span>
                                {item.direita}
                                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </AnimatedPanel>
    );
}
