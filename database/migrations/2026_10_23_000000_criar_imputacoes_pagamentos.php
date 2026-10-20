<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('facturas', function (Blueprint $table) {
            $table->json('emissao_original')->nullable();
            $table->decimal('saldo_inicial', 10, 2)->default(0);
        });
        Schema::create('factura_saldos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('factura_id')->constrained('facturas')->restrictOnDelete();
            $table->foreignId('origem_id')->constrained('facturas')->restrictOnDelete();
            $table->unique(['factura_id', 'origem_id']);
        });
        Schema::create('pagamento_imputacoes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pagamento_id')->constrained('pagamentos')->cascadeOnDelete();
            $table->foreignId('factura_id')->constrained('facturas')->restrictOnDelete();
            $table->decimal('valor_principal', 10, 2)->default(0);
            $table->decimal('valor_multa', 10, 2)->default(0);
            $table->string('origem', 30)->default('pagamento');
            $table->unique(['pagamento_id', 'factura_id']);
        });
        // Leitura por factura: mantém o recibo original e expõe apenas a
        // parcela que realmente liquidou esta factura. A caixa usa pagamentos.
        DB::statement(<<<'SQL'
            CREATE VIEW pagamentos_aplicados AS
            SELECT p.id, p.numero_recibo, i.factura_id, p.cliente_id,
                   (i.valor_principal + i.valor_multa) AS valor_pago,
                   i.valor_principal, i.valor_multa, p.valor_pago AS valor_recibo,
                   p.factura_id AS factura_documento_id, p.metodo_pagamento,
                   p.referencia_pagamento, p.recebido_por, p.created_at, p.updated_at,
                   p.deleted_at, p.pago_em, p.lote, p.origem_credito
            FROM pagamentos p JOIN pagamento_imputacoes i ON i.pagamento_id = p.id
            UNION ALL
            SELECT p.id, p.numero_recibo, p.factura_id, p.cliente_id, p.valor_pago,
                   p.valor_pago AS valor_principal, 0 AS valor_multa, p.valor_pago AS valor_recibo,
                   p.factura_id AS factura_documento_id, p.metodo_pagamento,
                   p.referencia_pagamento, p.recebido_por, p.created_at, p.updated_at,
                   p.deleted_at, p.pago_em, p.lote, p.origem_credito
            FROM pagamentos p
            WHERE NOT EXISTS (SELECT 1 FROM pagamento_imputacoes i WHERE i.pagamento_id = p.id)
        SQL);
    }

    public function down(): void
    {
        throw new RuntimeException('A reconciliação financeira conserva os documentos originais e não deve ser revertida por eliminação das imputações.');
    }
};
