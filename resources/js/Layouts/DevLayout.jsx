import { ClipboardList, Gauge, ScrollText, SlidersHorizontal, Terminal, UserCog } from "lucide-react";
import AppShell from "@/Components/AppShell";

// Área exclusiva do Desenvolvedor — sidebar totalmente separada da do
// AdminLayout (nenhum item partilhado), reflectindo o isolamento também
// aplicado nas rotas: o developer não vê nem acede às páginas do
// administrador/gestor/caixa/técnico, e vice-versa.
const navGroups = [
    {
        categoria: "Geral",
        items: [{ label: "Página Principal", href: "/dev/painel", icon: Gauge }],
    },
    {
        categoria: "Sistema",
        items: [
            { label: "Gestão de Usuários", href: "/dev/users", icon: UserCog },
            { label: "Configurações do Sistema", href: "/dev/configuracoes", icon: SlidersHorizontal },
            { label: "Registo de Actividade", href: "/dev/actividade", icon: ScrollText },
            { label: "Logs Técnicos", href: "/dev/logs/acessos", icon: Terminal },
        ],
    },
    {
        categoria: "Produtividade",
        items: [{ label: "Checklist", href: "/dev/tarefas", icon: ClipboardList }],
    },
];

export default function DevLayout({ header, children }) {
    return (
        <AppShell groups={navGroups} casa="/dev/painel" chaveRecolhido="aquafuros-dev-sidebar-collapsed" header={header}>
            {children}
        </AppShell>
    );
}
