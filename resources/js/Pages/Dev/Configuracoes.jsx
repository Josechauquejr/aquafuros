import { Head, router, useForm, usePage } from "@inertiajs/react";
import { Clock, SlidersHorizontal } from "lucide-react";
import { motion } from "motion/react";
import DevLayout from "@/Layouts/DevLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import InlineNotice from "@/Components/InlineNotice";
import InputLabel from "@/Components/InputLabel";
import PrimaryButton from "@/Components/PrimaryButton";
import TextInput from "@/Components/TextInput";
import { itemVariants, listVariants } from "@/lib/motion";

function decimalParaHora(decimal) {
    const horas = Math.floor(decimal);
    const minutos = Math.round((decimal - horas) * 60);
    return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
}

function horaParaDecimal(hora) {
    const [horas, minutos] = hora.split(":").map(Number);
    return horas + (minutos || 0) / 60;
}

export default function Configuracoes({ funcionalidades, horario }) {
    const { flash } = usePage().props;
    const horarioForm = useForm({
        inicio: decimalParaHora(horario.inicio),
        fim: decimalParaHora(horario.fim),
    });

    const alternarFuncionalidade = (funcionalidade) => {
        router.put(
            `/dev/configuracoes/funcionalidades/${funcionalidade.id}`,
            { activa: !funcionalidade.activa },
            { preserveScroll: true },
        );
    };

    const submitHorario = (event) => {
        event.preventDefault();
        horarioForm.transform((data) => ({
            inicio: horaParaDecimal(data.inicio),
            fim: horaParaDecimal(data.fim),
        })).put("/dev/configuracoes/horario", { preserveScroll: true });
    };

    const semRestricao = horario.fim <= horario.inicio;

    return (
        <DevLayout
            header={
                <div>
                    <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">Desenvolvedor</p>
                    <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">
                        Configurações do Sistema
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Activar/desactivar secções e definir o horário de acesso à plataforma.
                    </p>
                </div>
            }
        >
            <Head title="Configurações do Sistema" />

            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-4xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <InlineNotice show={Boolean(flash.status)}>{flash.status}</InlineNotice>

                    <AnimatedPanel delay={0.1} className="overflow-hidden">
                        <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                            <h3 className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
                                <SlidersHorizontal className="h-5 w-5 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
                                Secções do sistema
                            </h3>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Desactivar bloqueia o acesso a todos os papéis, excepto administrador e
                                desenvolvedor.
                            </p>
                        </div>
                        <motion.div variants={listVariants} initial="hidden" animate="show" className="divide-y divide-slate-100 dark:divide-slate-800">
                            {funcionalidades.map((funcionalidade) => (
                                <motion.div
                                    key={funcionalidade.id}
                                    variants={itemVariants}
                                    className="flex items-center justify-between gap-3 px-6 py-4"
                                >
                                    <p className="font-medium text-slate-900 dark:text-white">{funcionalidade.nome}</p>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={funcionalidade.activa}
                                        onClick={() => alternarFuncionalidade(funcionalidade)}
                                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
                                            funcionalidade.activa ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700"
                                        }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                                                funcionalidade.activa ? "translate-x-6" : "translate-x-1"
                                            }`}
                                        />
                                    </button>
                                </motion.div>
                            ))}
                        </motion.div>
                    </AnimatedPanel>

                    <AnimatedPanel delay={0.2} className="p-6">
                        <h3 className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
                            <Clock className="h-5 w-5 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
                            Horário de acesso à plataforma
                        </h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Bloqueia o acesso fora deste horário para todos os papéis, excepto desenvolvedor.
                            {semRestricao && " Actualmente sem restrição — acesso permitido a qualquer hora."}
                        </p>

                        <form onSubmit={submitHorario} className="mt-4 grid gap-4 sm:grid-cols-2">
                            <div>
                                <InputLabel htmlFor="inicio" value="Início" />
                                <TextInput
                                    id="inicio"
                                    type="time"
                                    value={horarioForm.data.inicio}
                                    onChange={(event) => horarioForm.setData("inicio", event.target.value)}
                                    className="mt-1 block w-full"
                                />
                            </div>
                            <div>
                                <InputLabel htmlFor="fim" value="Fim" />
                                <TextInput
                                    id="fim"
                                    type="time"
                                    value={horarioForm.data.fim}
                                    onChange={(event) => horarioForm.setData("fim", event.target.value)}
                                    className="mt-1 block w-full"
                                />
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 sm:col-span-2">
                                Defina início e fim iguais (ou fim antes do início) para remover a restrição.
                            </p>
                            <div className="sm:col-span-2">
                                <PrimaryButton type="submit" disabled={horarioForm.processing}>
                                    Guardar horário
                                </PrimaryButton>
                            </div>
                        </form>
                    </AnimatedPanel>
                </div>
            </div>
        </DevLayout>
    );
}
