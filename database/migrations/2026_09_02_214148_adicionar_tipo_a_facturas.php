<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('facturas', function (Blueprint $table) {
            // 'consumo' = factura normal, gerada a partir de uma leitura.
            // 'ligacao' = taxa única de novo contrato/ligação de água, sem
            // leitura associada (leitura_id fica null nesse caso).
            $table->enum('tipo', ['consumo', 'ligacao'])->default('consumo')->after('leitura_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('facturas', function (Blueprint $table) {
            $table->dropColumn('tipo');
        });
    }
};
