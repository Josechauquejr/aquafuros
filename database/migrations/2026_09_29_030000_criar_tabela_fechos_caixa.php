<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fechos_caixa', function (Blueprint $table) {
            $table->id();
            $table->foreignId('utilizador_id')->constrained('users')->restrictOnDelete();
            $table->date('data');
            $table->decimal('total_geral', 12, 2)->default(0);
            $table->json('total_por_metodo')->nullable();
            $table->unsignedInteger('numero_pagamentos')->default(0);
            $table->foreignId('fechado_por')->constrained('users')->restrictOnDelete();
            $table->timestamps();

            // Um caixa só pode fechar o mesmo dia uma vez.
            $table->unique(['utilizador_id', 'data']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fechos_caixa');
    }
};
