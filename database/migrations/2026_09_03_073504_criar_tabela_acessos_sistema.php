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
        // Um registo por pedido autenticado — quem, quando, o quê, de onde
        // (IP/dispositivo). Alimenta o painel de Desenvolvedor: acessos por
        // utilizador, uso por secção, e serve de log de "execuções".
        Schema::create('acessos_sistema', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('url', 2048);
            $table->string('metodo', 10);
            $table->string('ip', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->unsignedSmallInteger('status_code')->nullable();
            $table->timestamp('created_at')->nullable();

            $table->index(['user_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('acessos_sistema');
    }
};
