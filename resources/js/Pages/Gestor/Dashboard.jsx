import { Head } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import PainelCiclo from "@/Components/PainelCiclo";

/** Painel do gestor: o mesmo do administrador, sem os alertas de controlo interno. */
export default function Dashboard({ alertas, contadores, resumoMes, dividaTotal, facturasVencidas }) {
    return (
        <AdminLayout>
            <Head title="Painel" />
            <PainelCiclo
                alertas={alertas}
                contadores={contadores}
                mes={resumoMes}
                dividaTotal={dividaTotal}
                facturasVencidas={facturasVencidas}
            />
        </AdminLayout>
    );
}
