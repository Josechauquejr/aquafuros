import { Head, useForm, usePage } from "@inertiajs/react";
import GuestLayout from "@/Layouts/GuestLayout";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import PrimaryButton from "@/Components/PrimaryButton";
import TextInput from "@/Components/TextInput";

export default function VerifyEmail() {
    const { flash, emailAtivo } = usePage().props;
    const { data, setData, post, processing, errors, reset } = useForm({ code: "" });
    const resend = useForm({});
    const logout = useForm({});

    const submit = (event) => {
        event.preventDefault();
        post("/verify-email", { onFinish: () => reset("code") });
    };

    const submitResend = (event) => {
        event.preventDefault();
        resend.post("/email/verification-notification");
    };

    const submitLogout = (event) => {
        event.preventDefault();
        logout.post("/logout");
    };

    return (
        <GuestLayout>
            <Head title="Verificação de email" />

            <div className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                {emailAtivo
                    ? "Introduza o código de 6 dígitos enviado para o seu email. O código vale 15 minutos."
                    : "A verificação por email está suspensa durante a manutenção. A sua conta será activada sem código."}
            </div>

            {flash.status && (
                <div className="mb-4 text-sm font-medium text-green-600 dark:text-green-400">
                    {flash.status}
                </div>
            )}
            {flash.error && (
                <div className="mb-4 text-sm font-medium text-rose-600 dark:text-rose-400">
                    {flash.error}
                </div>
            )}

            {emailAtivo && <form onSubmit={submit}>
                <InputLabel htmlFor="code" value="Código" />
                <TextInput
                    id="code"
                    name="code"
                    value={data.code}
                    className="mt-1 block w-full text-center text-2xl tracking-[0.5em]"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    autoFocus
                    onChange={(event) => setData("code", event.target.value.replace(/\D/g, ""))}
                />
                <InputError message={errors.code} className="mt-2" />

                <div className="mt-4 flex items-center justify-end">
                    <PrimaryButton disabled={processing || data.code.length !== 6}>
                        Verificar
                    </PrimaryButton>
                </div>
            </form>}

            {emailAtivo && <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-700">
                <form onSubmit={submitResend}>
                    <button
                        type="submit"
                        disabled={resend.processing}
                        className="rounded-md text-sm text-cyan-700 underline hover:text-cyan-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:opacity-50 dark:text-cyan-400 dark:hover:text-cyan-300"
                    >
                        Enviar novo código
                    </button>
                </form>

                <form onSubmit={submitLogout}>
                    <button
                        type="submit"
                        className="rounded-md text-sm text-slate-500 underline hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 dark:text-slate-400 dark:hover:text-white"
                    >
                        Terminar sessão
                    </button>
                </form>
            </div>}
        </GuestLayout>
    );
}
