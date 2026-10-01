import { AlertTriangle, CheckCircle2, CircleHelp, FileText, HelpCircle, ListChecks, Mail, MousePointerClick, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import IconButton from "@/Components/IconButton";

const guias = {
    "/clientes": ["Clientes", "Cadastre clientes, organize zonas e consulte a situação financeira de cada ligação.", [[ListChecks, "Localizar", "Use pesquisa e filtros por nome, número, estado, zona ou dívida."], [MousePointerClick, "Abrir a ficha", "Expanda o cliente para consultar facturas, pagamentos e leituras."], [Sparkles, "Cadastrar ou editar", "Use Novo cliente. Também pode criar um bairro/zona directamente no formulário."], [CheckCircle2, "Acompanhar", "O estado mostra se está activo, inactivo ou cortado. Alterações ficam no histórico."]], "Confirme telefone, email, zona e leitura inicial antes de guardar."],
    "/leituras": ["Leituras", "Registe o consumo mensal para permitir o cálculo correcto da factura.", [[ListChecks, "Escolher", "Abra Nova leitura e pesquise o cliente pelo nome ou número."], [MousePointerClick, "Informar", "Digite a leitura actual; o sistema compara com a leitura anterior."], [AlertTriangle, "Verificar", "Consumos muito altos podem indicar erro, fuga ou problema no contador."], [CheckCircle2, "Confirmar", "A leitura confirmada fica pronta para facturação."]], "Confira o número directamente no contador antes de confirmar."],
    "/facturas": ["Facturas", "Consulte valores facturados, pagamentos e documentos enviados aos clientes.", [[ListChecks, "Filtrar", "Pesquise por cliente e filtre por período, estado ou tipo."], [FileText, "Consultar", "Abra a factura para ver consumo, multas, total e pagamentos associados."], [Mail, "Enviar", "Envie uma factura individual ou várias em lote para clientes com email."], [CheckCircle2, "Acompanhar", "Pendente e parcial têm valor em aberto; paga e anulada não devem ser cobradas."]], "Antes de cobrar, confirme o estado e o valor em falta."],
    "/pagamentos": ["Pagamentos", "Registe recebimentos, actualize facturas e disponibilize recibos.", [[ListChecks, "Seleccionar", "Pesquise o cliente e escolha a factura que está a ser paga."], [MousePointerClick, "Confirmar", "Informe valor, método de pagamento e referência quando existir."], [CheckCircle2, "Concluir", "A factura passa para paga ou parcial automaticamente."], [FileText, "Emitir recibo", "Imprima ou consulte o recibo depois do pagamento; ele também pode ser enviado por email."]], "Em pagamentos parciais, confirme o saldo restante antes de finalizar."],
    "/cobranca": ["Cobrança", "Organize contactos com clientes em atraso e acompanhe promessas de pagamento.", [[ListChecks, "Priorizar", "Filtre por zona, falta de contacto, promessa pendente ou falhada."], [MousePointerClick, "Contactar", "Registe canal, resultado, nota, valor prometido e data combinada."], [Mail, "Enviar facturas", "Escolha um cliente para enviar todas as facturas vencidas num único email."], [CheckCircle2, "Actualizar", "Depois do pagamento, a dívida e a lista de atraso são actualizadas."]], "Registe também contactos sem resposta para evitar tentativas sem contexto."],
    "/ocorrencias": ["Ocorrências", "Acompanhe avarias, falta de água e reclamações até à resolução.", [[ListChecks, "Registar", "Informe tipo, descrição e, se possível, cliente e zona afectados."], [MousePointerClick, "Iniciar", "Use Iniciar quando alguém assumir o tratamento; passa para Em curso."], [CheckCircle2, "Resolver", "Descreva o que foi feito. Data e responsável ficam registados."], [AlertTriangle, "Reabrir", "Se o problema voltar, reabra para manter o trabalho visível."]], "Indique local, sintomas, horário e cliente afectado numa descrição concreta."],
    "/notificacoes": ["Email e notificações", "Prepare mensagens de cobrança e acompanhe o resultado dos envios.", [[ListChecks, "Seleccionar", "Escolha o cliente e confirme as facturas vencidas que serão anexadas."], [Mail, "Enviar", "A mensagem inclui resumo da dívida e PDFs das facturas elegíveis."], [AlertTriangle, "Verificar falhas", "Consulte o erro e tente novamente depois de corrigir a configuração."], [CheckCircle2, "Consultar histórico", "Em Emails enviados veja destinatário, data, estado e tentativas."]], "O cliente precisa de email válido e o Gmail deve estar configurado."],
};

const resultados = {
    Clientes: "No final, o cliente fica registado e disponível para leituras, facturação, pagamentos e cobrança.",
    Leituras: "No final, a leitura confirmada pode gerar o consumo e a factura do período.",
    Facturas: "No final, consegue saber o valor devido, enviar o documento e acompanhar o pagamento.",
    Pagamentos: "No final, o saldo da factura é actualizado e o recibo fica disponível.",
    Cobrança: "No final, a equipa sabe quem foi contactado, o que foi prometido e quais dívidas continuam pendentes.",
    Ocorrências: "No final, a ocorrência fica resolvida ou reaberta com o responsável e a data registados.",
    "Email e notificações": "No final, consegue confirmar se a mensagem foi enviada, falhou ou precisa de ser reenviada.",
};

export default function PageHelp({ url }) {
    const [aberto, setAberto] = useState(false);
    const reduzirMovimento = useReducedMotion();
    const chave = Object.keys(guias).find((item) => url === item || url.startsWith(`${item}/`));
    if (!chave) return null;
    const [titulo, objetivo, passos, dica] = guias[chave];
    const passosFluxo = chave === "/pagamentos"
        ? [...passos.slice(0, 2), [CheckCircle2, "Concluir e entregar recibo", "A factura passa para paga ou parcial; o recibo fica disponível para imprimir ou enviar por email."]]
        : chave === "/ocorrencias"
            ? [...passos.slice(0, 2), [CheckCircle2, "Resolver ou reabrir", "Registe o que foi feito. Se o problema voltar, reabra a mesma ocorrência para preservar o histórico."]]
            : chave === "/notificacoes"
                ? [[CheckCircle2, "Confirmar configuração", "Antes do primeiro envio, confirme que a conta Gmail está ligada."], ...passos.slice(0, 2), [FileText, "Gerar mensagem", "O sistema prepara o resumo da dívida e os PDFs elegíveis."], passos[3]]
                : passos;
    return <div className="relative">
        <IconButton title={`Ajuda: ${titulo}`} onClick={() => setAberto((v) => !v)} className="h-9 w-9 border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            {aberto ? <X className="h-4 w-4" aria-hidden="true" /> : <HelpCircle className="h-4 w-4" aria-hidden="true" />}
        </IconButton>
        <AnimatePresence initial={false}>
        {aberto && <motion.div
            initial={reduzirMovimento ? { opacity: 0 } : { opacity: 0, transform: "translateY(-6px) scale(0.98)" }}
            animate={reduzirMovimento ? { opacity: 1 } : { opacity: 1, transform: "translateY(0) scale(1)" }}
            exit={reduzirMovimento ? { opacity: 0 } : { opacity: 0, transform: "translateY(-6px) scale(0.98)" }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className="page-help-card fixed inset-x-2 top-16 z-50 max-h-[calc(100vh-5.5rem)] overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900 sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-[30rem] sm:max-h-[calc(100vh-5rem)]">
            <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300"><CircleHelp className="h-5 w-5" aria-hidden="true" /></span><div><p className="text-base font-semibold text-slate-950 dark:text-white">Como funciona: {titulo}</p><p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">{objetivo}</p></div></div>
            <div className="mt-5"><p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Fluxo completo</p><div className="space-y-4">{passosFluxo.map(([Icon, nome, detalhe], i) => <div key={nome} className="relative flex gap-3">{i < passosFluxo.length - 1 && <span className="absolute left-4 top-8 h-5 border-l border-dashed border-slate-300 dark:border-slate-700" />}<span className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><Icon className="h-4 w-4" aria-hidden="true" /></span><div><p className="text-sm font-semibold text-slate-900 dark:text-white"><span className="mr-1 text-cyan-700 dark:text-cyan-300">{i + 1}.</span>{nome}</p><p className="mt-0.5 text-xs leading-5 text-slate-600 dark:text-slate-400">{detalhe}</p></div></div>)}</div></div>
            <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"><strong>Resultado:</strong> {resultados[titulo]}</div>
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"><strong>Dica prática:</strong> {dica}</div>
        </motion.div>}
        </AnimatePresence>
    </div>;
}
