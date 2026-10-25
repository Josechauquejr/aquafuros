import { Head, router, useForm } from "@inertiajs/react";
import { CheckCircle2, Link2, Mail, Send, Unplug } from "lucide-react";
import DevLayout from "@/Layouts/DevLayout";
import AnimatedButton from "@/Components/AnimatedButton";
import AnimatedPanel from "@/Components/AnimatedPanel";
import ExpandableCard from "@/Components/ExpandableCard";
import StatusBadge from "@/Components/StatusBadge";
import { formatDateTime } from "@/lib/utils";

export default function Index({ configurado, ligado, conta, ligadoEm, redirect, transporte, remetente, automatico }) {
    const teste = useForm({});
    const emissao = useForm({ facturar_ao_confirmar: Boolean(automatico.facturar_ao_confirmar) });
    const activo = transporte === "gmail";

    return (
        <DevLayout header={<div><p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">Desenvolvedor</p><h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">Email de autenticação</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Usado para links de definição de senha, verificação de email e reposição de senha.</p></div>}>
            <Head title="Email de autenticação" />
            <div className="py-8 sm:py-10"><div className="mx-auto max-w-3xl space-y-6 px-4 sm:px-6 lg:px-8">
                <ExpandableCard title="Ligação do Gmail" description="Conta que envia mensagens de autenticação" icon={Mail}>
                    <AnimatedPanel className="border-0 shadow-none rounded-none p-6">
                        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white"><Mail className="h-4 w-4 text-cyan-700 dark:text-cyan-300" aria-hidden="true" /> Gmail</h3>{ligado ? <StatusBadge tone="emerald">Ligado</StatusBadge> : <StatusBadge tone="amber">Por ligar</StatusBadge>}</div>
                        {!configurado ? <p className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">Faltam <code>GOOGLE_CLIENT_ID</code> e <code>GOOGLE_CLIENT_SECRET</code> no ficheiro <code>.env</code>.</p> : ligado ? <div className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-300"><p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />A conta <strong>{conta}</strong> está ligada{ligadoEm ? ` desde ${formatDateTime(ligadoEm)}` : ""}.</p>{!activo && <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">O transporte actual é <strong>{transporte}</strong>. Configure <code>MAIL_MAILER=gmail</code> no servidor.</p>}{remetente && conta && remetente.toLowerCase() !== conta.toLowerCase() && <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">O remetente configurado é diferente; o Gmail enviará pela conta {conta}.</p>}<div className="flex flex-wrap gap-2"><AnimatedButton as="a" href="/dev/email/google" variant="secondary"><Link2 className="h-4 w-4" aria-hidden="true" />Voltar a autorizar</AnimatedButton><AnimatedButton variant="secondary" onClick={() => router.delete("/dev/email/google", { preserveScroll: true })}><Unplug className="h-4 w-4" aria-hidden="true" />Desligar</AnimatedButton></div></div> : <div className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-300"><p>Ligue a conta do Gmail que enviará os códigos de acesso.</p><AnimatedButton as="a" href="/dev/email/google" variant="primary"><Link2 className="h-4 w-4" aria-hidden="true" />Ligar o Gmail</AnimatedButton><p className="rounded-md bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-400">Registe este endereço de redirecionamento na consola Google:<br /><code className="break-all font-semibold">{redirect}</code></p></div>}
                    </AnimatedPanel>
                </ExpandableCard>
                <ExpandableCard title="Emissão de facturas" description="Opção independente do envio de email" defaultOpen={false}>
                    <AnimatedPanel className="border-0 shadow-none rounded-none p-6"><form onSubmit={(e) => { e.preventDefault(); emissao.put("/dev/email/automatico", { preserveScroll: true }); }} className="space-y-4"><label className="flex items-start gap-3 rounded-md border border-slate-200 p-3 dark:border-slate-800"><input type="checkbox" checked={emissao.data.facturar_ao_confirmar} onChange={(e) => emissao.setData("facturar_ao_confirmar", e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500" /><span><span className="block text-sm font-medium text-slate-900 dark:text-white">Emitir factura quando a leitura é confirmada</span><span className="block text-xs text-slate-500 dark:text-slate-400">Controla apenas a criação da factura; não envia email ao cliente.</span></span></label><div className="flex justify-end"><AnimatedButton variant="primary" type="submit" disabled={emissao.processing || !emissao.isDirty}>Guardar</AnimatedButton></div></form></AnimatedPanel>
                </ExpandableCard>
                <ExpandableCard title="Email de teste" description="Verificar a ligação do serviço" icon={Send} defaultOpen={false}>
                    <AnimatedPanel className="border-0 shadow-none rounded-none p-6"><form onSubmit={(e) => { e.preventDefault(); teste.post("/dev/email/teste", { preserveScroll: true }); }} className="flex flex-wrap items-end justify-between gap-3"><p className="text-sm text-slate-600 dark:text-slate-300">A mensagem de teste será enviada para o email da sua conta de developer.</p><AnimatedButton variant="primary" type="submit" disabled={teste.processing || !ligado || !activo}>Enviar teste para a minha conta</AnimatedButton></form>{(!ligado || !activo) && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Disponível depois de ligar o Gmail e configurar o transporte.</p>}</AnimatedPanel>
                </ExpandableCard>
            </div></div>
        </DevLayout>
    );
}