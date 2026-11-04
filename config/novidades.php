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
        'titulo' => 'Email reservado a acessos e senhas',
        'resumo' => 'O email do sistema é usado para links de definição de senha para contas novas, verificação e reposição de senha.',
        'novidades' => [
            [
                'titulo' => 'Senha inicial de novos utilizadores',
                'texto' => 'Quando o developer cria uma conta, o utilizador recebe um link pessoal para definir a senha. A senha não é enviada em texto simples.',
                'roles' => ['administrador', 'gestor', 'tecnico'],
            ],
            [
                'titulo' => 'Histórico de emails de autenticação',
                'texto' => 'Consulte os envios de códigos de verificação e links de senha, incluindo falhas.',
                'roles' => ['administrador', 'gestor'],
            ],
            [
                'titulo' => 'Reposição de senha',
                'texto' => 'O utilizador recebe um link seguro por email e define uma nova senha sem receber uma senha em texto simples.',
                'roles' => ['administrador', 'gestor', 'caixa'],
            ],
            [
                'titulo' => 'Notificações do sistema',
                'texto' => 'Os alertas para a equipa têm agora página própria, com pesquisa e filtro por urgência, separados dos códigos de autenticação.',
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
    [
        'id' => '2026-11-04-multas-mensais-recuperaveis',
        'data' => '2026-11-04',
        'titulo' => 'Gestão mensal de multas',
        'resumo' => 'Consulte os meses com multas activas ou isentas, desactive multas por mês e reponha valores dispensados.',
        'novidades' => [
            [
                'titulo' => 'Onde encontrar',
                'texto' => 'Aceda a Tarifas > Multas por mês. Esta opção está disponível apenas para administradores.',
                'roles' => ['administrador'],
            ],
            [
                'titulo' => 'Ver o estado de cada mês',
                'texto' => 'Escolha o ano nas setas. Verde indica Sem multa e âmbar indica Multa activa. Cada mês mostra também quantas multas podem ser recuperadas e o respectivo valor.',
                'roles' => ['administrador'],
            ],
            [
                'titulo' => 'Desactivar ou reactivar multas',
                'texto' => 'Use a acção no cartão do mês e confirme. Ao desactivar, os valores de multas em aberto ficam guardados para poderem ser repostos.',
                'roles' => ['administrador'],
            ],
            [
                'titulo' => 'Repor multas dispensadas',
                'texto' => 'Quando um mês tiver valores recuperáveis, seleccione Repor multas e confirme. Os valores voltam às facturas, o estado é recalculado conforme os pagamentos e as multas do mês são reactivadas. Valores já pagos não mudam.',
                'roles' => ['administrador'],
            ],
            [
                'titulo' => 'Prazo de pagamento',
                'texto' => 'As facturas emitidas entre os dias 20 e 29 vencem no dia 10 do mês seguinte. As multas só se aplicam depois do vencimento, excepto nos meses desactivados.',
                'roles' => ['administrador'],
            ],
        ],
    ],
];
