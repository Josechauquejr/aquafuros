import { Head, Link, useForm, usePage } from "@inertiajs/react";
import { ArrowLeft, Clock, LogOut, ShieldOff } from "lucide-react";
import { motion } from "motion/react";
import AnimatedButton from "@/Components/AnimatedButton";
import ApplicationLogo from "@/Components/ApplicationLogo";

export default function AcessoBloqueado({ motivo, janela }) {
    const { empresa } = usePage().props;
    const logout = useForm({});

    const submitLogout = (event) => {
        event.preventDefault();
        logout.post("/logout");
    };

    const ehHorario = motivo === "horario";
    const ehPermissao = motivo === "permissao";
    const Icon = ehHorario ? Clock : ShieldOff;

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 dark:bg-slate-950">
            <Head title="Acesso bloqueado" />

            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-md overflow-hidden rounded-lg border border-slate-200 bg-white text-center shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
                <div className="flex items-center justify-center gap-3 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                    <ApplicationLogo className="h-10 w-10" />
                    <p className="font-bold text-slate-950 dark:text-white">{empresa?.nome ?? "Aquafuros"}</p>
                </div>

                <div className="px-6 py-8">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                        <Icon className="h-6 w-6" aria-hidden="true" />
                    </div>

                    {ehHorario ? (
                        <>
                            <h1 className="mt-4 text-lg font-bold text-slate-950 dark:text-white">
                                Fora do horário de funcionamento
                            </h1>
                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                O acesso à plataforma está limitado ao horário configurado
                                {janela ? (
                                    <>
                                        {" "}
                                        (<strong>{janela.inicio}</strong> às <strong>{janela.fim}</strong>).
                                    </>
                                ) : (
                                    "."
                                )}{" "}
                                Tente novamente dentro desse horário.
                            </p>
                        </>
                    ) : ehPermissao ? (
                        <>
                            <h1 className="mt-4 text-lg font-bold text-slate-950 dark:text-white">
                                Sem permissão para aceder
                            </h1>
                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                A tua conta não tem acesso a esta página. Se achas que devia ter, contacta um
                                administrador.
                            </p>
                        </>
                    ) : (
                        <>
                            <h1 className="mt-4 text-lg font-bold text-slate-950 dark:text-white">
                                Secção temporariamente desactivada
                            </h1>
                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                Esta área do sistema foi desactivada pelo administrador. Contacte-o se precisar
                                de aceder com urgência.
                            </p>
                        </>
                    )}

                    <div className="mt-6 flex items-center justify-center gap-3">
                        {ehPermissao && (
                            <AnimatedButton as={Link} href="/dashboard" variant="primary">
                                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                                Voltar à minha página
                            </AnimatedButton>
                        )}
                        <form onSubmit={submitLogout}>
                            <AnimatedButton type="submit" variant="secondary">
                                <LogOut className="h-4 w-4" aria-hidden="true" />
                                Terminar sessão
                            </AnimatedButton>
                        </form>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
