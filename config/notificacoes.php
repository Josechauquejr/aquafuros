<?php

return [
    // Quando se geram os emails de cobrança (dias relativos ao vencimento da factura).
    // São enviados por email, só a clientes que têm email, todos os dias às 08:00.
    'lembrete_antecedencia_dias' => 3,
    'atraso_dias' => 1,
    'atraso_grave_dias' => 15,
    // Intervalo mínimo entre cobranças automáticas para o mesmo cliente.
    'intervalo_minimo_dias' => 7,
];
