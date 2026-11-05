<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Registo das isenções mensais de multa: o interruptor continua em
 * `configuracoes` (multa_isenta_AAAAMM); aqui fica o porquê, quem decidiu e
 * quando o mês voltou a ter multas.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('isencoes_multa_mensais', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('ano');
            $table->unsignedTinyInteger('mes');
            $table->text('motivo');
            $table->foreignId('desactivada_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('desactivada_em')->nullable();
            $table->timestamp('reactivada_em')->nullable();
            $table->foreignId('reactivada_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['ano', 'mes']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('isencoes_multa_mensais');
    }
};
