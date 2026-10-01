<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Email do cliente (para lhe enviar as facturas) e o registo de cada
     * envio — para saber a quem, quando e se chegou a sair.
     */
    public function up(): void
    {
        Schema::table('clientes', function (Blueprint $table) {
            $table->string('email')->nullable()->after('telefone');
        });

        Schema::create('envios_email', function (Blueprint $table) {
            $table->id();
            $table->foreignId('factura_id')->constrained('facturas')->cascadeOnDelete();
            $table->foreignId('cliente_id')->constrained('clientes')->cascadeOnDelete();
            $table->string('email');
            $table->string('estado', 10);          // enviado, falhou
            $table->string('erro')->nullable();
            $table->foreignId('enviado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('envios_email');
        Schema::table('clientes', fn (Blueprint $t) => $t->dropColumn('email'));
    }
};
