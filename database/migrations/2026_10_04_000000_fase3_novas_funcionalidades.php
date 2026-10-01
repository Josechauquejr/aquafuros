<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Fase 3: zonas, cobrança (contactos e promessas), notificações,
     * ocorrências (avarias e reclamações), produção de água e crédito de clientes.
     */
    public function up(): void
    {
        // ---- Zonas: o bairro de texto livre passa a ser uma lista estruturada.
        Schema::create('zonas', function (Blueprint $table) {
            $table->id();
            $table->string('nome')->unique();
            $table->timestamps();
        });

        Schema::table('clientes', function (Blueprint $table) {
            $table->foreignId('zona_id')->nullable()->after('bairro')->constrained('zonas')->nullOnDelete();
        });

        // Cada bairro já usado vira uma zona e os clientes ficam ligados a ela.
        $bairros = DB::table('clientes')->whereNotNull('bairro')->where('bairro', '!=', '')
            ->pluck('bairro')->map(fn ($b) => trim($b))->filter()->unique()->values();
        foreach ($bairros as $bairro) {
            $id = DB::table('zonas')->insertGetId(['nome' => $bairro, 'created_at' => now(), 'updated_at' => now()]);
            DB::table('clientes')->where('bairro', $bairro)->update(['zona_id' => $id]);
        }

        // ---- Cobrança
        Schema::create('contactos_cobranca', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cliente_id')->constrained('clientes')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->string('canal', 20);      // telefone, presencial, whatsapp, sms, outro
            $table->string('resultado', 30);  // sem_resposta, prometeu_pagar, recusou, pagou, outro
            $table->text('nota')->nullable();
            $table->timestamps();
        });

        Schema::create('promessas_pagamento', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cliente_id')->constrained('clientes')->cascadeOnDelete();
            $table->foreignId('contacto_id')->nullable()->constrained('contactos_cobranca')->nullOnDelete();
            $table->decimal('valor', 10, 2);
            $table->date('data_prometida');
            $table->string('estado', 15)->default('pendente'); // pendente, cumprida, falhada, cancelada
            $table->foreignId('criado_por')->constrained('users')->restrictOnDelete();
            $table->timestamp('avaliada_em')->nullable();
            $table->timestamps();
        });

        // ---- Notificações a clientes (fila de mensagens: lembretes e avisos)
        Schema::create('notificacoes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cliente_id')->constrained('clientes')->cascadeOnDelete();
            $table->foreignId('factura_id')->nullable()->constrained('facturas')->cascadeOnDelete();
            $table->string('tipo', 30);   // lembrete_vencimento, atraso, atraso_grave
            $table->string('canal', 15)->default('whatsapp');
            $table->string('telefone', 20)->nullable();
            $table->text('mensagem');
            $table->string('estado', 15)->default('pendente'); // pendente, enviada, falhou
            $table->timestamp('enviada_em')->nullable();
            $table->string('erro')->nullable();
            $table->timestamps();
            $table->unique(['cliente_id', 'factura_id', 'tipo']);
        });

        // ---- Ocorrências (avarias e reclamações)
        Schema::create('ocorrencias', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cliente_id')->nullable()->constrained('clientes')->nullOnDelete();
            $table->foreignId('zona_id')->nullable()->constrained('zonas')->nullOnDelete();
            $table->string('tipo', 20);     // sem_agua, fuga, avaria, contador, reclamacao, outro
            $table->text('descricao');
            $table->string('estado', 15)->default('aberta'); // aberta, em_curso, resolvida
            $table->timestamp('reportada_em');
            $table->timestamp('iniciada_em')->nullable();
            $table->timestamp('resolvida_em')->nullable();
            $table->foreignId('registado_por')->constrained('users')->restrictOnDelete();
            $table->foreignId('resolvido_por')->nullable()->constrained('users')->nullOnDelete();
            $table->text('resolucao')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // ---- Produção de água (para calcular perdas)
        Schema::create('producoes_agua', function (Blueprint $table) {
            $table->id();
            $table->foreignId('zona_id')->nullable()->constrained('zonas')->cascadeOnDelete(); // null = o sistema todo
            $table->unsignedTinyInteger('mes');
            $table->unsignedSmallInteger('ano');
            $table->decimal('volume_m3', 12, 2);
            $table->foreignId('registado_por')->constrained('users')->restrictOnDelete();
            $table->timestamps();
        });

        // ---- Crédito de clientes (adiantamentos e excessos)
        Schema::create('creditos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cliente_id')->constrained('clientes')->cascadeOnDelete();
            $table->string('tipo', 15);               // entrada, utilizacao
            $table->decimal('valor', 10, 2);          // com sinal: entrada +, utilização −
            $table->string('metodo_pagamento', 15)->nullable();
            $table->string('referencia_pagamento')->nullable();
            $table->string('numero_recibo', 20)->nullable()->unique(); // só nos adiantamentos recebidos à parte
            $table->foreignId('pagamento_id')->nullable()->constrained('pagamentos')->nullOnDelete(); // pagamento que o gerou ou usou
            $table->foreignId('recebido_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('pago_em')->nullable();
            $table->string('nota')->nullable();
            $table->timestamps();
        });

        Schema::table('pagamentos', function (Blueprint $table) {
            // Pagamento feito com crédito do cliente: conta como receita mas não entrou dinheiro agora.
            $table->boolean('origem_credito')->default(false)->after('lote');
        });
    }

    public function down(): void
    {
        Schema::table('pagamentos', fn (Blueprint $t) => $t->dropColumn('origem_credito'));
        Schema::dropIfExists('creditos');
        Schema::dropIfExists('producoes_agua');
        Schema::dropIfExists('ocorrencias');
        Schema::dropIfExists('notificacoes');
        Schema::dropIfExists('promessas_pagamento');
        Schema::dropIfExists('contactos_cobranca');
        Schema::table('clientes', function (Blueprint $t) {
            $t->dropConstrainedForeignId('zona_id');
        });
        Schema::dropIfExists('zonas');
    }
};
