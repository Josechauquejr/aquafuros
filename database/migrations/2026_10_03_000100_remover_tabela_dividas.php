<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A tabela `dividas` deixou de ser usada: a dívida de cada cliente é
     * sempre calculada a partir das facturas (Cliente::saldoEmAberto() e
     * dividaEmAtraso()). Só `data_ultimo_pagamento` ia sendo gravada, e isso
     * obtém-se dos pagamentos.
     */
    public function up(): void
    {
        Schema::dropIfExists('dividas');
    }

    public function down(): void
    {
        Schema::create('dividas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cliente_id')->unique()->constrained('clientes')->restrictOnDelete();
            $table->decimal('valor_divida', 10, 2)->default(0.00);
            $table->tinyInteger('meses_atraso')->unsigned()->default(0);
            $table->boolean('em_corte')->default(false);
            $table->date('data_ultimo_pagamento')->nullable();
            $table->timestamps();
        });
    }
};
