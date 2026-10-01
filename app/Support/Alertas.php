<?php

namespace App\Support;

use App\Models\Leitura;
use App\Models\Notificacao;
use App\Models\Ocorrencia;
use App\Models\PromessaPagamento;

/**
 * Lista "A precisar de atenção" dos painéis: só aparece o que tem alguma
 * coisa por tratar. Os de controlo (anulações, referências, caixas) são só do
 * administrador; os de cobrança e operação também servem ao gestor.
 *
 * @return array<int, array{chave: string, nivel: string, titulo: string, detalhe: string, quantidade: int, href: ?string}>
 */
class Alertas
{
    public static function para(bool $incluirControlo): array
    {
        $risco = AnaliseRisco::risco();
        $alertas = [];

        $adicionar = function (string $chave, string $nivel, string $titulo, string $detalhe, int $quantidade, ?string $href = null) use (&$alertas) {
            if ($quantidade > 0) {
                $alertas[] = compact('chave', 'nivel', 'titulo', 'detalhe', 'quantidade', 'href');
            }
        };

        $adicionar('risco-corte', 'alto', 'Clientes em risco de corte',
            'Dívida em atraso igual ou acima do limiar de corte da tarifa — '.number_format($risco['emRiscoCorte']['valor'], 2, ',', ' ').' MZN',
            $risco['emRiscoCorte']['total'], '/clientes?so_divida=1');
        $adicionar('tres-vencidas', 'alto', 'Clientes com 3 ou mais facturas vencidas',
            'Mais de dois meses sem pagar', $risco['com3Vencidas'], '/facturas?estado=vencida');
        $adicionar('sem-pagar', 'medio', 'Clientes que não pagam há 3 meses',
            'Têm facturas em aberto e nenhum pagamento nos últimos 3 meses', $risco['semPagar3Meses']['total'], '/clientes?so_divida=1');

        $ciclo = AnaliseRisco::ciclo(now());
        $adicionar('leituras-atraso', 'medio', 'Clientes por ler depois do dia limite',
            'O prazo das leituras (dia '.$ciclo['diaLimite'].') já passou e ainda faltam leituras', $ciclo['semLeituraAposLimite'], '/leituras');

        PromessaPagamento::avaliarPendentes();
        $adicionar('promessas-falhadas', 'alto', 'Promessas de pagamento falhadas (últimos 7 dias)',
            'O cliente prometeu pagar e não pagou — voltar a contactar',
            PromessaPagamento::where('estado', 'falhada')->where('avaliada_em', '>=', now()->subDays(7))->count(), '/cobranca?filtro=promessa_falhada');
        $adicionar('sem-contacto', 'medio', 'Clientes em atraso sem contacto há 15 dias',
            'Ninguém falou com eles ainda', AnaliseOperacional::cobranca(now())['semContacto15d'], '/cobranca?filtro=sem_contacto');
        $adicionar('ocorrencias', 'alto', 'Ocorrências abertas há mais de 48 horas',
            'Avarias ou reclamações por resolver',
            Ocorrencia::where('estado', '!=', 'resolvida')->where('reportada_em', '<', now()->subHours(48))->count(), '/ocorrencias');
        $adicionar('mensagens', 'medio', 'Mensagens a clientes por enviar',
            'Lembretes e avisos de atraso à espera de serem enviados', Notificacao::where('estado', 'pendente')->count(), '/notificacoes');
        $perdas = AnaliseOperacional::perdas(now());
        $adicionar('perdas', 'alto', 'Perdas de água acima de 30% este mês',
            'Produzido '.number_format($perdas['produzidoM3'], 0, ',', ' ').' m³, facturado '.number_format($perdas['facturadoM3'], 0, ',', ' ').' m³',
            ($perdas['perdasPct'] ?? 0) > 30 ? 1 : 0, '/producao');

        $adicionar('sem-factura', 'medio', 'Leituras confirmadas sem factura há mais de 7 dias',
            'Trabalho feito que ainda não gera receita',
            Leitura::where('confirmado', true)->whereDoesntHave('factura')->where('updated_at', '<', now()->subDays(7))->count(), '/facturas');

        if ($incluirControlo) {
            $controlo = AnaliseRisco::controlo(now());

            $adicionar('anulada-com-pagamentos', 'alto', 'Facturas anuladas com pagamentos registados',
                'Dinheiro recebido sem factura válida — '.number_format($controlo['anuladasComPagamentos']['valor'], 2, ',', ' ').' MZN',
                $controlo['anuladasComPagamentos']['total'], '/admin/kpis');
            $adicionar('sem-referencia', 'medio', 'Pagamentos electrónicos sem referência este mês',
                'M-Pesa, e-Mola ou transferência sem número de referência para verificar',
                $controlo['electronicosSemReferencia']['quantidade'], '/pagamentos');
            $adicionar('diferenca-caixa', 'alto', 'Fechos de caixa com diferença este mês',
                'O dinheiro contado não bate com o registado — diferença total '.number_format($controlo['diferencasCaixa']['soma'], 2, ',', ' ').' MZN',
                $controlo['diferencasCaixa']['total'], '/admin/kpis');
            $adicionar('sem-fecho', 'medio', 'Dias com pagamentos e a caixa por fechar',
                'Caixas que receberam dinheiro e não foram fechadas', $controlo['caixasSemFecho']['total'], '/pagamentos/fecho-caixa');
        }

        usort($alertas, fn ($a, $b) => ($a['nivel'] === 'alto' ? 0 : 1) <=> ($b['nivel'] === 'alto' ? 0 : 1));

        return $alertas;
    }
}
