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
        // Um registo por excepção reportada pela aplicação — complementa o
        // ficheiro de log por omissão do Laravel com uma vista consultável
        // na interface pelo Desenvolvedor (mensagem, ficheiro:linha, URL).
        Schema::create('erros_sistema', function (Blueprint $table) {
            $table->id();
            $table->text('mensagem');
            $table->string('excepcao');
            $table->string('ficheiro')->nullable();
            $table->integer('linha')->nullable();
            $table->string('url', 2048)->nullable();
            $table->string('metodo', 10)->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('trace')->nullable();
            $table->boolean('resolvido')->default(false);
            $table->timestamp('created_at')->nullable();

            $table->index(['resolvido', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('erros_sistema');
    }
};
