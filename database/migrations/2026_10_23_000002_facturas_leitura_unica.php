<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $duplicadas = DB::table('facturas')
            ->select('leitura_id')
            ->whereNotNull('leitura_id')
            ->groupBy('leitura_id')
            ->havingRaw('COUNT(*) > 1')
            ->orderBy('leitura_id')
            ->pluck('leitura_id');

        if ($duplicadas->isNotEmpty()) {
            throw new RuntimeException(
                'Não foi possível criar a restrição única: estas leituras já têm mais de uma factura: '
                .$duplicadas->implode(', ')
                .'. Resolva os duplicados antes de voltar a executar a migração; nenhuma factura foi removida.'
            );
        }

        Schema::table('facturas', function (Blueprint $table) {
            $table->unique('leitura_id', 'facturas_leitura_id_unique');
        });
    }

    public function down(): void
    {
        Schema::table('facturas', function (Blueprint $table) {
            $table->dropUnique('facturas_leitura_id_unique');
        });
    }
};
