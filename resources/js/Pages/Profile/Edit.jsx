import { Head, useForm, usePage } from "@inertiajs/react";
import { ChevronDown, KeyRound, Pencil, Save, ShieldAlert, Trash2, UserCircle, X } from "lucide-react";
import { useState } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import DevLayout from "@/Layouts/DevLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import DangerButton from "@/Components/DangerButton";
import FuseButton from "@/Components/FuseButton";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import Modal from "@/Components/Modal";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import StatusBadge from "@/Components/StatusBadge";
import TextInput from "@/Components/TextInput";
import { cn, formatDate } from "@/lib/utils";

const roleConfig = {
    administrador: { label: "Administrador", tone: "cyan" },
    gestor: { label: "Gestor", tone: "emerald" },
    caixa: { label: "Caixa", tone: "amber" },
    tecnico: { label: "Técnico", tone: "slate" },
    desenvolvedor: { label: "Desenvolvedor", tone: "slate" },
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

// Cada secção do perfil é um bloco à parte, numerado, com a sua própria acção
// de gravar — assim nunca se grava uma coisa ao mexer noutra.
function Seccao({ id, numero, icone: Icone, titulo, descricao, tom = "cyan", delay, children, className }) {
    const perigo = tom === "rose";

    return (
        <AnimatedPanel delay={delay} className={cn("p-6", className)}>
            <section id={id} className="scroll-mt-24" aria-labelledby={`${id}-titulo`}>
                <div className="flex items-center gap-3">
                    <span
                        className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                            perigo
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                : "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300",
                        )}
                        aria-hidden="true"
                    >
                        {numero}
                    </span>
                    <div>
                        <h3 id={`${id}-titulo`} className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
                            <Icone
                                className={cn("h-4 w-4", perigo ? "text-rose-600 dark:text-rose-400" : "text-cyan-700 dark:text-cyan-300")}
                                aria-hidden="true"
                            />
                            {titulo}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{descricao}</p>
                    </div>
                </div>
                {children}
            </section>
        </AnimatedPanel>
    );
}

function InformacoesConta({ user, mustVerifyEmail, status, delay }) {
    // Os campos ficam bloqueados até carregar em "Editar dados" — evita
    // alterações acidentais só por tocar num campo.
    const [aEditar, setAEditar] = useState(false);
    const form = useForm({
        name: user.name || "",
        email: user.email || "",
        telefone: user.telefone || "",
        current_password: "",
    });
    const verification = useForm({});
    const mudouEmail = form.data.email.trim().toLowerCase() !== (user.email ?? "").toLowerCase();
    const alterado = form.data.name !== (user.name ?? "") || form.data.telefone !== (user.telefone ?? "") || mudouEmail;

    const cancelar = () => {
        form.reset();
        form.clearErrors();
        setAEditar(false);
    };

    const submit = (event) => {
        event.preventDefault();
        form.patch("/profile", {
            preserveScroll: true,
            onSuccess: () => {
                form.reset("current_password");
                setAEditar(false);
            },
            onError: () => form.reset("current_password"),
        });
    };

    const resendVerification = (event) => {
        event.preventDefault();
        verification.post("/email/verification-notification");
    };

    return (
        <Seccao
            id="dados"
            numero="1"
            icone={UserCircle}
            titulo="Dados pessoais"
            descricao="Nome, contacto e endereço de email associados a esta conta."
            delay={delay}
        >
            <form onSubmit={submit} className="mt-6 max-w-xl space-y-4">
                <div>
                    <InputLabel htmlFor="name" value="Nome" />
                    <TextInput
                        id="name"
                        value={form.data.name}
                        className="mt-1 block w-full disabled:opacity-70"
                        autoComplete="name"
                        required
                        disabled={!aEditar}
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
                            className="mt-1 block w-full disabled:opacity-70"
                            autoComplete="username"
                            required
                            disabled={!aEditar}
                            onChange={(event) => form.setData("email", event.target.value)}
                        />
                        <InputError message={form.errors.email} className="mt-1" />
                    </div>
                    <div>
                        <InputLabel htmlFor="telefone" value="Telefone" />
                        <TextInput
                            id="telefone"
                            value={form.data.telefone}
                            className="mt-1 block w-full disabled:opacity-70"
                            placeholder="84 000 0000"
                            disabled={!aEditar}
                            onChange={(event) => form.setData("telefone", event.target.value)}
                        />
                        <InputError message={form.errors.telefone} className="mt-1" />
                    </div>
                </div>

                {aEditar && mudouEmail && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                        <InputLabel htmlFor="confirmar_email_senha" value="Palavra-passe actual (obrigatória para mudar o email)" />
                        <TextInput
                            id="confirmar_email_senha"
                            type="password"
                            value={form.data.current_password}
                            className="mt-1 block w-full"
                            autoComplete="current-password"
                            onChange={(event) => form.setData("current_password", event.target.value)}
                        />
                        <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
                            O novo email terá de ser verificado de novo.
                        </p>
                        <InputError message={form.errors.current_password} className="mt-1" />
                    </div>
                )}

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

                <div className="flex justify-end gap-3 pt-2">
                    {aEditar ? (
                        <>
                            <SecondaryButton type="button" onClick={cancelar}>
                                <X className="h-4 w-4" aria-hidden="true" />
                                Cancelar
                            </SecondaryButton>
                            <PrimaryButton disabled={form.processing || !alterado || (mudouEmail && !form.data.current_password)}>
                                <Save className="h-4 w-4" aria-hidden="true" />
                                Guardar alterações
                            </PrimaryButton>
                        </>
                    ) : (
                        <SecondaryButton type="button" onClick={() => setAEditar(true)}>
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                            Editar dados
                        </SecondaryButton>
                    )}
                </div>
            </form>
        </Seccao>
    );
}

function Seguranca({ delay }) {
    const form = useForm({ current_password: "", password: "", password_confirmation: "" });

    const submit = (event) => {
        event.preventDefault();
        form.put("/password", {
            errorBag: "updatePassword",
            preserveScroll: true,
            onSuccess: () => form.reset(),
            onError: () => form.reset("current_password"),
        });
    };

    const pronto = form.data.current_password && form.data.password && form.data.password_confirmation;

    return (
        <Seccao
            id="seguranca"
            numero="2"
            icone={KeyRound}
            titulo="Segurança"
            descricao="Para mudar a palavra-passe tem de indicar primeiro a actual."
            delay={delay}
        >
            <form onSubmit={submit} className="mt-6 max-w-xl space-y-4">
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
                    <PrimaryButton disabled={form.processing || !pronto}>
                        <Save className="h-4 w-4" aria-hidden="true" />
                        Actualizar palavra-passe
                    </PrimaryButton>
                </div>
            </form>
        </Seccao>
    );
}

function ZonaPerigo({ user, delay }) {
    // Escondida por omissão: apagar a conta não deve estar à distância de um clique.
    const [visivel, setVisivel] = useState(false);
    const [confirmando, setConfirmando] = useState(false);
    const form = useForm({ password: "", confirmacao: "" });
    const pronto = form.data.confirmacao === "ELIMINAR" && form.data.password.length > 0;

    const fechar = () => {
        setConfirmando(false);
        form.reset();
        form.clearErrors();
    };

    const eliminar = () => {
        form.delete("/profile", {
            errorBag: "userDeletion",
            preserveScroll: true,
            onSuccess: fechar,
            onError: () => form.reset("password"),
        });
    };

    return (
        <Seccao
            id="perigo"
            numero="3"
            icone={ShieldAlert}
            titulo="Zona de perigo"
            descricao="Acções que não podem ser desfeitas."
            tom="rose"
            delay={delay}
            className="border-rose-200 dark:border-rose-900/60"
        >
            <button
                type="button"
                onClick={() => setVisivel((valor) => !valor)}
                aria-expanded={visivel}
                aria-controls="opcoes-perigo"
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
                <ChevronDown className={cn("h-4 w-4 transition-transform", visivel && "rotate-180")} aria-hidden="true" />
                {visivel ? "Esconder opções avançadas" : "Mostrar opções avançadas"}
            </button>

            {visivel && (
                <div id="opcoes-perigo" className="mt-4 rounded-md border border-rose-200 p-4 dark:border-rose-900/60">
                    <h4 className="font-semibold text-slate-950 dark:text-white">Eliminar a minha conta</h4>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        A conta deixa de poder entrar no sistema. Os registos que criou (leituras, facturas, recibos)
                        mantêm-se. Para a recuperar terá de pedir a um administrador.
                    </p>
                    <div className="mt-4">
                        <DangerButton onClick={() => setConfirmando(true)}>
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                            Eliminar conta…
                        </DangerButton>
                    </div>
                </div>
            )}

            <Modal show={confirmando} onClose={fechar} title="Eliminar conta" maxWidth="md">
                <div className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        Vai eliminar a conta <strong>{user.name}</strong>. Para confirmar, escreva{" "}
                        <strong className="font-mono">ELIMINAR</strong>, introduza a palavra-passe e carregue no botão
                        — o rastilho dá-lhe alguns segundos para desistir.
                    </p>
                    <div>
                        <InputLabel htmlFor="delete_confirmacao" value="Escreva ELIMINAR" />
                        <TextInput
                            id="delete_confirmacao"
                            value={form.data.confirmacao}
                            className="mt-1 block w-full font-mono"
                            autoComplete="off"
                            onChange={(event) => form.setData("confirmacao", event.target.value)}
                        />
                        <InputError message={form.errors.confirmacao} className="mt-1" />
                    </div>
                    <div>
                        <InputLabel htmlFor="delete_password" value="Palavra-passe" />
                        <TextInput
                            id="delete_password"
                            type="password"
                            value={form.data.password}
                            className="mt-1 block w-full"
                            autoComplete="current-password"
                            onChange={(event) => form.setData("password", event.target.value)}
                        />
                        <InputError message={form.errors.password} className="mt-1" />
                    </div>
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <SecondaryButton type="button" onClick={fechar}>
                            Cancelar
                        </SecondaryButton>
                        <FuseButton
                            label="Eliminar conta"
                            undoLabel="Desfazer"
                            doneLabel="A eliminar…"
                            icon={<Trash2 size={15} aria-hidden="true" />}
                            background="#be123c"
                            color="#fff1f2"
                            fuseColor="#fbbf24"
                            commitOn="fuseEnd"
                            undoWindow={5000}
                            disabled={!pronto || form.processing}
                            onCommit={eliminar}
                        />
                    </div>
                </div>
            </Modal>
        </Seccao>
    );
}

export default function Edit({ user, mustVerifyEmail }) {
    const { flash, auth } = usePage().props;
    const papel = auth.roles?.[0];
    // O desenvolvedor tem o seu próprio layout (tema escuro, menu isolado) em
    // toda a app — usar o AdminLayout aqui trocaria-lhe subitamente o tema e
    // a navegação, já que nenhum item do AdminLayout é visível a este papel.
    const Layout = papel === "desenvolvedor" ? DevLayout : AdminLayout;

    return (
        <Layout
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
                    <nav aria-label="Secções do perfil" className="flex flex-wrap gap-2 text-sm font-medium">
                        {[
                            ["#dados", "Dados pessoais"],
                            ["#seguranca", "Segurança"],
                            ["#perigo", "Zona de perigo"],
                        ].map(([href, rotulo]) => (
                            <a
                                key={href}
                                href={href}
                                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white"
                            >
                                {rotulo}
                            </a>
                        ))}
                    </nav>
                    <InformacoesConta user={user} mustVerifyEmail={mustVerifyEmail} status={flash.status} delay={0.08} />
                    <Seguranca delay={0.16} />
                    <ZonaPerigo user={user} delay={0.24} />
                </div>
            </div>
        </Layout>
    );
}
