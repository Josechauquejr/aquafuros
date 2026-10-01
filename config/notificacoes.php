<?php

return [
    /*
    | Como as mensagens aos clientes saem:
    |  - "manual":  ficam numa fila e quem trabalha abre o WhatsApp (link com a mensagem pronta)
    |               e marca como enviada. Não precisa de nenhum serviço externo.
    |  - "webhook": o sistema envia cada mensagem por POST (JSON) para NOTIFICACOES_WEBHOOK_URL —
    |               o ponto de ligação a um serviço de SMS/WhatsApp (credenciais do fornecedor).
    */
    'driver' => env('NOTIFICACOES_DRIVER', 'manual'),

    'webhook_url' => env('NOTIFICACOES_WEBHOOK_URL'),
    'webhook_token' => env('NOTIFICACOES_WEBHOOK_TOKEN'),

    // Quando se geram lembretes (dias relativos ao vencimento da factura).
    'lembrete_antecedencia_dias' => 3,
    'atraso_dias' => 1,
    'atraso_grave_dias' => 15,
];
