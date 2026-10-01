<?php

/*
 * Novidades do sistema. Cada entrada aparece UMA vez a cada utilizador, na
 * primeira página que abre depois da actualização.
 *
 * Para anunciar uma actualização: acrescente uma entrada NO FIM da lista com
 * um 'id' novo e único. A mais recente é a que se mostra; quem já viu o 'id'
 * não volta a vê-la. Cada novidade pode limitar-se a certos papéis com 'roles'
 * (sem 'roles' = para todos); se nenhuma servir ao utilizador, nada aparece.
 */

return [
    [
        'id' => '2026-10-01-emails-automaticos',
        'data' => '2026-10-01',
        'titulo' => 'Facturas e emails mais automáticos',
        'resumo' => 'Confirmar uma leitura passa a emitir a factura e enviá-la ao cliente. Tudo o que o sistema envia fica registado.',
        'novidades' => [
            [
                'titulo' => 'Factura emitida e enviada ao confirmar a leitura',
                'texto' => 'Ao confirmar uma leitura, a factura é emitida e enviada por email aos clientes que têm email. Pode ligar ou desligar cada passo em Administração > Email.',
                'roles' => ['administrador', 'gestor', 'tecnico'],
            ],
            [
                'titulo' => 'Emails enviados',
                'texto' => 'Nova página com todos os emails enviados aos clientes: para quem, quando, o que dizia, se foi automático ou manual e se falhou.',
                'roles' => ['administrador', 'gestor'],
            ],
            [
                'titulo' => 'Recibo e cobrança por email',
                'texto' => 'Depois de um pagamento, o cliente recebe o recibo. Quem tem dívidas recebe emails de cobrança com as facturas em anexo.',
                'roles' => ['administrador', 'gestor', 'caixa'],
            ],
            [
                'titulo' => 'Notificações do sistema',
                'texto' => 'Os alertas para a equipa têm agora página própria, com pesquisa e filtro por urgência, separados dos emails para clientes.',
                'roles' => ['administrador', 'gestor'],
            ],
            [
                'titulo' => 'Pagamentos, crédito e fecho de caixa',
                'texto' => 'Pague várias facturas do mesmo cliente com um só recibo, guarde adiantamentos como crédito e compare o dinheiro contado no fecho de caixa.',
                'roles' => ['administrador', 'gestor', 'caixa'],
            ],
            [
                'titulo' => 'Indicadores por mês',
                'texto' => 'Escolha o mês e o ano em Facturas, Pagamentos e Leituras. A página KPIs reúne a análise completa da cobrança.',
                'roles' => ['administrador', 'gestor'],
            ],
        ],
    ],
];
