<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Base da inteligência artificial: cada chamada ao Gemini fica registada
 * (quem, para quê, tokens, duração) para controlar custos e limites; e os
 * erros do sistema guardam a explicação gerada para não a pagar duas vezes.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pedidos_ia', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('funcionalidade', 50);
            $table->string('modelo', 80);
            $table->unsignedInteger('tokens_entrada')->default(0);
            $table->unsignedInteger('tokens_saida')->default(0);
            $table->unsignedInteger('duracao_ms')->default(0);
            $table->boolean('sucesso')->default(true);
            $table->text('erro')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['funcionalidade', 'created_at']);
        });

        Schema::table('erros_sistema', function (Blueprint $table) {
            $table->json('explicacao_ia')->nullable();
            $table->timestamp('explicacao_ia_em')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('erros_sistema', function (Blueprint $table) {
            $table->dropColumn(['explicacao_ia', 'explicacao_ia_em']);
        });

        Schema::dropIfExists('pedidos_ia');
    }
};
