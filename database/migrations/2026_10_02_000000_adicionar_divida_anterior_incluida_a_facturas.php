<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Até aqui o `total_pagar` de cada factura incluía a dívida anterior do
     * cliente, que continuava também em aberto nas facturas antigas — a mesma
     * dívida contada duas vezes. A partir de agora a dívida anterior é só
     * informativa (não entra no total). As facturas já existentes ficam
     * marcadas como "incluída" (true) para os relatórios as saberem
     * descontar; as novas são criadas com false.
     */
    public function up(): void
    {
        Schema::table('facturas', function (Blueprint $table) {
            $table->boolean('divida_anterior_incluida')->default(true)->after('divida_anterior');
        });
    }

    public function down(): void
    {
        Schema::table('facturas', function (Blueprint $table) {
            $table->dropColumn('divida_anterior_incluida');
        });
    }
};
