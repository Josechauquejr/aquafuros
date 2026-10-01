<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Como nas facturas: anular uma leitura regista o motivo, quem anulou e
 * quando. A leitura vai para a lixeira, nunca é apagada de vez.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leituras', function (Blueprint $table) {
            $table->text('motivo_anulacao')->nullable();
            $table->foreignId('anulada_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('anulada_em')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('leituras', function (Blueprint $table) {
            $table->dropConstrainedForeignId('anulada_por');
            $table->dropColumn(['motivo_anulacao', 'anulada_em']);
        });
    }
};
