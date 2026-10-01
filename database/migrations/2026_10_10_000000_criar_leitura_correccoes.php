<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leitura_correccoes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('leitura_id')->constrained('leituras')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users');
            $table->decimal('leitura_antes', 12, 2);
            $table->decimal('leitura_depois', 12, 2);
            $table->string('motivo', 1000);

            // O que a correcção mexeu, para a poder desfazer: a factura (valores
            // de antes) e a leitura seguinte do cliente (leitura anterior de antes).
            $table->foreignId('factura_id')->nullable()->constrained('facturas')->nullOnDelete();
            $table->json('factura_antes')->nullable();
            $table->foreignId('leitura_seguinte_id')->nullable()->constrained('leituras')->nullOnDelete();
            $table->decimal('leitura_seguinte_anterior_antes', 12, 2)->nullable();

            $table->timestamp('desfeita_em')->nullable();
            $table->foreignId('desfeita_por')->nullable()->constrained('users');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leitura_correccoes');
    }
};
