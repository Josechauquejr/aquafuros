<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // A Laravel não guarda quando uma tarefa agendada correu pela última vez:
        // este registo (uma linha por tarefa) é o que o painel do Desenvolvedor mostra.
        Schema::create('execucoes_agendadas', function (Blueprint $table) {
            $table->id();
            $table->string('nome')->unique();   // ex.: notificacoes:gerar
            $table->timestamp('executada_em');
            $table->string('estado', 10);       // ok | falhou
            $table->unsignedInteger('duracao_ms')->nullable();
            $table->string('erro', 300)->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('execucoes_agendadas');
    }
};
