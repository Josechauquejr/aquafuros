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
        // Tabela de uma única linha (singleton) — identidade da empresa usada
        // como padrão em toda a app (cabeçalho das facturas/recibos, etc.),
        // editável só pelo Desenvolvedor. Separada de `configuracoes` porque
        // aquela é estritamente numérica (Configuracao::valor()/definir()).
        Schema::create('empresa_perfil', function (Blueprint $table) {
            $table->id();
            $table->string('nome')->default('Aquafuros');
            $table->string('nuit')->nullable();
            $table->string('localizacao')->nullable();
            $table->string('logotipo_path')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('empresa_perfil');
    }
};
