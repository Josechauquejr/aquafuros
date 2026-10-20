<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
            UPDATE facturas AS origem
            SET transferida_para_id = (
                SELECT destino.id
                FROM facturas AS destino
                WHERE destino.cliente_id = origem.cliente_id
                  AND destino.estado IN ('pendente', 'parcial')
                  AND destino.created_at >= origem.created_at
                  AND destino.deleted_at IS NULL
                ORDER BY destino.created_at DESC, destino.id DESC
                LIMIT 1
            )
            WHERE origem.estado = 'transferida'
              AND origem.transferida_para_id IS NULL
        SQL);
    }

    public function down(): void
    {
        // Não remove relações históricas de transferência.
    }
};
