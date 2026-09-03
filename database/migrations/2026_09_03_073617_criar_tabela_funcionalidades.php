<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Interruptor por secção do sistema — o Desenvolvedor pode
        // desactivar uma secção inteira (ex.: Pagamentos) para todos os
        // papéis excepto administrador/desenvolvedor.
        Schema::create('funcionalidades', function (Blueprint $table) {
            $table->id();
            $table->string('chave', 50)->unique();
            $table->string('nome');
            $table->boolean('activa')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('funcionalidades');
    }
};
