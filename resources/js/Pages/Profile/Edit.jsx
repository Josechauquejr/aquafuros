import { Head, useForm, usePage } from "@inertiajs/react";
import { KeyRound, Save, ShieldAlert, Trash2, UserCircle } from "lucide-react";
import { useEffect, useState } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import DangerButton from "@/Components/DangerButton";
import InlineNotice from "@/Components/InlineNotice";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import Modal from "@/Components/Modal";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import StatusBadge from "@/Components/StatusBadge";
import TextInput from "@/Components/TextInput";
import { formatDate } from "@/lib/utils";

const roleConfig = {
    administrador: { label: "Administrador", tone: "cyan" },
    gestor: { label: "Gestor", tone: "emerald" },
    caixa: { label: "Caixa", tone: "amber" },
    tecnico: { label: "Técnico", tone: "slate" },
};

function iniciais(nome) {
    return (nome ?? "")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((parte) => parte[0]?.toUpperCase())
        .join("") || "?";
}

function CartaoCabecalho({ user, papel, delay }) {
    const role = roleConfig[papel] ?? { label: papel ?? "—", tone: "slate" };

    return (
        <AnimatedPanel delay={delay} className="p-6">
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-cyan-700 text-xl font-bold text-white">
                    {iniciais(user.name)}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-bold text-slate-950 dark:text-white">{user.name}</p>
                    <p className="truncate text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusBadge tone={role.tone}>{role.label}</StatusBadge>
                        {user.created_at && (
                            <span className="text-xs text-slate-400 dark:text-slate-500">
                                Membro desde {formatDate(user.created_at)}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </AnimatedPanel>
    );
}

function InformacoesConta({ user, mustVerifyEmail, status, delay }) {
    const [recentlySaved, setRecentlySaved] = useState(false);
    const form = useForm({
        name: user.name || "",
        email: user.email || "",
        telefone: user.telefone || "",
    });
    const verification = useForm({});

    useEffect(() => {
        if (status !== "profile-updated") return;
        setRecentlySaved(true);
        const timer = window.setTimeout(() => setRecentlySaved(false), 2500);
        return () => window.clearTimeout(timer);
    }, [status]);

    const submit = (event) => {
        event.preventDefault();
        form.patch("/profile", { preserveScroll: true });
    };

    const resendVerification = (event) => {
        event.preventDefault();
        verification.post("/email/verification-notification");
    };

    return (
        <AnimatedPanel delay={delay} className="p-6">
            <div className="flex items-center gap-2">
                <UserCircle className="h-5 w-5 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
                <h3 className="font-semibold text-slate-950 dark:text-white">Informações da conta</h3>
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Nome, contacto e endereço de email associados a esta conta.
            </p>

            <form onSubmit={submit} className="mt-6 max-w-xl space-y-4">
                <InlineNotice show={recentlySaved}>Perfil actualizado com sucesso.</InlineNotice>

                <div>
                    <InputLabel htmlFor="name" value="Nome" />
                    <TextInput
                        id="name"
                        value={form.data.name}
                        className="mt-1 block w-full"
                        autoComplete="name"
                        required
                        onChange={(event) => form.setData("name", event.target.value)}
                    />
                    <InputError message={form.errors.name} className="mt-1" />
                </div>

                {user.username && (
                    <div>
                        <InputLabel htmlFor="username" value="Nome de utilizador" />
                        <TextInput id="username" value={user.username} disabled className="mt-1 block w-full opacity-60" />
                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                            Usado para iniciar sessão — não pode ser alterado aqui.
                        </p>
                    </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <InputLabel htmlFor="email" value="Email" />
                        <TextInput
                            id="email"
                            type="email"
                            value={form.data.email}
                            className="mt-1 block w-full"
                            autoComplete="username"
                            required
                            onChange={(event) => form.setData("email", event.target.value)}
                        />
                        <InputError message={form.errors.email} className="mt-1" />
                    </div>
                    <div>
                        <InputLabel htmlFor="telefone" value="Telefone" />
                        <TextInput
                            id="telefone"
                            value={form.data.telefone}
                            className="mt-1 block w-full"
                            placeholder="84 000 0000"
                            onChange={(event) => form.setData("telefone", event.target.value)}
                        />
                        <InputError message={form.errors.telefone} className="mt-1" />
                    </div>
                </div>

                {mustVerifyEmail && !user.email_verified_at && (
                    <div className="text-sm text-slate-600 dark:text-slate-300">
                        O seu email ainda não foi verificado.
                        <button
                            type="button"
                            onClick={resendVerification}
                            className="ms-1 rounded-md text-sm text-cyan-700 underline hover:text-cyan-900 dark:text-cyan-300 dark:hover:text-cyan-100"
                        >
                            Reenviar email de verificação.
                        </button>
                        {status === "verification-link-sent" && (
                            <p className="mt-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                Um novo link de verificação foi enviado para o seu email.
                            </p>
                        )}
                    </div>
                )}

                <div className="flex justify-end pt-2">
                    <PrimaryButton disabled={form.processing}>
                        <Save className="h-4 w-4" aria-hidden="true" />
                        Guardar alterações
                    </PrimaryButton>
                </div>
            </form>
        </AnimatedPanel>
    );
}

function Seguranca({ status, delay }) {
    const [recentlySaved, setRecentlySaved] = useState(false);
    const form = useForm({ current_password: "", password: "", password_confirmation: "" });

    useEffect(() => {
        if (status !== "password-updated") return;
        setRecentlySaved(true);
        const timer = window.setTimeout(() => setRecentlySaved(false), 2500);
        return () => window.clearTimeout(timer);
    }, [status]);

    const submit = (event) => {
        event.preventDefault();
        form.put("/password", { preserveScroll: true, onSuccess: () => form.reset() });
    };

    return (
        <AnimatedPanel delay={delay} className="p-6">
            <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
                <h3 className="font-semibold text-slate-950 dark:text-white">Segurança</h3>
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Actualize a sua palavra-passe periodicamente para manter a conta segura.
            </p>

            <form onSubmit={submit} className="mt-6 max-w-xl space-y-4">
                <InlineNotice show={recentlySaved}>Palavra-passe actualizada com sucesso.</InlineNotice>

                <div>
                    <InputLabel htmlFor="current_password" value="Palavra-passe actual" />
                    <TextInput
                        id="current_password"
                        type="password"
                        value={form.data.current_password}
                        className="mt-1 block w-full"
                        autoComplete="current-password"
                        onChange={(event) => form.setData("current_password", event.target.value)}
                    />
                    <InputError message={form.errors.current_password} className="mt-1" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <InputLabel htmlFor="password" value="Nova palavra-passe" />
                        <TextInput
                            id="password"
                            type="password"
                            value={form.data.password}
                            className="mt-1 block w-full"
                            autoComplete="new-password"
                            onChange={(event) => form.setData("password", event.target.value)}
                        />
                        <InputError message={form.errors.password} className="mt-1" />
                    </div>
                    <div>
                        <InputLabel htmlFor="password_confirmation" value="Confirmar palavra-passe" />
                        <TextInput
                            id="password_confirmation"
                            type="password"
                            value={form.data.password_confirmation}
                            className="mt-1 block w-full"
                            autoComplete="new-password"
                            onChange={(event) => form.setData("password_confirmation", event.target.value)}
                        />
                        <InputError message={form.errors.password_confirmation} className="mt-1" />
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <PrimaryButton disabled={form.processing}>
                        <Save className="h-4 w-4" aria-hidden="true" />
                        Actualizar palavra-passe
                    </PrimaryButton>
                </div>
            </form>
        </AnimatedPanel>
    );
}

function ZonaPerigo({ delay }) {
    const [confirmando, setConfirmando] = useState(false);
    const form = useForm({ password: "" });

    const submit = (event) => {
        event.preventDefault();
        form.delete("/profile", {
            preserveScroll: true,
            onSuccess: () => setConfirmando(false),
            onFinish: () => form.reset(),
        });
    };

    return (
        <AnimatedPanel delay={delay} className="border-rose-200 p-6 dark:border-rose-900/60">
            <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-rose-600 dark:text-rose-400" aria-hidden="true" />
                <h3 className="font-semibold text-slate-950 dark:text-white">Zona de perigo</h3>
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Ao eliminar a conta, todos os dados associados são permanentemente removidos. Esta acção não
                pode ser desfeita.
            </p>

            <div className="mt-4">
                <DangerButton onClick={() => setConfirmando(true)}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Eliminar conta
                </DangerButton>
            </div>

            <Modal show={confirmando} onClose={() => setConfirmando(false)} title="Eliminar conta" maxWidth="md">
                <form onSubmit={submit} className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        Introduza a sua palavra-passe para confirmar que deseja eliminar permanentemente a sua
                        conta.
                    </p>
                    <div>
                        <InputLabel htmlFor="delete_password" value="Palavra-passe" />
                        <TextInput
                            id="delete_password"
                            type="password"
                            value={form.data.password}
                            className="mt-1 block w-full"
                            placeholder="Palavra-passe"
                            onChange={(event) => form.setData("password", event.target.value)}
                        />
                        <InputError message={form.errors.password} className="mt-1" />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <SecondaryButton type="button" onClick={() => setConfirmando(false)}>
                            Cancelar
                        </SecondaryButton>
                        <DangerButton type="submit" disabled={form.processing}>
                            Eliminar conta
                        </DangerButton>
                    </div>
                </form>
            </Modal>
        </AnimatedPanel>
    );
}

export default function Edit({ user, mustVerifyEmail }) {
    const { flash, auth } = usePage().props;
    const papel = auth.roles?.[0];

    return (
        <AdminLayout
            header={
                <div>
                    <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">
                        Conta
                    </p>
                    <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">Perfil</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Dados pessoais, segurança e preferências da sua conta.
                    </p>
                </div>
            }
        >
            <Head title="Perfil" />

            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-3xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <CartaoCabecalho user={user} papel={papel} delay={0} />
                    <InformacoesConta user={user} mustVerifyEmail={mustVerifyEmail} status={flash.status} delay={0.08} />
                    <Seguranca status={flash.status} delay={0.16} />
                    <ZonaPerigo delay={0.24} />
                </div>
            </div>
        </AdminLayout>
    );
}
