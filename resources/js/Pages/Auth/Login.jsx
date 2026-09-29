import { Head, Link, useForm, usePage } from "@inertiajs/react";
import { useState } from "react";
import GuestLayout from "@/Layouts/GuestLayout";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import PrimaryButton from "@/Components/PrimaryButton";
import TextInput from "@/Components/TextInput";
import { Eye, EyeOff, Lock, LogIn, UserRound } from "lucide-react";

export default function Login() {
    const { flash } = usePage().props;
    const [mostrarSenha, setMostrarSenha] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        username: "",
        password: "",
        remember: false,
    });

    const submit = (event) => {
        event.preventDefault();
        post("/login", {
            onFinish: () => reset("password"),
        });
    };

    return (
        <GuestLayout>
            <Head title="Entrar" />

            {flash.status && (
                <div className="mb-4 text-sm font-medium text-green-600 dark:text-green-400">
                    {flash.status}
                </div>
            )}

            <form onSubmit={submit} className="space-y-5">
                <div>
                    <InputLabel htmlFor="username" value="Nome de utilizador" />
                    <div className="relative mt-1">
                        <UserRound
                            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                            aria-hidden="true"
                        />
                        <TextInput
                            id="username"
                            name="username"
                            value={data.username}
                            className="block w-full ps-10"
                            autoComplete="username"
                            autoFocus
                            required
                            onChange={(event) => setData("username", event.target.value)}
                        />
                    </div>
                    <InputError message={errors.username} className="mt-2" />
                </div>

                <div>
                    <InputLabel htmlFor="password" value="Senha" />
                    <div className="relative mt-1">
                        <Lock
                            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                            aria-hidden="true"
                        />
                        <TextInput
                            id="password"
                            type={mostrarSenha ? "text" : "password"}
                            name="password"
                            value={data.password}
                            className="block w-full ps-10 pe-10"
                            autoComplete="current-password"
                            required
                            onChange={(event) => setData("password", event.target.value)}
                        />
                        <button
                            type="button"
                            onClick={() => setMostrarSenha((valor) => !valor)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                        >
                            {mostrarSenha ? (
                                <EyeOff className="h-4 w-4" aria-hidden="true" />
                            ) : (
                                <Eye className="h-4 w-4" aria-hidden="true" />
                            )}
                        </button>
                    </div>
                    <InputError message={errors.password} className="mt-2" />
                </div>

                <div className="flex items-center justify-between gap-3">
                    <label className="inline-flex items-center" htmlFor="remember">
                        <input
                            id="remember"
                            name="remember"
                            type="checkbox"
                            checked={data.remember}
                            onChange={(event) => setData("remember", event.target.checked)}
                            className="rounded border-slate-300 text-cyan-700 shadow-sm focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900"
                        />
                        <span className="ms-2 text-sm text-slate-600 dark:text-slate-300">
                            Lembrar-me
                        </span>
                    </label>

                    <Link
                        href="/forgot-password"
                        className="rounded-md text-sm font-medium text-cyan-700 hover:text-cyan-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 dark:text-cyan-300 dark:hover:text-cyan-200"
                    >
                        Esqueceu a senha?
                    </Link>
                </div>

                <div className="pt-1">
                    <PrimaryButton
                        className="h-11 w-full justify-center gap-2 text-sm"
                        disabled={processing}
                    >
                        <LogIn className="h-4 w-4" aria-hidden="true" />
                        Entrar
                    </PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}
