<?php

use App\Services\ReconciliarFacturasOrigem;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void { app(ReconciliarFacturasOrigem::class)->executar(); }
    public function down(): void { throw new RuntimeException('A reconciliação financeira preserva o histórico e não tem reversão automática.'); }
};
