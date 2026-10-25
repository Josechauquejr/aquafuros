import { Head, useForm, usePage } from "@inertiajs/react";
import GuestLayout from "@/Layouts/GuestLayout";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import PrimaryButton from "@/Components/PrimaryButton";
import TextInput from "@/Components/TextInput";

export default function ForgotPassword() {
    const { flash, emailAtivo } = usePage().props;
    const { data, setData, post, processing, errors } = useForm({ email: "" });

    const submit = (event) => {
        event.preventDefault();
        post("/forgot-password");
    };

    return (
        <GuestLayout>
            <Head title="Recuperar senha" />

            <div className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                {emailAtivo
                    ? "Esqueceu a senha? Indique o seu email para receber um código de reposição."
                    : "A recuperação de senha está temporariamente indisponível durante a manutenção do serviço de email. Contacte o administrador para recuperar o acesso."}
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
                <div>
                    <InputLabel htmlFor="email" value="Email" />
                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="mt-1 block w-full"
                        required
                        autoFocus
                        onChange={(event) => setData("email", event.target.value)}
                    />
                    <InputError message={errors.email} className="mt-2" />
                </div>

                <div className="mt-4 flex items-center justify-end">
                    <PrimaryButton disabled={processing}>
                        Enviar código
                    </PrimaryButton>
                </div>
            </form>}
        </GuestLayout>
    );
}
