<?php

namespace App\Support\IA;

use App\Models\User;

/** Procedimentos estáveis da interface, separados dos indicadores dinâmicos. */
class OrientacoesAssistente
{
    public static function para(User $user): array
    {
        $guias = [];

        if ($user->hasAnyRole(['administrador', 'gestor', 'tecnico'])) {
            $guias['leituras'] = [
                'accao' => 'Registar leitura',
                'passos' => [
                    'Na página Leituras, seleccione Registar leitura.',
                    'Pesquise e escolha o cliente; confirme o mês e o ano.',
                    'Introduza a leitura actual mostrada no contador. A leitura anterior é preenchida pelo sistema e o consumo é calculado automaticamente.',
                    'Reveja o consumo e os avisos antes de guardar. Confirme apenas quando o valor estiver correcto.',
                ],
                'nota' => 'Depois de confirmada, a leitura fica bloqueada para edição. Conforme a configuração, a confirmação também pode emitir a factura.',
            ];
            $guias['ocorrencias'] = [
                'passos' => ['Na página Ocorrências, registe o tipo e a descrição do problema.', 'Indique o cliente ou a zona afectados, quando souber.', 'Inicie o tratamento e, ao terminar, descreva a resolução.'],
            ];
            $guias['producao'] = [
                'passos' => ['Na página Produção, escolha o período.', 'Registe o volume produzido e a zona ou origem pedida no formulário.', 'Reveja os valores antes de guardar.'],
            ];
        }

        if ($user->hasAnyRole(['administrador', 'gestor'])) {
            $guias['clientes'] = [
                'passos' => ['Na página Clientes, seleccione Novo cliente.', 'Preencha os dados da ligação e escolha a zona e a tarifa.', 'Confira o contador inicial e os dados de contacto antes de guardar.'],
            ];
            $guias['facturas'] = [
                'passos' => ['Na página Facturas, filtre pelo período ou estado.', 'Abra uma factura para consultar consumo, multas, total e pagamentos.', 'Para facturar leituras, use o fluxo de facturação disponível na página e reveja a pré-visualização antes de confirmar.'],
            ];
            $guias['cobranca'] = [
                'passos' => ['Na página Cobrança, filtre e priorize as facturas vencidas.', 'Registe o contacto e o resultado, incluindo uma promessa de pagamento quando existir.', 'Actualize o acompanhamento depois de receber o pagamento.'],
            ];
        }

        if ($user->hasAnyRole(['administrador', 'gestor', 'caixa'])) {
            $guias['pagamentos'] = [
                'passos' => ['Na página Pagamentos, procure o cliente e seleccione a factura paga.', 'Introduza o valor recebido e o método de pagamento; preencha a referência quando aplicável.', 'Confira e registe o pagamento. Depois, consulte ou imprima o recibo.'],
            ];
        }

        return $guias;
    }
}
