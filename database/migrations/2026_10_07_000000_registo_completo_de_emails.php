<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * `envios_email` passa a ser o registo de TODOS os emails que o sistema
     * envia (facturas, lembretes, avisos de atraso, cobranças): para quem, com
     * que assunto, o que dizia (corpo), que anexos levou, se saiu ou falhou, e
     * se foi automático ou à mão (e de quem).
     */
    public function up(): void
    {
        Schema::table('envios_email', function (Blueprint $table) {
            $table->unsignedBigInteger('factura_id')->nullable()->change();
            $table->string('tipo', 30)->default('factura')->after('cliente_id'); // factura, lembrete_vencimento, atraso, atraso_grave, cobranca
            $table->string('origem', 12)->default('manual')->after('tipo');      // automatico, manual
            $table->string('assunto')->nullable()->after('email');
            $table->json('anexos')->nullable()->after('erro');
            $table->longText('corpo')->nullable()->after('anexos');
            $table->index(['tipo', 'estado']);
        });
    }

    public function down(): void
    {
        Schema::table('envios_email', function (Blueprint $table) {
            $table->dropIndex(['tipo', 'estado']);
            $table->dropColumn(['tipo', 'origem', 'assunto', 'anexos', 'corpo']);
        });
    }
};
