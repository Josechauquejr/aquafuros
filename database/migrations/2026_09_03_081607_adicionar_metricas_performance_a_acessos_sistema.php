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
        // Tempo total do pedido e tempo especificamente gasto em consultas à
        // base de dados — para o gráfico de performance do Desenvolvedor.
        Schema::table('acessos_sistema', function (Blueprint $table) {
            $table->unsignedInteger('duracao_ms')->nullable()->after('status_code');
            $table->unsignedInteger('tempo_bd_ms')->nullable()->after('duracao_ms');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('acessos_sistema', function (Blueprint $table) {
            $table->dropColumn(['duracao_ms', 'tempo_bd_ms']);
        });
    }
};
