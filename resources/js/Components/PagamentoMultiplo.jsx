import RegistarPagamento from "@/Components/RegistarPagamento";

// Compatibilidade com chamadas antigas: ambos os fluxos usam o mesmo formulário.
export default function PagamentoMultiplo({ show, ...props }) {
    return show ? <RegistarPagamento {...props} /> : null;
}