<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * - leituras: quem confirmou e quando (para o tempo do ciclo e a
     *   segregação de funções registar/confirmar);
     * - pagamentos: `pago_em` = quando o dinheiro foi realmente pago (pode ser
     *   anterior ao registo, p. ex. uma transferência confirmada dias depois);
     *   é com esta data que se contam os relatórios;
     * - fechos de caixa: dinheiro contado e a diferença para o registado.
     */
    public function up(): void
    {
        Schema::table('leituras', function (Blueprint $table) {
            $table->foreignId('confirmado_por')->nullable()->after('confirmado')->constrained('users')->nullOnDelete();
            $table->timestamp('confirmado_em')->nullable()->after('confirmado_por');
        });

        Schema::table('pagamentos', function (Blueprint $table) {
            $table->timestamp('pago_em')->nullable()->after('referencia_pagamento')->index();
        });
        DB::table('pagamentos')->update(['pago_em' => DB::raw('created_at')]);

        Schema::table('fechos_caixa', function (Blueprint $table) {
            $table->decimal('valor_contado', 12, 2)->nullable()->after('total_por_metodo');
            $table->decimal('diferenca', 12, 2)->nullable()->after('valor_contado');
        });
    }

    public function down(): void
    {
        Schema::table('fechos_caixa', fn (Blueprint $t) => $t->dropColumn(['valor_contado', 'diferenca']));
        Schema::table('pagamentos', fn (Blueprint $t) => $t->dropColumn('pago_em'));
        Schema::table('leituras', function (Blueprint $t) {
            $t->dropConstrainedForeignId('confirmado_por');
            $t->dropColumn('confirmado_em');
        });
    }
};
