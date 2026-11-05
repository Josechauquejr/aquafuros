import { Activity, Cog, Database, Gauge, ListChecks, Mail, ScrollText, Settings, SlidersHorizontal, UserCog } from "lucide-react";
import AppShell, { ConteudoDaPagina } from "@/Components/AppShell";

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
            ] },
        ],
    },
    {
        categoria: "Monitorização",
        subgrupos: [
            { nome: "Estado", items: [
                { label: "Diagnóstico", href: "/dev/saude", icon: Activity, activoEm: ["/dev/integridade", "/dev/analise"] },
            ] },
            { nome: "Registos", items: [
                { label: "Registos", href: "/dev/logs/acessos", icon: ScrollText, activoEm: ["/dev/logs", "/dev/actividade", "/dev/auditoria"] },
            ] },
        ],
    },
    {
        categoria: "Dados",
        subgrupos: [
            { nome: "Consulta", items: [
                { label: "Explorador de dados", href: "/dev/dados", icon: Database },
            ] },
        ],
    },
    {
        categoria: "Operações",
        subgrupos: [
            { nome: "Processamento", items: [
                { label: "Filas e jobs", href: "/dev/filas", icon: ListChecks },
                { label: "Emails", href: "/dev/emails", icon: Mail },
                { label: "Configuração de email", href: "/dev/email", icon: Settings },
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

// Shell persistente (ver `layout` em app.js): não remonta ao navegar entre páginas.
export function ShellDev({ header, children }) {
    return (
        <AppShell groups={navGroups} casa="/dev/painel" chaveRecolhido="aquafuros-dev-sidebar-collapsed" header={header}>
            {children}
        </AppShell>
    );
}

export default function DevLayout({ header, children }) {
    return <ConteudoDaPagina Shell={ShellDev} header={header}>{children}</ConteudoDaPagina>;
}
