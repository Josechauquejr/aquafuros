import { Head } from "@inertiajs/react";
import {
    Pencil,
    Plus,
    Search,
    Shield,
    ShieldCheck,
    UserCheck,
    Users as UsersIcon,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import AnimatedButton from "@/Components/AnimatedButton";
import AnimatedPanel from "@/Components/AnimatedPanel";
import IconButton from "@/Components/IconButton";
import StatusBadge from "@/Components/StatusBadge";
import TextInput from "@/Components/TextInput";
import { cn } from "@/lib/utils";
import { itemVariants, listVariants } from "@/lib/motion";

const roleConfig = {
    administrador: { label: "Administrador", tone: "rose" },
    gestor: { label: "Gestor", tone: "cyan" },
    caixa: { label: "Caixa", tone: "amber" },
    tecnico: { label: "Técnico", tone: "emerald" },
};

const usuarios = [
    { nome: "Admin", username: "admin", email: "admin@aquafuros.local", role: "administrador", activo: true, ultimoAcesso: "2026-08-31 08:12" },
    { nome: "Célia Machel", username: "celia.machel", email: "celia.machel@aquafuros.local", role: "caixa", activo: true, ultimoAcesso: "2026-08-31 07:40" },
    { nome: "Ivan Mondlane", username: "ivan.mondlane", email: "ivan.mondlane@aquafuros.local", role: "caixa", activo: true, ultimoAcesso: "2026-08-30 16:05" },
    { nome: "Graça Simbine", username: "graca.simbine", email: "graca.simbine@aquafuros.local", role: "gestor", activo: true, ultimoAcesso: "2026-08-31 09:22" },
    { nome: "Sérgio Nhaca", username: "sergio.nhaca", email: "sergio.nhaca@aquafuros.local", role: "tecnico", activo: true, ultimoAcesso: "2026-08-29 14:10" },
    { nome: "Belinda Chauque", username: "belinda.chauque", email: "belinda.chauque@aquafuros.local", role: "tecnico", activo: false, ultimoAcesso: "2026-07-18 11:03" },
    { nome: "Rui Matsimbe", username: "rui.matsimbe", email: "rui.matsimbe@aquafuros.local", role: "gestor", activo: true, ultimoAcesso: "2026-08-28 10:47" },
];

export default function Index() {
    const [search, setSearch] = useState("");
    const [roleFiltro, setRoleFiltro] = useState("todos");

    const filtrados = useMemo(() => {
        return usuarios.filter((user) => {
            const termo = search.trim().toLowerCase();
            const correspondeTermo =
                !termo ||
                user.nome.toLowerCase().includes(termo) ||
                user.username.toLowerCase().includes(termo) ||
                user.email.toLowerCase().includes(termo);
            const correspondeRole = roleFiltro === "todos" || user.role === roleFiltro;
            return correspondeTermo && correspondeRole;
        });
    }, [search, roleFiltro]);

    const activos = usuarios.filter((u) => u.activo).length;
    const administradores = usuarios.filter((u) => u.role === "administrador").length;

    const metrics = [
        { label: "Total de usuários", value: usuarios.length, icon: UsersIcon, tone: "cyan" },
        { label: "Usuários activos", value: activos, icon: UserCheck, tone: "emerald" },
        { label: "Administradores", value: administradores, icon: ShieldCheck, tone: "rose" },
        { label: "Perfis distintos", value: Object.keys(roleConfig).length, icon: Shield, tone: "amber" },
    ];

    return (
        <AdminLayout
            header={
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">
                            Controlo de acesso
                        </p>
                        <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">
                            Gestão de Usuários
                        </h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Contas com acesso ao sistema e respectivas funções.
                        </p>
                    </div>
                    <AnimatedButton
                        variant="primary"
                        disabled
                        title="Formulário de criação em desenvolvimento"
                    >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        Novo usuário
                    </AnimatedButton>
                </div>
            }
        >
            <Head title="Usuários" />

            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {metrics.map((metric, index) => {
                            const Icon = metric.icon;
                            const tones = {
                                cyan: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
                                emerald:
                                    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
                                rose: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
                                amber: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
                            };

                            return (
                                <AnimatedPanel key={metric.label} delay={index * 0.06}>
                                    <div className="flex items-start justify-between p-5">
                                        <div>
                                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                                {metric.label}
                                            </p>
                                            <p className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">
                                                {metric.value}
                                            </p>
                                        </div>
                                        <div
                                            className={cn(
                                                "flex h-11 w-11 items-center justify-center rounded-md",
                                                tones[metric.tone],
                                            )}
                                        >
                                            <Icon className="h-5 w-5" aria-hidden="true" />
                                        </div>
                                    </div>
                                </AnimatedPanel>
                            );
                        })}
                    </section>

                    <AnimatedPanel delay={0.2} className="p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <div className="relative flex-1">
                                <Search
                                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                                    aria-hidden="true"
                                />
                                <TextInput
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Pesquisar por nome, username ou email..."
                                    className="w-full pl-9"
                                />
                            </div>
                            <select
                                value={roleFiltro}
                                onChange={(event) => setRoleFiltro(event.target.value)}
                                className="rounded-md border-slate-300 bg-white text-sm text-slate-950 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            >
                                <option value="todos">Todas as funções</option>
                                <option value="administrador">Administrador</option>
                                <option value="gestor">Gestor</option>
                                <option value="caixa">Caixa</option>
                                <option value="tecnico">Técnico</option>
                            </select>
                        </div>
                    </AnimatedPanel>

                    {filtrados.length === 0 ? (
                        <AnimatedPanel delay={0.28}>
                            <p className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                                Nenhum usuário encontrado para os filtros seleccionados.
                            </p>
                        </AnimatedPanel>
                    ) : (
                        <>
                            {/* Cartões — visíveis apenas em telas pequenas (mobile) */}
                            <motion.div
                                variants={listVariants}
                                initial="hidden"
                                animate="show"
                                className="space-y-3 sm:hidden"
                            >
                                {filtrados.map((user) => {
                                    const role = roleConfig[user.role];
                                    const iniciais = user.nome.split(" ").map((p) => p[0]).slice(0, 2).join("");

                                    return (
                                        <motion.div
                                            key={user.username}
                                            variants={itemVariants}
                                            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-sm font-semibold text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                                                        {iniciais}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-900 dark:text-white">
                                                            {user.nome}
                                                        </p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                                            @{user.username}
                                                        </p>
                                                    </div>
                                                </div>
                                                <StatusBadge tone={user.activo ? "emerald" : "slate"}>
                                                    {user.activo ? "Activo" : "Inactivo"}
                                                </StatusBadge>
                                            </div>

                                            <div className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                                                <p>{user.email}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                                    Último acesso: {user.ultimoAcesso}
                                                </p>
                                            </div>

                                            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                                                <StatusBadge tone={role.tone}>{role.label}</StatusBadge>
                                                <IconButton title="Editar usuário">
                                                    <Pencil className="h-4 w-4" aria-hidden="true" />
                                                </IconButton>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </motion.div>

                            {/* Tabela — visível a partir de sm (tablet/desktop) */}
                            <AnimatedPanel delay={0.28} className="hidden overflow-hidden sm:block">
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[860px] text-left text-sm">
                                        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                                            <tr>
                                                <th className="px-6 py-3">Usuário</th>
                                                <th className="px-6 py-3">Email</th>
                                                <th className="px-6 py-3">Função</th>
                                                <th className="px-6 py-3">Estado</th>
                                                <th className="px-6 py-3">Último acesso</th>
                                                <th className="px-6 py-3 text-right">Acções</th>
                                            </tr>
                                        </thead>
                                        <motion.tbody
                                            variants={listVariants}
                                            initial="hidden"
                                            animate="show"
                                            className="divide-y divide-slate-100 dark:divide-slate-800"
                                        >
                                            {filtrados.map((user) => {
                                                const role = roleConfig[user.role];

                                                return (
                                                    <motion.tr
                                                        key={user.username}
                                                        variants={itemVariants}
                                                        className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                                    >
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-50 text-sm font-semibold text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                                                                    {user.nome
                                                                        .split(" ")
                                                                        .map((p) => p[0])
                                                                        .slice(0, 2)
                                                                        .join("")}
                                                                </div>
                                                                <div>
                                                                    <p className="font-semibold text-slate-900 dark:text-white">
                                                                        {user.nome}
                                                                    </p>
                                                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                                                        @{user.username}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                                                            {user.email}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <StatusBadge tone={role.tone}>{role.label}</StatusBadge>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <StatusBadge tone={user.activo ? "emerald" : "slate"}>
                                                                {user.activo ? "Activo" : "Inactivo"}
                                                            </StatusBadge>
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                                                            {user.ultimoAcesso}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <IconButton title="Editar usuário">
                                                                <Pencil className="h-4 w-4" aria-hidden="true" />
                                                            </IconButton>
                                                        </td>
                                                    </motion.tr>
                                                );
                                            })}
                                        </motion.tbody>
                                    </table>
                                </div>
                            </AnimatedPanel>
                        </>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
