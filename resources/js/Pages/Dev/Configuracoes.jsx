import { Head, router, useForm, usePage } from "@inertiajs/react";
import { Building2, Clock, SlidersHorizontal } from "lucide-react";
import { motion } from "motion/react";
import { useRef, useState } from "react";
import DevLayout from "@/Layouts/DevLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import InlineNotice from "@/Components/InlineNotice";
import InputError from "@/Components/InputError";
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

export default function Configuracoes({ funcionalidades, horario, empresa }) {
    const { flash } = usePage().props;
    const horarioForm = useForm({
        inicio: decimalParaHora(horario.inicio),
        fim: decimalParaHora(horario.fim),
    });
    const empresaForm = useForm({
        nome: empresa.nome ?? "",
        nuit: empresa.nuit ?? "",
        localizacao: empresa.localizacao ?? "",
        logotipo: null,
    });
    const [previaLogotipo, setPrevisaLogotipo] = useState(null);
    const inputLogotipoRef = useRef(null);

    const alternarFuncionalidade = (funcionalidade) => {
        router.put(
            `/dev/configuracoes/funcionalidades/${funcionalidade.id}`,
            { activa: !funcionalidade.activa },
            { preserveScroll: true },
        );
    };

    const submitHorario = (event) => {
        event.preventDefault();
        // form.transform() só regista a transformação, não devolve o form —
        // tem de ser chamado à parte do put().
        horarioForm.transform((data) => ({
            inicio: horaParaDecimal(data.inicio),
            fim: horaParaDecimal(data.fim),
        }));
        horarioForm.put("/dev/configuracoes/horario", { preserveScroll: true });
    };

    const escolherLogotipo = (event) => {
        const ficheiro = event.target.files?.[0] ?? null;
        empresaForm.setData("logotipo", ficheiro);
        setPrevisaLogotipo(ficheiro ? URL.createObjectURL(ficheiro) : null);
    };

    const submitEmpresa = (event) => {
        event.preventDefault();
        empresaForm.post("/dev/configuracoes/empresa", {
            preserveScroll: true,
            onSuccess: () => {
                empresaForm.setData("logotipo", null);
                setPrevisaLogotipo(null);
                if (inputLogotipoRef.current) inputLogotipoRef.current.value = "";
            },
        });
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

                    <AnimatedPanel delay={0.05} className="p-6">
                        <h3 className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
                            <Building2 className="h-5 w-5 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
                            Dados da empresa
                        </h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Usados como padrão do sistema — aparecem no cabeçalho das facturas e recibos
                            impressos.
                        </p>

                        <form onSubmit={submitEmpresa} className="mt-4 space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <InputLabel htmlFor="empresa_nome" value="Nome da empresa" />
                                    <TextInput
                                        id="empresa_nome"
                                        required
                                        value={empresaForm.data.nome}
                                        onChange={(event) => empresaForm.setData("nome", event.target.value)}
                                        className="mt-1 block w-full"
                                    />
                                    <InputError message={empresaForm.errors.nome} className="mt-1" />
                                </div>
                                <div>
                                    <InputLabel htmlFor="empresa_nuit" value="NUIT" />
                                    <TextInput
                                        id="empresa_nuit"
                                        value={empresaForm.data.nuit}
                                        onChange={(event) => empresaForm.setData("nuit", event.target.value)}
                                        className="mt-1 block w-full"
                                    />
                                    <InputError message={empresaForm.errors.nuit} className="mt-1" />
                                </div>
                            </div>

                            <div>
                                <InputLabel htmlFor="empresa_localizacao" value="Localização" />
                                <TextInput
                                    id="empresa_localizacao"
                                    value={empresaForm.data.localizacao}
                                    onChange={(event) => empresaForm.setData("localizacao", event.target.value)}
                                    className="mt-1 block w-full"
                                    placeholder="Ex: Maputo, Moçambique"
                                />
                                <InputError message={empresaForm.errors.localizacao} className="mt-1" />
                            </div>

                            <div>
                                <InputLabel htmlFor="empresa_logotipo" value="Logotipo" />
                                <div className="mt-1 flex items-center gap-4">
                                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                                        {previaLogotipo || empresa.logotipoUrl ? (
                                            <img
                                                src={previaLogotipo ?? empresa.logotipoUrl}
                                                alt="Logotipo actual"
                                                className="h-full w-full object-contain"
                                            />
                                        ) : (
                                            <Building2 className="h-6 w-6 text-slate-300 dark:text-slate-700" aria-hidden="true" />
                                        )}
                                    </div>
                                    <input
                                        id="empresa_logotipo"
                                        ref={inputLogotipoRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={escolherLogotipo}
                                        className="block text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200 dark:text-slate-300 dark:file:bg-slate-800 dark:file:text-slate-200 dark:hover:file:bg-slate-700"
                                    />
                                </div>
                                <InputError message={empresaForm.errors.logotipo} className="mt-1" />
                            </div>

                            <PrimaryButton type="submit" disabled={empresaForm.processing}>
                                Guardar dados da empresa
                            </PrimaryButton>
                        </form>
                    </AnimatedPanel>

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
