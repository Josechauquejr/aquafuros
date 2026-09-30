import { usePage } from "@inertiajs/react";
import { Banknote, FileText, Gauge, PieChart, QrCode, SlidersHorizontal, Users, Waves } from "lucide-react";
import AppShell from "@/Components/AppShell";

// Layout partilhado por administrador, gestor, caixa e técnico — o
// desenvolvedor usa o DevLayout, totalmente à parte (nem partilha itens de
// menu, nem rotas). `roles: undefined` = visível a qualquer um destes
// quatro papéis. Espelha exactamente o gating de `role:` já aplicado às
// rotas em routes/web.php — evita mostrar um link que devolveria 403.
const navGroups = [
    {
        categoria: "Geral",
        items: [{ label: "Página Principal", href: "/dashboard", icon: Gauge }],
    },
    {
        categoria: "Facturação e Clientes",
        items: [
            { label: "Clientes", href: "/clientes", icon: Users, roles: ["administrador", "gestor"] },
            { label: "Leituras", href: "/leituras", icon: Waves, roles: ["administrador", "gestor", "tecnico"] },
            { label: "Facturas", href: "/facturas", icon: FileText, roles: ["administrador", "gestor"] },
            { label: "Pagamentos", href: "/pagamentos", icon: Banknote, roles: ["administrador", "gestor", "caixa"] },
            { label: "Ler QR Code", href: "/ler-qr", icon: QrCode, roles: ["administrador", "gestor", "caixa"] },
        ],
    },
    {
        categoria: "Administração",
        items: [
            { label: "KPIs", href: "/admin/kpis", icon: PieChart, roles: ["administrador"] },
            { label: "Valores e Regras", href: "/tarifas", icon: SlidersHorizontal, roles: ["administrador"] },
        ],
    },
];

function gruposVisiveis(roles) {
    return navGroups
        .map((grupo) => ({
            ...grupo,
            items: grupo.items.filter((item) => !item.roles || item.roles.some((papel) => roles.includes(papel))),
        }))
        .filter((grupo) => grupo.items.length > 0);
}

export default function AdminLayout({ header, children }) {
    const { auth } = usePage().props;

    return (
        <AppShell
            groups={gruposVisiveis(auth.roles ?? [])}
            casa="/dashboard"
            chaveRecolhido="aquafuros-sidebar-collapsed"
            header={header}
        >
            {children}
        </AppShell>
    );
}
