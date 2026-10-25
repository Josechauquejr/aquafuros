<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        // A migration de reconciliacao so criava esta constraint quando ja
        // existiam facturas. Em bases novas ficava o CHECK antigo, sem
        // permitir o estado `transferida` usado pela propria reconciliacao.
        DB::statement('ALTER TABLE facturas DROP CONSTRAINT IF EXISTS facturas_estado_check');
        DB::statement("ALTER TABLE facturas ADD CONSTRAINT facturas_estado_check CHECK (estado IN ('pendente', 'paga', 'parcial', 'anulada', 'transferida'))");
    }

    public function down(): void
    {
        // Nao remover `transferida`: pode haver facturas historicas nesse estado.
    }
};
