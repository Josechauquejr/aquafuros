import { Head, Link, useForm, usePage } from "@inertiajs/react";
import { AlertCircle, ArrowLeft, Clock, Eye, EyeOff, FileText, Gauge, Lock, LogIn, Mail, UserRound, Wallet } from "lucide-react";
import { useState } from "react";
import MarcaAquafuros from "@/Components/MarcaAquafuros";
import Ilustracao from "@/Components/Ilustracao";
import { cn } from "@/lib/utils";

const PASSOS = [
    ["1 · Ler", Gauge],
    ["2 · Facturar", FileText],
    ["3 · Receber", Wallet],
];

/**
 * Entrar: à esquerda a identidade (gota, ilustração do furo, frase e os 3
 * passos do mês); à direita só o formulário. Um campo aceita utilizador, email
 * ou telefone. Erro diz quantas tentativas faltam; ao fim de 5, a conta fica
 * bloqueada 15 minutos (ilustração + hora a que pode tentar).
 */
export default function Login() {
    const { flash, empresa } = usePage().props;
    const [mostrarSenha, setMostrarSenha] = useState(false);
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        username: "",
        password: "",
        remember: true,
    });
    const bloqueadaAte = errors.bloqueado;
    const comErro = Boolean(errors.username || errors.password) && !bloqueadaAte;

    const submit = (event) => {
        event.preventDefault();
        post("/login", { onFinish: () => reset("password") });
    };

    const campo = cn(
        "flex min-h-[52px] items-center gap-2.5 rounded-md border bg-white px-3.5 text-slate-500 focus-within:border-cyan-500 focus-within:shadow-[0_0_0_4px_rgba(0,89,255,0.18)] dark:bg-[#1E232D] dark:text-slate-400",
        comErro ? "border-rose-600 dark:border-rose-300" : "border-[#DDE2EE] dark:border-slate-800",
        processing && "opacity-60",
    );
    const entrada = "min-w-0 flex-1 border-0 bg-transparent p-0 text-base text-ink focus:!border-0 focus:!shadow-none focus:ring-0 dark:text-[#F2F5FB]";

    return (
        <div className="flex min-h-screen flex-col bg-white text-ink lg:flex-row dark:bg-[#161A22] dark:text-[#F2F5FB]">
            <Head title="Entrar" />

            <section aria-label={empresa?.nome ?? "Aquafuros"} className="flex flex-1 flex-col justify-between gap-8 bg-slate-100 px-6 py-8 sm:px-14 sm:py-12 dark:bg-slate-950">
                <div className="flex items-center gap-3">
                    <MarcaAquafuros className="h-11 w-11" />
                    <div className="flex flex-col">
                        <span className="text-[22px] font-extrabold">{empresa?.nome ?? "Aquafuros"}</span>
                        {empresa?.localizacao && <span className="text-[13px] text-slate-500 dark:text-slate-400">{empresa.localizacao}</span>}
                    </div>
                </div>
                <div className="hidden max-w-[520px] flex-col gap-[22px] sm:flex">
                    <Ilustracao nome="furo" largura={300} />
                    <h1 className="text-[40px] font-bold leading-[1.15] tracking-[-0.8px]">Toda a água do mês, num só sítio.</h1>
                    <p className="text-[17px] leading-relaxed text-slate-600 dark:text-slate-300">Leituras, facturas e pagamentos — um passo de cada vez.</p>
                    <div className="flex flex-wrap gap-2.5">
                        {PASSOS.map(([rotulo, Icone]) => (
                            <span key={rotulo} className="inline-flex items-center gap-2 rounded-full border border-[#DDE2EE] bg-white px-3.5 py-2 text-sm font-bold dark:border-slate-800 dark:bg-slate-900">
                                <Icone className="h-4 w-4 text-cyan-500 dark:text-cyan-400" aria-hidden="true" />
                                {rotulo}
                            </span>
                        ))}
                    </div>
                </div>
                <span className="hidden text-[13px] text-slate-500 sm:block dark:text-slate-400">
                    {(empresa?.nome ?? "Aquafuros").toUpperCase()} · Sistema desenvolvido pela RJM Consultórios e Serviços
                </span>
            </section>

            <main className="flex flex-1 items-center justify-center px-6 py-10 sm:p-12">
                <div className="flex w-full max-w-[420px] flex-col gap-6">
                    {bloqueadaAte ? (
                        <div className="flex flex-col items-center gap-3.5 text-center">
                            <Ilustracao nome="bloqueado" largura={170} />
                            <h2 className="text-[26px] font-bold tracking-[-0.4px]">Conta bloqueada por 15 minutos</h2>
                            <p className="max-w-[360px] text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
                                Houve 5 tentativas erradas. É para proteger os dados. Pode esperar ou mudar a palavra-passe agora.
                            </p>
                            <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3.5 py-2 text-sm font-bold tabular-nums dark:bg-[#1E232D]">
                                <Clock className="h-4 w-4" aria-hidden="true" />
                                Pode tentar de novo às {bloqueadaAte}
                            </span>
                            <div className="mt-1.5 grid w-full grid-cols-2 gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => clearErrors()}
                                    className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-md border border-[#DDE2EE] bg-white text-[15px] font-bold hover:bg-slate-50 dark:border-slate-800 dark:bg-[#161A22]"
                                >
                                    <ArrowLeft className="h-[18px] w-[18px]" aria-hidden="true" />
                                    Voltar
                                </button>
                                <Link
                                    href="/forgot-password"
                                    className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-md bg-brand text-[15px] font-bold text-white hover:bg-brand-hover dark:bg-cyan-500"
                                >
                                    <Mail className="h-[18px] w-[18px]" aria-hidden="true" />
                                    Mudar palavra-passe
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={submit} className="flex flex-col gap-6">
                            <div className="flex flex-col gap-1.5">
                                <h2 className="text-[30px] font-bold tracking-[-0.5px]">Entrar</h2>
                                <p className="text-[15px] text-slate-600 dark:text-slate-300">Use o utilizador, o email ou o telefone da sua conta.</p>
                            </div>

                            {flash?.status && (
                                <p role="status" className="rounded-[14px] bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:bg-[rgba(46,160,99,0.16)] dark:text-emerald-300">
                                    {flash.status}
                                </p>
                            )}

                            {comErro && (
                                <div role="alert" className="flex items-start gap-3 rounded-[14px] bg-rose-100 px-4 py-3.5 dark:bg-[rgba(244,163,154,0.14)]">
                                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-700 dark:text-rose-300" aria-hidden="true" />
                                    <span className="flex flex-col gap-0.5">
                                        <strong className="text-sm text-rose-700 dark:text-rose-300">{errors.username ?? errors.password}</strong>
                                        {errors.tentativas && <span className="text-sm leading-relaxed text-rose-800 dark:text-rose-300">{errors.tentativas}</span>}
                                    </span>
                                </div>
                            )}

                            <div className="flex flex-col gap-4">
                                <label className="flex flex-col gap-1.5" htmlFor="username">
                                    <span className="text-sm font-semibold">Utilizador, email ou telefone</span>
                                    <span className={campo}>
                                        <UserRound className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                                        <input
                                            id="username"
                                            name="username"
                                            value={data.username}
                                            autoComplete="username"
                                            autoFocus
                                            required
                                            placeholder="nome, nome@empresa.co.mz ou 84 000 0000"
                                            onChange={(event) => setData("username", event.target.value)}
                                            className={entrada}
                                        />
                                    </span>
                                </label>
                                <div className="flex flex-col gap-1.5">
                                    <span className="flex items-baseline justify-between">
                                        <label htmlFor="password" className="text-sm font-semibold">
                                            Palavra-passe
                                        </label>
                                        <Link href="/forgot-password" className="text-[13px] font-bold text-cyan-700 hover:text-cyan-800 dark:text-cyan-400">
                                            Esqueci-me
                                        </Link>
                                    </span>
                                    <span className={cn(campo, "pr-1.5")}>
                                        <Lock className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                                        <input
                                            id="password"
                                            type={mostrarSenha ? "text" : "password"}
                                            name="password"
                                            value={data.password}
                                            autoComplete="current-password"
                                            required
                                            onChange={(event) => setData("password", event.target.value)}
                                            className={cn(entrada, !mostrarSenha && "tracking-[2px]")}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setMostrarSenha((valor) => !valor)}
                                            aria-label={mostrarSenha ? "Esconder palavra-passe" : "Mostrar palavra-passe"}
                                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/[0.06]"
                                        >
                                            {mostrarSenha ? <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" /> : <Eye className="h-[18px] w-[18px]" aria-hidden="true" />}
                                        </button>
                                    </span>
                                    {comErro && <span className="text-[13px] text-rose-700 dark:text-rose-300">Verifique se o Caps Lock está ligado.</span>}
                                </div>
                                <label className="flex min-h-[32px] items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300" htmlFor="remember">
                                    <input id="remember" type="checkbox" checked={data.remember} onChange={(event) => setData("remember", event.target.checked)} className="h-[18px] w-[18px] rounded" />
                                    Manter sessão neste dispositivo
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={processing}
                                aria-busy={processing}
                                className="inline-flex min-h-[54px] w-full items-center justify-center gap-2.5 rounded-md bg-brand text-base font-bold text-white transition hover:bg-brand-hover disabled:opacity-85 dark:bg-cyan-500 dark:hover:bg-cyan-600"
                            >
                                {processing ? (
                                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                        <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                                        <path d="M21 12a9 9 0 0 0-9-9" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
                                    </svg>
                                ) : (
                                    <LogIn className="h-5 w-5" aria-hidden="true" />
                                )}
                                {processing ? "A entrar…" : "Entrar"}
                            </button>
                            <p className="text-center text-sm text-slate-500 dark:text-slate-400">Primeira vez? Peça o acesso ao administrador.</p>
                        </form>
                    )}
                </div>
            </main>
        </div>
    );
}
