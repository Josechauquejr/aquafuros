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
];
