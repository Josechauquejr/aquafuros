import { Head, Link, useForm, usePage } from "@inertiajs/react";
import GuestLayout from "@/Layouts/GuestLayout";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import PrimaryButton from "@/Components/PrimaryButton";
import TextInput from "@/Components/TextInput";

export default function VerifyResetCode({ email }) {
    const { flash } = usePage().props;
    const { data, setData, post, processing, errors, reset } = useForm({ email, code: "" });
    const resend = useForm({ email });

    const submit = (event) => {
        event.preventDefault();
        post("/forgot-password/code", { onFinish: () => reset("code") });
    };

    const submitResend = (event) => {
        event.preventDefault();
        resend.post("/forgot-password");
    };

    return (
        <GuestLayout>
            <Head title="Código de recuperação" />

            <div className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                Introduza o código de 6 dígitos que enviámos para{" "}
                <strong className="text-slate-700 dark:text-slate-200">{email}</strong>.
                O código vale 15 minutos.
            </div>

            {flash.status && (
                <div className="mb-4 text-sm font-medium text-green-600 dark:text-green-400">
                    {flash.status}
                </div>
            )}

            <form onSubmit={submit}>
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
                <InputError message={errors.code || errors.email} className="mt-2" />

                <div className="mt-4 flex items-center justify-end">
                    <PrimaryButton disabled={processing || data.code.length !== 6}>
                        Continuar
                    </PrimaryButton>
                </div>
            </form>

            <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-700">
                <form onSubmit={submitResend}>
                    <button
                        type="submit"
                        disabled={resend.processing}
                        className="rounded-md text-sm text-cyan-700 underline hover:text-cyan-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:opacity-50 dark:text-cyan-400 dark:hover:text-cyan-300"
                    >
                        Enviar novo código
                    </button>
                </form>

                <Link
                    href="/login"
                    className="rounded-md text-sm text-slate-500 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                >
                    Voltar ao início de sessão
                </Link>
            </div>
        </GuestLayout>
    );
}
