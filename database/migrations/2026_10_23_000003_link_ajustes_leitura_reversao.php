<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ajustes_leitura', function (Blueprint $table) {
            $table->foreignId('ajuste_revertido_id')
                ->nullable()
                ->unique()
                ->constrained('ajustes_leitura')
                ->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('ajustes_leitura', function (Blueprint $table) {
            $table->dropForeign(['ajuste_revertido_id']);
            $table->dropUnique(['ajuste_revertido_id']);
            $table->dropColumn('ajuste_revertido_id');
        });
    }
};
