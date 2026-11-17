import { cn } from "@/lib/utils";

// O gradiente ocupa sempre a barra inteira e é recortado à percentagem: a cor
// do fim só aparece perto dos 100% (gradiente de objectivo). No escuro, tons claros.
const GRADIENTES = {
    azul: "bg-[linear-gradient(90deg,#6EA2FF_0%,#0059FF_55%,#041A53_100%)] dark:bg-[linear-gradient(90deg,#9DBBFF_0%,#6EA2FF_50%,#0059FF_100%)]",
    ambar: "bg-[linear-gradient(90deg,#F0A93B_0%,#B86A00_60%,#8A4F00_100%)] dark:bg-[linear-gradient(90deg,#F8DCA6_0%,#F3C77A_60%,#E0A040_100%)]",
};

export default function BarraProgresso({ pct = 0, cor = "azul", className = "h-1.5", fundo = "bg-[#E8ECF4] dark:bg-slate-800", rotulo }) {
    const valor = Math.max(0, Math.min(100, Number(pct) || 0));
    return (
        <div
            className={cn("overflow-hidden rounded-full", fundo, className)}
            role={rotulo ? "img" : undefined}
            aria-label={rotulo}
            aria-hidden={rotulo ? undefined : true}
        >
            <div className={cn("h-full w-full rounded-full", GRADIENTES[cor] ?? GRADIENTES.azul)} style={{ clipPath: `inset(0 calc(100% - ${valor}%) 0 0 round 99px)` }} />
        </div>
    );
}
