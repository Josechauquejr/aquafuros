import { Head, useForm } from "@inertiajs/react";
import GuestLayout from "@/Layouts/GuestLayout";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import PrimaryButton from "@/Components/PrimaryButton";
import TextInput from "@/Components/TextInput";

export default function ConfirmPassword() {
    const { data, setData, post, processing, errors, reset } = useForm({
        password: "",
    });

    const submit = (event) => {
        event.preventDefault();
        post("/confirm-password", {
            onFinish: () => reset("password"),
        });
    };

    return (
        <GuestLayout>
            <Head title="Confirmar senha" />

            <div className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                Esta é uma área segura do sistema. Confirme a sua senha antes de
                continuar.
            </div>

            <form onSubmit={submit}>
                <div>
                    <InputLabel htmlFor="password" value="Senha" />
                    <TextInput
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        className="mt-1 block w-full"
                        autoComplete="current-password"
                        required
                        autoFocus
                        onChange={(event) => setData("password", event.target.value)}
                    />
                    <InputError message={errors.password} className="mt-2" />
                </div>

                <div className="mt-4 flex justify-end">
                    <PrimaryButton disabled={processing}>Confirmar</PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}
