import { Head, Link, usePage } from "@inertiajs/react";
import { ArrowLeft, House, RotateCcw } from "lucide-react";
import Ilustracao from "@/Components/Ilustracao";

// Cada erro com ilustração, o porquê (sem culpar quem usa) e 2 caminhos.
const ERROS = {
    403: { ilustracao: "bloqueado", titulo: "Sem permissão para esta página", texto: "O seu perfil não tem acesso a esta área. Se precisa dela, peça ao administrador." },
    404: { ilustracao: "pesquisa", titulo: "Esta página não existe", texto: "O endereço pode estar errado ou o registo foi removido." },
    500: { ilustracao: "erro", titulo: "Algo correu mal do nosso lado", texto: "Não foi nada que tenha feito. Tente outra vez daqui a pouco; se continuar, envie o código abaixo ao desenvolvedor." },
    503: { ilustracao: "erro", titulo: "O sistema está em manutenção", texto: "Voltamos dentro de momentos. Os seus dados estão guardados." },
};

export default function Erro({ estado = 500, codigo }) {
    const { auth } = usePage().props;
    const erro = ERROS[estado] ?? ERROS[500];
    const casa = auth?.user ? "/dashboard" : "/";

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 dark:bg-slate-950">
            <Head title={erro.titulo} />
            <div className="flex w-full max-w-[480px] flex-col items-center gap-3 rounded-[24px] bg-white px-6 pb-6 pt-8 text-center shadow-[0_24px_60px_rgba(3,9,35,0.16)] dark:bg-[#161A22]">
                <Ilustracao nome={erro.ilustracao} largura={170} />
                <h1 className="text-xl font-bold text-ink dark:text-[#F2F5FB]">{erro.titulo}</h1>
                <p className="text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">{erro.texto}</p>
                {codigo && (
                    <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-[#1E232D] dark:text-slate-300">
                        Código: <strong className="font-mono text-ink dark:text-[#F2F5FB]">{codigo}</strong>
                    </p>
                )}
                <div className="mt-2 grid w-full grid-cols-2 gap-2.5">
                    <button
                        type="button"
                        onClick={() => (estado >= 500 ? window.location.reload() : window.history.back())}
                        className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[14px] border border-[#DDE2EE] bg-white text-sm font-bold text-ink hover:bg-slate-50 dark:border-slate-700 dark:bg-[#1E232D] dark:text-[#F2F5FB]"
                    >
                        {estado >= 500 ? <RotateCcw className="h-[18px] w-[18px]" aria-hidden="true" /> : <ArrowLeft className="h-[18px] w-[18px]" aria-hidden="true" />}
                        {estado >= 500 ? "Tentar outra vez" : "Voltar"}
                    </button>
                    <Link href={casa} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[14px] bg-brand text-sm font-bold text-white hover:bg-brand-hover dark:bg-cyan-500">
                        <House className="h-[18px] w-[18px]" aria-hidden="true" />
                        Ir para o Painel
                    </Link>
                </div>
            </div>
        </div>
    );
}
