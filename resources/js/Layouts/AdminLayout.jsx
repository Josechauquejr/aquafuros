import { usePage } from "@inertiajs/react";
import { ChartLine, Container, FileText, Gauge, House, Map, Phone, Tag, Trash2, UserPlus, Users, Wallet, Wrench } from "lucide-react";
import AppShell, { ConteudoDaPagina } from "@/Components/AppShell";

// Menu pela ordem do ciclo do mês (modelo mental do operador): Hoje → Ciclo do
// mês → Terreno → Cadastro → Análise → Configuração. 6 grupos, máx. 4 itens.
// Saíram do menu: Notificações (estão no Painel), Leituras estimadas (separador
// dentro de Leituras), Ler QR (botão na barra de topo) e Emails de autenticação.
const navGroups = [
    { categoria: "Hoje", items: [
        { label: "Painel", href: "/dashboard", icon: House, activoEm: ["/notificacoes-sistema"], badge: "alertas" },
    ] },
    { categoria: "Ciclo do mês", items: [
        { label: "Leituras", href: "/leituras", icon: Gauge, activoEm: ["/leituras-estimadas"], badge: "leituras", roles: ["administrador", "gestor", "tecnico"] },
        { label: "Facturas", href: "/facturas", icon: FileText, roles: ["administrador", "gestor"] },
        { label: "Caixa", href: "/pagamentos", icon: Wallet, activoEm: ["/creditos", "/ler-qr"], roles: ["administrador", "gestor", "caixa"] },
        { label: "Cobrança", href: "/cobranca", icon: Phone, roles: ["administrador", "gestor"] },
    ] },
    { categoria: "Terreno", items: [
        { label: "Ocorrências", href: "/ocorrencias", icon: Wrench, roles: ["administrador", "gestor", "tecnico"] },
        { label: "Produção de água", href: "/producao", icon: Container, roles: ["administrador", "gestor", "tecnico"] },
    ] },
    { categoria: "Cadastro", items: [
        { label: "Clientes", href: "/clientes", icon: Users, roles: ["administrador", "gestor"] },
        { label: "Zonas", href: "/zonas", icon: Map, roles: ["administrador"] },
    ] },
    { categoria: "Análise", items: [
        { label: "Indicadores", href: "/admin/kpis", icon: ChartLine, roles: ["administrador", "gestor"] },
    ] },
    { categoria: "Configuração", items: [
        { label: "Tarifas e regras", href: "/tarifas", icon: Tag, roles: ["administrador"] },
        { label: "Lixeira", href: "/lixeira", icon: Trash2, roles: ["administrador"] },
    ] },
];

// "+ Novo" da barra de topo: as 5 acções mais usadas, com teclas de atalho.
const accoesNovo = [
    { label: "Receber pagamento", tecla: "P", href: "/pagamentos", icon: Wallet, roles: ["administrador", "gestor", "caixa"] },
    { label: "Registar leitura", tecla: "L", href: "/leituras", icon: Gauge, roles: ["administrador", "gestor", "tecnico"] },
    { label: "Novo cliente", tecla: "N", href: "/clientes", icon: UserPlus, roles: ["administrador", "gestor"] },
    { label: "Factura avulsa", tecla: "F", href: "/facturas", icon: FileText, roles: ["administrador", "gestor"] },
    { label: "Registar produção", href: "/producao", icon: Container, abre: false, roles: ["administrador", "gestor", "tecnico"] },
];

const permitido = (roles) => (item) => !item.roles || item.roles.some((papel) => roles.includes(papel));

function gruposVisiveis(roles, contadores) {
    return navGroups
        .map((grupo) => ({
            ...grupo,
            items: grupo.items.filter(permitido(roles)).map((item) => ({ ...item, badge: contadores[item.badge] ?? "" })),
        }))
        .filter((grupo) => grupo.items.length > 0);
}

// Pesquisa do topo: cada papel procura onde pode entrar.
function pesquisaPara(roles) {
    const pode = (...papeis) => papeis.some((papel) => roles.includes(papel));
    if (pode("administrador", "gestor")) {
        return {
            placeholder: "Procurar cliente, factura ou recibo",
            destino: (termo) => (/^fat/i.test(termo) ? "/facturas" : /^(rec|pag)/i.test(termo) ? "/pagamentos" : "/clientes"),
        };
    }
    if (pode("caixa")) return { placeholder: "Procurar cliente ou recibo", destino: () => "/pagamentos" };
    if (pode("tecnico")) return { placeholder: "Procurar cliente para ler", destino: () => "/leituras" };
    return null;
}

// Shell persistente (ver `layout` em app.js): não remonta ao navegar entre páginas.
export function ShellAdmin({ header, children }) {
    const { auth, ciclo, alertasPendentes } = usePage().props;
    const roles = auth.roles ?? [];
    const contadores = {
        alertas: alertasPendentes > 0 ? String(alertasPendentes) : "",
        leituras: ciclo && ciclo.clientes > 0 && ciclo.lidas < ciclo.clientes ? `${ciclo.lidas}/${ciclo.clientes}` : "",
    };

    return (
        <AppShell
            groups={gruposVisiveis(roles, contadores)}
            casa="/dashboard"
            chaveRecolhido="aquafuros-sidebar-collapsed"
            header={header}
            accoesNovo={accoesNovo.filter(permitido(roles))}
            pesquisa={pesquisaPara(roles)}
            lerQr={roles.some((papel) => ["administrador", "gestor", "caixa"].includes(papel))}
        >
            {children}
        </AppShell>
    );
}

export default function AdminLayout({ header, children }) {
    return <ConteudoDaPagina Shell={ShellAdmin} header={header}>{children}</ConteudoDaPagina>;
}
