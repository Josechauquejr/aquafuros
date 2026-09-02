import { Link } from "@inertiajs/react";
import ApplicationLogo from "@/Components/ApplicationLogo";
import ThemeToggle from "@/Components/ThemeToggle";

export default function GuestLayout({ children }) {
    return (
        <div className="flex min-h-screen flex-col items-center bg-slate-50 px-4 pt-6 text-slate-950 dark:bg-slate-950 dark:text-slate-100 sm:justify-center sm:pt-0">
            <div className="absolute right-4 top-4">
                <ThemeToggle />
            </div>

            <div className="w-full overflow-hidden rounded-lg border border-slate-200 bg-white px-6 py-6 shadow-md shadow-slate-950/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20 sm:max-w-md">
                <div className="mb-6 flex flex-col items-center text-center">
                    <Link href="/" className="inline-flex flex-col items-center gap-3">
                        <ApplicationLogo className="h-14 w-14" />
                        <span className="text-lg font-bold text-slate-950 dark:text-white">
                            Aquafuros
                        </span>
                    </Link>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        Acesso seguro ao painel de gestao.
                    </p>
                </div>

                {children}
            </div>

            <p className="mb-6 mt-6 text-center text-xs text-slate-400 dark:text-slate-600">
                Sistema desenvolvido pela RJM Consultórios e Serviços — José Zeferino Chaúque Júnior
            </p>
        </div>
    );
}
