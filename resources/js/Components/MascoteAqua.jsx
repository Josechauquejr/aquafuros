import Mascote from "@/Components/Aqua/Mascote";

/** Compatibilidade: a mascote antiga passa a ser a gota animada da Aqua. */
export default function MascoteAqua({ pequeno = false, humor = "ola", className = "" }) {
    return <Mascote humor={humor} tamanho={pequeno ? 32 : 44} className={className} />;
}
