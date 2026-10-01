<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Cópia de segurança de cada alteração feita pelo painel do Desenvolvedor:
        // os valores de antes e de depois de cada linha, para poder desfazer.
        Schema::create('dev_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('acao', 80);          // ex.: editar | limpar_emails_invalidos
            $table->string('tabela', 80);
            $table->unsignedInteger('total');    // linhas afectadas
            $table->boolean('reversivel')->default(true);
            $table->json('linhas')->nullable();  // [{id, antes:{...}, depois:{...}}]
            $table->json('resumo')->nullable();  // o que não é reversível (ex.: apagados), só para registo
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('desfeita_em')->nullable();
            $table->foreignId('desfeita_por')->nullable()->constrained('users')->nullOnDelete();

            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dev_snapshots');
    }
};
