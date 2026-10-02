<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Códigos de 6 dígitos enviados por email (verificação do email e recuperação
     * da palavra-passe). Guarda-se só o hash do código, com validade e um limite de
     * tentativas. Os emails de código não têm cliente: `cliente_id` passa a ser opcional.
     */
    public function up(): void
    {
        Schema::create('codigos_email', function (Blueprint $table) {
            $table->id();
            $table->string('email');
            $table->string('finalidade', 20);       // verificacao, recuperacao
            $table->string('codigo_hash');
            $table->unsignedTinyInteger('tentativas')->default(0);
            $table->timestamp('expira_em');
            $table->timestamps();

            $table->unique(['email', 'finalidade']);
        });

        Schema::table('envios_email', function (Blueprint $table) {
            $table->unsignedBigInteger('cliente_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('codigos_email');
    }
};
