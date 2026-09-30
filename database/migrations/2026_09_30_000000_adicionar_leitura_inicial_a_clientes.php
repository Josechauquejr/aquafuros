<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Leitura do contador no momento em que o cliente entra no sistema. A
 * primeira leitura usa-a como "anterior"; sem ela, o primeiro consumo era
 * calculado desde 0 e o cliente pagava o histórico inteiro do contador.
 * Nullable: os clientes já existentes não têm este valor e não são alterados.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clientes', function (Blueprint $table) {
            $table->decimal('leitura_inicial', 10, 2)->nullable()->after('estado');
        });
    }

    public function down(): void
    {
        Schema::table('clientes', function (Blueprint $table) {
            $table->dropColumn('leitura_inicial');
        });
    }
};
