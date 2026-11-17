import { usePage } from "@inertiajs/react";
import { FileText, Gauge, Wallet } from "lucide-react";
import Ilustracao from "@/Components/Ilustracao";
import MarcaAquafuros from "@/Components/MarcaAquafuros";

const PASSOS = [
    ["1 · Ler", Gauge],
    ["2 · Facturar", FileText],
    ["3 · Receber", Wallet],
];

/**
 * Ecrãs de entrada (recuperar palavra-passe, código, nova palavra-passe):
 * o mesmo layout do Entrar — identidade à esquerda, só o formulário à direita.
 */
export default function GuestLayout({ children, titulo, descricao }) {
    const { empresa } = usePage().props;

    return (
        <div className="flex min-h-screen flex-col bg-white text-ink lg:flex-row dark:bg-[#161A22] dark:text-[#F2F5FB]">
            <section className="flex flex-1 flex-col justify-between gap-8 bg-slate-100 px-6 py-8 sm:px-14 sm:py-12 dark:bg-slate-950">
                <div className="flex items-center gap-3">
                    <MarcaAquafuros className="h-11 w-11" />
                    <div className="flex flex-col">
                        <span className="text-[22px] font-extrabold">{empresa?.nome ?? "Aquafuros"}</span>
                        {empresa?.localizacao && <span className="text-[13px] text-slate-500 dark:text-slate-400">{empresa.localizacao}</span>}
                    </div>
                </div>
                <div className="hidden max-w-[520px] flex-col gap-[22px] sm:flex">
                    <Ilustracao nome="furo" largura={300} />
                    <h1 className="text-[40px] font-bold leading-[1.15] tracking-[-0.8px]">Toda a água do mês, num só sítio.</h1>
                    <div className="flex flex-wrap gap-2.5">
                        {PASSOS.map(([rotulo, Icone]) => (
                            <span key={rotulo} className="inline-flex items-center gap-2 rounded-full border border-[#DDE2EE] bg-white px-3.5 py-2 text-sm font-bold dark:border-slate-800 dark:bg-slate-900">
                                <Icone className="h-4 w-4 text-cyan-500 dark:text-cyan-400" aria-hidden="true" />
                                {rotulo}
                            </span>
                        ))}
                    </div>
                </div>
                <span className="hidden text-[13px] text-slate-500 sm:block dark:text-slate-400">Sistema desenvolvido pela RJM Consultórios e Serviços</span>
            </section>

            <main className="flex flex-1 items-center justify-center px-6 py-10 sm:p-12">
                <div className="flex w-full max-w-[420px] flex-col gap-6">
                    {titulo && (
                        <div className="flex flex-col gap-1.5">
                            <h2 className="text-[30px] font-bold tracking-[-0.5px]">{titulo}</h2>
                            {descricao && <p className="text-[15px] text-slate-600 dark:text-slate-300">{descricao}</p>}
                        </div>
                    )}
                    {children}
                </div>
            </main>
        </div>
    );
}
