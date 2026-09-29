<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Hoje anula-se uma factura sem registar porquê. Isto guarda o motivo,
 * quem anulou e quando — as anuladas continuam a nunca ser apagadas, só
 * passam a ter um registo do que aconteceu.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('facturas', function (Blueprint $table) {
            $table->text('motivo_anulacao')->nullable()->after('estado');
            $table->foreignId('anulada_por')->nullable()->after('motivo_anulacao')->constrained('users')->nullOnDelete();
            $table->timestamp('anulada_em')->nullable()->after('anulada_por');
        });
    }

    public function down(): void
    {
        Schema::table('facturas', function (Blueprint $table) {
            $table->dropConstrainedForeignId('anulada_por');
            $table->dropColumn(['motivo_anulacao', 'anulada_em']);
        });
    }
};
