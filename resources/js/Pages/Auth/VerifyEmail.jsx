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
            <Head title="Email Verification" />

            <div className="mb-4 text-sm text-gray-600">
                Thanks for signing up! Before getting started, could you verify
                your email address by clicking on the link we just emailed to you?
            </div>

            {flash.status === "verification-link-sent" && (
                <div className="mb-4 text-sm font-medium text-green-600">
                    A new verification link has been sent to the email address you
                    provided during registration.
                </div>
            )}

            <div className="mt-4 flex items-center justify-between">
                <form onSubmit={resend}>
                    <PrimaryButton disabled={verification.processing}>
                        Resend Verification Email
                    </PrimaryButton>
                </form>

                <form onSubmit={submitLogout}>
                    <button
                        type="submit"
                        className="rounded-md text-sm text-gray-600 underline hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
                    >
                        Log Out
                    </button>
                </form>
            </div>
        </GuestLayout>
    );
}
