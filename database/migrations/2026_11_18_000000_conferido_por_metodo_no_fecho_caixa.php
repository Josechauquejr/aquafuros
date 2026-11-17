<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Fecho do dia: além do dinheiro contado, o caixa confere cada método
 * electrónico (M-Pesa, E-Mola, Banco). Guarda-se o que escreveu por método.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fechos_caixa', function (Blueprint $table) {
            $table->json('conferido_por_metodo')->nullable()->after('total_por_metodo');
        });
    }

    public function down(): void
    {
        Schema::table('fechos_caixa', function (Blueprint $table) {
            $table->dropColumn('conferido_por_metodo');
        });
    }
};
