<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Um cliente pode pagar várias facturas de uma só vez. Cada factura
     * continua a ter o seu próprio pagamento/recibo (assim estados, dívida,
     * estornos e fecho de caixa não mudam); `lote` é o identificador comum
     * dos pagamentos que nasceram da mesma entrega de dinheiro.
     */
    public function up(): void
    {
        Schema::table('pagamentos', function (Blueprint $table) {
            $table->uuid('lote')->nullable()->after('referencia_pagamento')->index();
        });
    }

    public function down(): void
    {
        Schema::table('pagamentos', function (Blueprint $table) {
            $table->dropColumn('lote');
        });
    }
};
