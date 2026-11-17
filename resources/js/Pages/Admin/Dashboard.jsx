import { Head } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import PainelCiclo from "@/Components/PainelCiclo";

/** Painel do administrador: o ciclo do mês, o que precisa de atenção e o dinheiro. */
export default function Dashboard({ alertas, contadores, mesActual, dividaTotal, facturasVencidas }) {
    return (
        <AdminLayout>
            <Head title="Painel" />
            <PainelCiclo
                alertas={alertas}
                contadores={contadores}
                mes={mesActual}
                dividaTotal={dividaTotal}
                facturasVencidas={facturasVencidas}
            />
        </AdminLayout>
    );
}
