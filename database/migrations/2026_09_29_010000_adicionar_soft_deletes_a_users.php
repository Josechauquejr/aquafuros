<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Sem isto, eliminar um utilizador era definitivo e imediato — a única
 * eliminação em toda a app sem rede de segurança de 30 dias, e que ainda
 * por cima desliga a autoria de facturas/leituras/pagamentos antigos
 * (geradaPor/registadoPor/recebidoPor apontam para um id que deixa de
 * existir).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
