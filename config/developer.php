<?php

/*
 * Painel do Desenvolvedor.
 *
 * DEV_ESCRITA liga as operações que ALTERAM dados (editar registos, operações
 * em massa, desfazer). Vem DESLIGADA: ligue-a só quando for precisa, com a
 * variável de ambiente DEV_ESCRITA=true (em Railway: Variables), e desligue-a
 * depois. Com ela desligada, nenhuma dessas rotas executa nada.
 */
return [
    'escrita' => (bool) env('DEV_ESCRITA', false),
];
