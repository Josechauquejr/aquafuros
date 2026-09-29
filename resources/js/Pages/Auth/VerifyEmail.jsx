import { Head, useForm, usePage } from "@inertiajs/react";
import GuestLayout from "@/Layouts/GuestLayout";
import PrimaryButton from "@/Components/PrimaryButton";

export default function VerifyEmail() {
    const { flash } = usePage().props;
    const verification = useForm({});
    const logout = useForm({});

    const resend = (event) => {
        event.preventDefault();
        verification.post("/email/verification-notification");
    };

    const submitLogout = (event) => {
        event.preventDefault();
        logout.post("/logout");
    };

    return (
        <GuestLayout>
            <Head title="Verificação de email" />

            <div className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                Obrigado por se registar! Antes de continuar, pode verificar o seu
                endereço de email clicando no link que acabámos de enviar?
            </div>

            {flash.status === "verification-link-sent" && (
                <div className="mb-4 text-sm font-medium text-green-600 dark:text-green-400">
                    Foi enviado um novo link de verificação para o email indicado no
                    registo.
                </div>
            )}

            <div className="mt-4 flex items-center justify-between">
                <form onSubmit={resend}>
                    <PrimaryButton disabled={verification.processing}>
                        Reenviar email de verificação
                    </PrimaryButton>
                </form>

                <form onSubmit={submitLogout}>
                    <button
                        type="submit"
                        className="rounded-md text-sm text-slate-500 underline hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 dark:text-slate-400 dark:hover:text-white"
                    >
                        Terminar sessão
                    </button>
                </form>
            </div>
        </GuestLayout>
    );
}
