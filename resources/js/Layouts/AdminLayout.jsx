import { usePage } from "@inertiajs/react";
import { Banknote, Bell, BellRing, Droplets, FileText, Hammer, HandCoins, House, Mail, MapPin, PieChart, QrCode, Settings, SlidersHorizontal, Trash2, Users, Waves } from "lucide-react";
import AppShell from "@/Components/AppShell";

const navGroups = [
    { categoria: "Geral", items: [
        { label: "Página Principal", href: "/dashboard", icon: House },
        { label: "Notificações do sistema", href: "/notificacoes-sistema", icon: Bell, roles: ["administrador", "gestor"] },
    ] },
    { categoria: "Facturação e Clientes", items: [
        { label: "Clientes", href: "/clientes", icon: Users, roles: ["administrador", "gestor"] },
        { label: "Leituras", href: "/leituras", icon: Waves, roles: ["administrador", "gestor", "tecnico"] },
        { label: "Facturas", href: "/facturas", icon: FileText, roles: ["administrador", "gestor"] },
        { label: "Pagamentos", href: "/pagamentos", icon: Banknote, roles: ["administrador", "gestor", "caixa"] },
        { label: "Ler QR Code", href: "/ler-qr", icon: QrCode, roles: ["administrador", "gestor", "caixa"] },
    ] },
    { categoria: "Cobrança e operação", items: [
        { label: "Cobrança", href: "/cobranca", icon: HandCoins, roles: ["administrador", "gestor"] },
        { label: "Ocorrências", href: "/ocorrencias", icon: Hammer, roles: ["administrador", "gestor", "tecnico"] },
        { label: "Produção de água", href: "/producao", icon: Droplets, roles: ["administrador", "gestor", "tecnico"] },
    ] },
    { categoria: "Email", items: [
        { label: "Emails de cobrança", href: "/notificacoes", icon: BellRing, roles: ["administrador", "gestor"] },
        { label: "Emails enviados", href: "/emails", icon: Mail, roles: ["administrador", "gestor"] },
        { label: "Configuração de email", href: "/admin/email", icon: Settings, roles: ["administrador"] },
    ] },
    { categoria: "Administração", items: [
        { label: "KPIs", href: "/admin/kpis", icon: PieChart, roles: ["administrador", "gestor"] },
        { label: "Zonas", href: "/zonas", icon: MapPin, roles: ["administrador"] },
        { label: "Valores e Regras", href: "/tarifas", icon: SlidersHorizontal, roles: ["administrador"] },
        { label: "Lixeira", href: "/lixeira", icon: Trash2, roles: ["administrador"] },
    ] },
];

function gruposVisiveis(roles) {
    return navGroups.map((grupo) => ({ ...grupo, items: grupo.items.filter((item) => !item.roles || item.roles.some((papel) => roles.includes(papel))) })).filter((grupo) => grupo.items.length > 0);
}

export default function AdminLayout({ header, children }) {
    const { auth } = usePage().props;
    return <AppShell groups={gruposVisiveis(auth.roles ?? [])} casa="/dashboard" chaveRecolhido="aquafuros-sidebar-collapsed" header={header}>{children}</AppShell>;
}
