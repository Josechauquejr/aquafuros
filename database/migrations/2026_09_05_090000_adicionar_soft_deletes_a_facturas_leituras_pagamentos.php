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
        // Ao eliminar um cliente, as suas facturas/leituras/pagamentos vão
        // para a lixeira junto com ele (30 dias para restaurar ou apagar
        // definitivamente), em vez de desaparecerem de imediato.
        Schema::table('facturas', fn (Blueprint $table) => $table->softDeletes());
        Schema::table('leituras', fn (Blueprint $table) => $table->softDeletes());
        Schema::table('pagamentos', fn (Blueprint $table) => $table->softDeletes());
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('facturas', fn (Blueprint $table) => $table->dropSoftDeletes());
        Schema::table('leituras', fn (Blueprint $table) => $table->dropSoftDeletes());
        Schema::table('pagamentos', fn (Blueprint $table) => $table->dropSoftDeletes());
    }
};
