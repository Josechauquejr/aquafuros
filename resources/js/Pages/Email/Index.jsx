import { Head, router, useForm } from "@inertiajs/react";
import { CheckCircle2, Link2, Mail, Send, Unplug } from "lucide-react";
import AdminLayout from "@/Layouts/AdminLayout";
import AnimatedButton from "@/Components/AnimatedButton";
import AnimatedPanel from "@/Components/AnimatedPanel";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import StatusBadge from "@/Components/StatusBadge";
import TextInput from "@/Components/TextInput";
import { formatDateTime } from "@/lib/utils";

export default function Index({ configurado, ligado, conta, ligadoEm, redirect, transporte, remetente }) {
    const teste = useForm({ para: "" });
    const activo = transporte === "gmail";

    return (
        <AdminLayout
            header={
                <div>
                    <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">Administração</p>
                    <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">Email</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Ligação do Gmail para enviar as facturas aos clientes. Autoriza-se uma vez; não é guardada nenhuma palavra-passe.
                    </p>
                </div>
            }
        >
            <Head title="Email" />
            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-3xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <AnimatedPanel className="p-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h3 className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
                                <Mail className="h-4 w-4 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
                                Gmail
                            </h3>
                            {ligado ? <StatusBadge tone="emerald">Ligado</StatusBadge> : <StatusBadge tone="amber">Por ligar</StatusBadge>}
                        </div>

                        {!configurado ? (
                            <p className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
                                Faltam <code>GOOGLE_CLIENT_ID</code> e <code>GOOGLE_CLIENT_SECRET</code> no ficheiro <code>.env</code> do servidor.
                            </p>
                        ) : ligado ? (
                            <div className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-300">
                                <p className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                                    As facturas saem de <strong>{conta}</strong>
                                    {ligadoEm ? ` (ligado em ${formatDateTime(ligadoEm)})` : ""}.
                                </p>
                                {!activo && (
                                    <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                                        O Gmail está ligado, mas o sistema ainda envia por <strong>{transporte}</strong>. Ponha <code>MAIL_MAILER=gmail</code> no <code>.env</code>.
                                    </p>
                                )}
                                {remetente && conta && remetente.toLowerCase() !== conta.toLowerCase() && (
                                    <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                                        O remetente configurado ({remetente}) é diferente da conta ligada — o Gmail vai enviar sempre como {conta}.
                                    </p>
                                )}
                                <div className="flex flex-wrap gap-2 pt-1">
                                    <AnimatedButton as="a" href="/admin/email/google" variant="secondary">
                                        <Link2 className="h-4 w-4" aria-hidden="true" />
                                        Voltar a autorizar
                                    </AnimatedButton>
                                    <AnimatedButton variant="secondary" onClick={() => router.delete("/admin/email/google", { preserveScroll: true })}>
                                        <Unplug className="h-4 w-4" aria-hidden="true" />
                                        Desligar
                                    </AnimatedButton>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-300">
                                <p>Carregue no botão, entre com a conta do Gmail que vai enviar as facturas e aceite o pedido de permissão para enviar emails.</p>
                                <AnimatedButton as="a" href="/admin/email/google" variant="primary">
                                    <Link2 className="h-4 w-4" aria-hidden="true" />
                                    Ligar o Gmail
                                </AnimatedButton>
                                <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-400">
                                    Na consola da Google (Credenciais → o seu cliente OAuth) tem de estar registado este endereço de redirecionamento:
                                    <br />
                                    <code className="break-all font-semibold">{redirect}</code>
                                </div>
                            </div>
                        )}
                    </AnimatedPanel>

                    <AnimatedPanel className="p-6">
                        <h3 className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
                            <Send className="h-4 w-4 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
                            Enviar um email de teste
                        </h3>
                        <form
                            onSubmit={(evento) => {
                                evento.preventDefault();
                                teste.post("/admin/email/teste", { preserveScroll: true });
                            }}
                            className="mt-4 flex flex-wrap items-end gap-3"
                        >
                            <div className="min-w-[16rem] flex-1">
                                <InputLabel htmlFor="para" value="Para (vazio = o seu email)" />
                                <TextInput id="para" type="email" value={teste.data.para} onChange={(e) => teste.setData("para", e.target.value)} className="mt-1 block w-full" placeholder="alguem@exemplo.com" />
                                <InputError message={teste.errors.para} className="mt-1" />
                            </div>
                            <AnimatedButton variant="primary" type="submit" disabled={teste.processing || !ligado || !activo}>
                                Enviar teste
                            </AnimatedButton>
                        </form>
                        {(!ligado || !activo) && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Disponível depois de o Gmail estar ligado e activo.</p>}
                    </AnimatedPanel>
                </div>
            </div>
        </AdminLayout>
    );
}
