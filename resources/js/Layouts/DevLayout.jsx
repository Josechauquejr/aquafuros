import { Activity, BarChart3, ClipboardList, Cog, Database, ListChecks, Mail, PencilLine, ShieldAlert, Gauge, ScrollText, ShieldCheck, SlidersHorizontal, Terminal, UserCog } from "lucide-react";
import AppShell from "@/Components/AppShell";

// Área exclusiva do Desenvolvedor — sidebar totalmente separada da do
// AdminLayout (nenhum item partilhado), reflectindo o isolamento também
// aplicado nas rotas: o developer não vê nem acede às páginas do
// administrador/gestor/caixa/técnico, e vice-versa.
const navGroups = [
    {
        categoria: "Geral",
        subgrupos: [
            { nome: "Painel", items: [
                { label: "Página Principal", href: "/dev/painel", icon: Gauge },
                { label: "Checklist", href: "/dev/tarefas", icon: ClipboardList },
            ] },
        ],
    },
    {
        categoria: "Monitorização",
        subgrupos: [
            { nome: "Estado", items: [
                { label: "Saúde do sistema", href: "/dev/saude", icon: Activity },
            ] },
            { nome: "Registos", items: [
                { label: "Logs Técnicos", href: "/dev/logs/acessos", icon: Terminal },
                { label: "Registo de Actividade", href: "/dev/actividade", icon: ScrollText },
                { label: "Auditoria do painel", href: "/dev/auditoria", icon: ShieldCheck },
            ] },
        ],
    },
    {
        categoria: "Dados",
        subgrupos: [
            { nome: "Consulta", items: [
                { label: "Explorador de dados", href: "/dev/dados", icon: Database },
                { label: "Análise de dados", href: "/dev/analise", icon: BarChart3 },
            ] },
            { nome: "Qualidade", items: [
                { label: "Integridade dos dados", href: "/dev/integridade", icon: ShieldAlert },
                { label: "Alterações", href: "/dev/alteracoes", icon: PencilLine },
            ] },
        ],
    },
    {
        categoria: "Operações",
        subgrupos: [
            { nome: "Processamento", items: [
                { label: "Filas e jobs", href: "/dev/filas", icon: ListChecks },
                { label: "Emails", href: "/dev/emails", icon: Mail },
            ] },
            { nome: "Sistema", items: [
                { label: "Operações do sistema", href: "/dev/operacoes", icon: Cog },
            ] },
        ],
    },
    {
        categoria: "Administração",
        subgrupos: [
            { nome: "Acesso", items: [
                { label: "Gestão de Usuários", href: "/dev/users", icon: UserCog },
            ] },
            { nome: "Configuração", items: [
                { label: "Configurações do Sistema", href: "/dev/configuracoes", icon: SlidersHorizontal },
            ] },
        ],
    },
];

export default function DevLayout({ header, children }) {
    return (
        <AppShell groups={navGroups} casa="/dev/painel" chaveRecolhido="aquafuros-dev-sidebar-collapsed" header={header}>
            {children}
        </AppShell>
    );
}
