<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leituras', function (Blueprint $table) {
            $table->string('numero_leitura', 20)->nullable()->unique()->after('id');
        });

        DB::table('leituras')
            ->orderBy('ano')
            ->orderBy('mes')
            ->orderBy('id')
            ->get()
            ->groupBy(fn ($leitura) => sprintf('%04d%02d', $leitura->ano, $leitura->mes))
            ->each(function ($leituras, $periodo) {
                foreach ($leituras->values() as $indice => $leitura) {
                    DB::table('leituras')->where('id', $leitura->id)->update([
                        'numero_leitura' => sprintf('LEI-%s-%04d', $periodo, $indice + 1),
                    ]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('leituras', function (Blueprint $table) {
            $table->dropUnique(['numero_leitura']);
            $table->dropColumn('numero_leitura');
        });
    }
};
