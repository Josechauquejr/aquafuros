<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * O checklist do desenvolvedor e as alterações de dados pelo painel foram
 * retirados do sistema; as tabelas deixaram de ter uso. O down() recria a
 * estrutura (não os dados).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('tarefas_dev');
        Schema::dropIfExists('dev_snapshots');
    }

    public function down(): void
    {
        Schema::create('tarefas_dev', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('titulo');
            $table->text('descricao')->nullable();
            $table->boolean('concluida')->default(false);
            $table->timestamps();
        });

        Schema::create('dev_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('acao', 80);
            $table->string('tabela', 80);
            $table->unsignedInteger('total');
            $table->boolean('reversivel')->default(true);
            $table->json('linhas')->nullable();
            $table->json('resumo')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('desfeita_em')->nullable();
            $table->foreignId('desfeita_por')->nullable()->constrained('users')->nullOnDelete();

            $table->index('created_at');
        });
    }
};
