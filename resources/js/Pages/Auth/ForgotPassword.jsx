import { Head, useForm, usePage } from "@inertiajs/react";
import GuestLayout from "@/Layouts/GuestLayout";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import PrimaryButton from "@/Components/PrimaryButton";
import TextInput from "@/Components/TextInput";

export default function ForgotPassword() {
    const { flash } = usePage().props;
    const { data, setData, post, processing, errors } = useForm({ email: "" });

    const submit = (event) => {
        event.preventDefault();
        post("/forgot-password");
    };

    return (
        <GuestLayout>
            <Head title="Forgot Password" />

            <div className="mb-4 text-sm text-gray-600">
                Forgot your password? No problem. Just let us know your email
                address and we will email you a password reset link.
            </div>

            {flash.status && (
                <div className="mb-4 text-sm font-medium text-green-600">
                    {flash.status}
                </div>
            )}

            <form onSubmit={submit}>
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
                        Email Password Reset Link
                    </PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}
