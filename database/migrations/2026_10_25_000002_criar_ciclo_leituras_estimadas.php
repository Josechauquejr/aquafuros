<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leituras_estimadas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cliente_id')->constrained('clientes')->restrictOnDelete();
            $table->unsignedTinyInteger('mes');
            $table->unsignedSmallInteger('ano');
            $table->decimal('consumo_m3', 12, 2);
            $table->string('metodo', 20); // media_real, manual
            $table->json('leituras_base')->nullable();
            $table->text('motivo')->nullable();
            $table->string('estado', 20)->default('pendente'); // pendente, confirmada, facturada, reconciliada
            $table->foreignId('registado_por')->constrained('users')->restrictOnDelete();
            $table->foreignId('confirmado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('confirmado_em')->nullable();
            $table->foreignId('cancelado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('cancelado_em')->nullable();
            $table->text('motivo_cancelamento')->nullable();
            $table->foreignId('reconciliada_por_leitura_id')->nullable()->constrained('leituras')->nullOnDelete();
            $table->timestamps();
            $table->unique(['cliente_id', 'mes', 'ano']);
            $table->index(['cliente_id', 'estado', 'ano', 'mes']);
        });

        Schema::table('facturas', function (Blueprint $table) {
            $table->foreignId('leitura_estimada_id')->nullable()->unique()->constrained('leituras_estimadas')->nullOnDelete();
            $table->decimal('consumo_m3', 12, 2)->nullable();
            $table->decimal('valor_acerto_leitura', 12, 2)->default(0);
        });

        Schema::create('acertos_leitura', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cliente_id')->constrained('clientes')->restrictOnDelete();
            $table->foreignId('leitura_real_id')->unique()->constrained('leituras')->restrictOnDelete();
            $table->unsignedTinyInteger('mes_inicio');
            $table->unsignedSmallInteger('ano_inicio');
            $table->decimal('consumo_real_m3', 12, 2);
            $table->decimal('consumo_estimado_m3', 12, 2);
            $table->decimal('diferenca_m3', 12, 2);
            $table->decimal('valor_acerto', 12, 2);
            $table->string('estado', 20); // sem_acerto, por_facturar, facturado, credito
            $table->foreignId('factura_id')->nullable()->constrained('facturas')->nullOnDelete();
            $table->foreignId('credito_id')->nullable()->constrained('creditos')->nullOnDelete();
            $table->json('detalhes');
            $table->foreignId('registado_por')->constrained('users')->restrictOnDelete();
            $table->foreignId('aprovado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('aprovado_em')->nullable();
            $table->timestamps();
            $table->index(['cliente_id', 'estado']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('acertos_leitura');
        Schema::table('facturas', function (Blueprint $table) {
            $table->dropConstrainedForeignId('leitura_estimada_id');
            $table->dropColumn(['consumo_m3', 'valor_acerto_leitura']);
        });
        Schema::dropIfExists('leituras_estimadas');
    }
};
