<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('numeracoes_documentos', function (Blueprint $table) {
            $table->string('chave', 40)->primary();
            $table->unsignedBigInteger('proximo_numero');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('numeracoes_documentos');
    }
};
