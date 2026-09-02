<?php

// Constantes de negócio do Aquafuros que não fazem sentido "hardcoded"
// espalhadas pelos controllers.
return [
    // Taxa cobrada uma única vez, no momento de um novo contrato de
    // fornecimento de água (nova ligação), em Meticais (MT).
    'taxa_ligacao_nova' => (float) env('AQUAFUROS_TAXA_LIGACAO_NOVA', 3250.00),
];
