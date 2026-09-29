<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * "Vencida" não é guardado como estado — é sempre calculado (pendente ou
 * parcial + data_vencimento no passado). Isto evita uma tarefa agendada
 * para migrar estados e garante que nunca desincroniza.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('facturas', function (Blueprint $table) {
            $table->date('data_vencimento')->nullable()->after('ano');
        });

        // Facturas já existentes não têm data de emissão explícita — usa-se
        // created_at + 15 dias (o prazo de pagamento já documentado em
        // Tarifas/Índex) para que o cálculo de "vencida" também se aplique
        // ao histórico, não só às facturas emitidas a partir de agora.
        DB::statement("UPDATE facturas SET data_vencimento = (created_at + INTERVAL '15 days')::date WHERE data_vencimento IS NULL");
    }

    public function down(): void
    {
        Schema::table('facturas', function (Blueprint $table) {
            $table->dropColumn('data_vencimento');
        });
    }
};
