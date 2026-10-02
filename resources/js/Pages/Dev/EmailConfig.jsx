import { Head, router, useForm } from "@inertiajs/react";
import { CheckCircle2, Link2, Mail, Send, Unplug } from "lucide-react";
import DevLayout from "@/Layouts/DevLayout";
import AnimatedButton from "@/Components/AnimatedButton";
import AnimatedPanel from "@/Components/AnimatedPanel";
import ExpandableCard from "@/Components/ExpandableCard";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import StatusBadge from "@/Components/StatusBadge";
import TextInput from "@/Components/TextInput";
import { formatDateTime } from "@/lib/utils";

export default function Index({ configurado, ligado, conta, ligadoEm, redirect, transporte, remetente, automatico }) {
    const teste = useForm({ para: "" });
    const auto = useForm({ ...automatico });

    const opcoes = [
        ["facturar_ao_confirmar", "Emitir a factura quando a leitura é aprovada", "Ao confirmar uma leitura, a factura é emitida logo, sem passos manuais."],
        ["enviar_ao_emitir", "Enviar a factura por email quando é emitida", "Vai em PDF para o email do cliente. Quem não tem email não recebe (a factura emite-se na mesma)."],
        ["cobranca_automatica", "Enviar lembretes e avisos de atraso", "Todos os dias às 08:00: 3 dias antes de vencer, 1 dia e 15 dias depois, só a quem tem email."],
    ];
    const activo = transporte === "gmail";

    return (
        <DevLayout
            header={
                <div>
                    <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">Desenvolvedor</p>
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
                    <ExpandableCard title="Ligação do Gmail" description="Conta usada para o envio transaccional" icon={Mail}>
                    <AnimatedPanel className="border-0 shadow-none rounded-none p-6">
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
                                    <AnimatedButton as="a" href="/dev/email/google" variant="secondary">
                                        <Link2 className="h-4 w-4" aria-hidden="true" />
                                        Voltar a autorizar
                                    </AnimatedButton>
                                    <AnimatedButton variant="secondary" onClick={() => router.delete("/dev/email/google", { preserveScroll: true })}>
                                        <Unplug className="h-4 w-4" aria-hidden="true" />
                                        Desligar
                                    </AnimatedButton>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-300">
                                <p>Carregue no botão, entre com a conta do Gmail que vai enviar as facturas e aceite o pedido de permissão para enviar emails.</p>
                                <AnimatedButton as="a" href="/dev/email/google" variant="primary">
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
                    </ExpandableCard>

                    <ExpandableCard title="Envio automático" description="Regras para facturas e lembretes" defaultOpen={false}>
                    <AnimatedPanel className="border-0 shadow-none rounded-none p-6">
                        <h3 className="font-semibold text-slate-950 dark:text-white">Envio automático</h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Só se escreve a clientes que têm email registado. Para enviar à mão, ou em massa, use a lista de Facturas e a página de Cobrança.
                        </p>
                        <form
                            onSubmit={(evento) => {
                                evento.preventDefault();
                                auto.put("/dev/email/automatico", { preserveScroll: true });
                            }}
                            className="mt-4 space-y-3"
                        >
                            {opcoes.map(([chave, titulo, ajuda]) => (
                                <label key={chave} className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 p-3 dark:border-slate-800">
                                    <input
                                        type="checkbox"
                                        checked={Boolean(auto.data[chave])}
                                        onChange={(evento) => auto.setData(chave, evento.target.checked)}
                                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                                    />
                                    <span>
                                        <span className="block text-sm font-medium text-slate-900 dark:text-white">{titulo}</span>
                                        <span className="block text-xs text-slate-500 dark:text-slate-400">{ajuda}</span>
                                    </span>
                                </label>
                            ))}
                            <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
                                <InputLabel htmlFor="intervalo_cobranca_dias" value="Intervalo mínimo entre cobranças automáticas" />
                                <div className="mt-1 flex items-center gap-2">
                                    <TextInput
                                        id="intervalo_cobranca_dias"
                                        type="number"
                                        min="0"
                                        max="365"
                                        value={auto.data.intervalo_cobranca_dias}
                                        onChange={(evento) => auto.setData("intervalo_cobranca_dias", evento.target.value)}
                                        className="w-24"
                                    />
                                    <span className="text-sm text-slate-500 dark:text-slate-400">dias (0 desliga o limite)</span>
                                </div>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Reenvios manuais continuam disponíveis a qualquer momento.</p>
                                <InputError message={auto.errors.intervalo_cobranca_dias} className="mt-1" />
                            </div>
                            <div className="flex justify-end">
                                <AnimatedButton variant="primary" type="submit" disabled={auto.processing || !auto.isDirty}>
                                    Guardar
                                </AnimatedButton>
                            </div>
                        </form>
                    </AnimatedPanel>
                    </ExpandableCard>

                    <ExpandableCard title="Email de teste" description="Verificar a ligação antes de enviar aos clientes" icon={Send} defaultOpen={false}>
                    <AnimatedPanel className="border-0 shadow-none rounded-none p-6">
                        <h3 className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
                            <Send className="h-4 w-4 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
                            Enviar um email de teste
                        </h3>
                        <form
                            onSubmit={(evento) => {
                                evento.preventDefault();
                                teste.post("/dev/email/teste", { preserveScroll: true });
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
                    </ExpandableCard>
                </div>
            </div>
        </DevLayout>
    );
}
