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
        Schema::create('tarifas', function (Blueprint $table){
            $table->id();
            $table->string('nome');
            $table->decimal('preco_m3', 10, 2)->default(70.00);
            $table->decimal('taxa_minima', 10, 2)->default(350.00);
            $table->decimal('consumo_minimo_m3', 10, 2)->default(5.00);
            $table->decimal('percentagem_multa', 5, 4)->default(0.1000);
            $table->decimal('limiar_corte', 10, 2)->default(700);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('clientes', function (Blueprint $table){
            $table->id();
            $table->string('numero_cliente', 20)->unique();
            $table->string('nome');
            $table->string('endereco')->nullable();
            $table->string('telefone', 20)->nullable();
            $table->string('bairro')->nullable();        
            $table->foreignId('tarifa_id')->constrained('tarifas')->restrictOnDelete();
            $table->enum('estado',['ativo','inativo','cortado'])->default('ativo');
            $table->date('data_adesao')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('leituras', function (Blueprint $table){
            $table->id();
            $table->foreignId('cliente_id')->constrained('clientes')->onDelete('cascade');
            $table->tinyInteger('mes')->unsigned();
            $table->smallInteger('ano')->unsigned();
            $table->decimal('leitura_anterior', 10, 2)->default(0.00);
            $table->decimal('leitura_actual', 10, 2);
            $table->boolean('confirmado')->default(false);
            $table->foreignId('registado_por')->constrained('users')->restrictOnDelete();
            $table->timestamps();

            $table->unique(['cliente_id', 'mes', 'ano']);
        });

        Schema::create('facturas', function (Blueprint $table){
            $table->id();
            $table->string('numero_factura', 20)->unique();// ex, FAT-2026-0001
            $table->foreignId('cliente_id')->constrained('clientes')->restrictOnDelete();
            $table->foreignId('leitura_id')->nullable()->constrained('leituras')->nullOnDelete();
            $table->tinyInteger('mes')->unsigned();
            $table->smallInteger('ano')->unsigned();
            $table->decimal('valor_consumo', 10, 2)->default(0.00);
            $table->decimal('divida_anterior', 10, 2)->default(0.00);
            $table->decimal('multa', 10, 2)->default(0.00);
            $table->decimal('total_pagar', 10, 2)->default(0.00);
            $table->enum('estado',['pendente','paga','parcial','anulada'])->default('pendente');
            $table->foreignId('gerada_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('pagamentos', function (Blueprint $table){
            $table->id();
            $table->string('numero_recibo', 20)->unique();// ex: REC-2025-001
            $table->foreignId('factura_id')->constrained('facturas')->restrictOnDelete();
            $table->foreignId('cliente_id')->constrained('clientes')->restrictOnDelete();
            $table->decimal('valor_pago', 10, 2)->default(0.00);
            $table->enum('metodo_pagamento',['dinheiro','banco','mpesa','e-mola'])->default('dinheiro');
            $table->string('referencia_pagamento')->nullable();
            $table->foreignId('recebido_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('dividas', function (Blueprint $table){
            $table->id();
            $table->foreignId('cliente_id')->unique()->constrained('clientes')->restrictOnDelete();
            $table->decimal('valor_divida', 10, 2)->default(0.00);
            $table->tinyInteger('meses_atraso')->unsigned()->default(0);
            $table->boolean('em_corte')->default(false);
            $table->date('data_ultimo_pagamento')->nullable();
            $table->timestamps();

        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dividas');
        Schema::dropIfExists('pagamentos');
        Schema::dropIfExists('facturas');
        Schema::dropIfExists('leituras');
        Schema::dropIfExists('clientes');
        Schema::dropIfExists('tarifas');
    }
};
