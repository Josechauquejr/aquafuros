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
            <Head title="Confirm Password" />

            <div className="mb-4 text-sm text-gray-600">
                This is a secure area of the application. Please confirm your
                password before continuing.
            </div>

            <form onSubmit={submit}>
                <div>
                    <InputLabel htmlFor="password" value="Password" />
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
                    <PrimaryButton disabled={processing}>Confirm</PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}
