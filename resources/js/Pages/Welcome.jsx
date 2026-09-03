import { Head, Link, usePage } from "@inertiajs/react";
import { ArrowRight, Droplets, Gauge, ReceiptText, ShieldCheck, Users } from "lucide-react";
import ThemeToggle from "@/Components/ThemeToggle";

export default function Welcome() {
    const { auth } = usePage().props;

    return (
        <>
            <Head title="Bem-vindo" />
            <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
                <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
                    <nav className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-700 text-white dark:bg-cyan-500 dark:text-slate-950">
                                <Droplets className="h-5 w-5" aria-hidden="true" />
                            </span>
                            <span className="font-bold text-slate-950 dark:text-white">
                                Aquafuros
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            <ThemeToggle className="hidden sm:inline-flex" />
                        {auth.user ? (
                            <Link
                                href="/dashboard"
                                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                            >
                                Página Principal
                                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href="/login"
                                    className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                                >
                                    Log in
                                </Link>
                                <Link
                                    href="/register"
                                    className="rounded-md bg-cyan-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-cyan-800 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
                                >
                                    Register
                                </Link>
                            </>
                        )}
                        </div>
                    </nav>

                    <section className="grid flex-1 items-center gap-10 py-16 lg:grid-cols-[1.05fr_0.95fr]">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-normal text-cyan-700">
                                Aquafuros
                            </p>
                            <h1 className="mt-4 max-w-3xl text-4xl font-bold text-slate-950 dark:text-white sm:text-5xl">
                                Gestao de agua, clientes e cobrancas num unico sistema.
                            </h1>
                            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                                Controle leituras, facturas, pagamentos, tarifas e utilizadores
                                com uma area administrativa preparada para a operacao diaria.
                            </p>
                            <div className="mt-8 flex flex-wrap gap-3">
                                <Link
                                    href={auth.user ? "/dashboard" : "/login"}
                                    className="inline-flex items-center gap-2 rounded-md bg-cyan-700 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-cyan-800 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
                                >
                                    Entrar no sistema
                                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                                </Link>
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            {[
                                [Users, "Clientes", "Cadastro e acompanhamento por zona"],
                                [Gauge, "Leituras", "Ciclos de consumo sempre visiveis"],
                                [ReceiptText, "Facturacao", "Emissao e controlo de dividas"],
                                [ShieldCheck, "Permissoes", "Acessos organizados por perfil"],
                            ].map(([Icon, title, text]) => (
                                <div
                                    key={title}
                                    className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20"
                                >
                                    <div className="flex h-11 w-11 items-center justify-center rounded-md bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                                        <Icon className="h-5 w-5" aria-hidden="true" />
                                    </div>
                                    <h2 className="mt-4 font-semibold text-slate-950 dark:text-white">
                                        {title}
                                    </h2>
                                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                                        {text}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </main>
        </>
    );
}
