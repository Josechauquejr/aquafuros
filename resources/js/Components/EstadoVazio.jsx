import Ilustracao from "@/Components/Ilustracao";
import { cn } from "@/lib/utils";

/** Estado vazio útil: ilustração, o porquê e o próximo passo (nunca só "0"). */
export default function EstadoVazio({ ilustracao = "pesquisa", titulo, children, accoes, className = "" }) {
    return (
        <div className={cn("flex flex-col items-center gap-2.5 px-6 py-12 text-center", className)}>
            <Ilustracao nome={ilustracao} largura={160} />
            {titulo && <strong className="text-[17px] text-ink dark:text-[#F2F5FB]">{titulo}</strong>}
            {children && <p className="max-w-[460px] text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">{children}</p>}
            {accoes && <div className="mt-2 flex flex-wrap justify-center gap-2.5">{accoes}</div>}
        </div>
    );
}
