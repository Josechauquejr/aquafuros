<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('empresa_perfil', function (Blueprint $table) {
            $table->string('mpesa_numero', 50)->nullable();
            $table->string('mpesa_titular')->nullable();
            $table->string('emola_numero', 50)->nullable();
            $table->string('emola_titular')->nullable();
        });

        // Preserva os dados de pagamento anteriormente publicados nas facturas.
        DB::table('empresa_perfil')->updateOrInsert(['id' => 1], [
            'mpesa_numero' => '853754024',
            'mpesa_titular' => 'José Chaúque',
            'emola_numero' => '876781920',
            'emola_titular' => 'José Chauque',
        ]);
    }

    public function down(): void
    {
        Schema::table('empresa_perfil', fn (Blueprint $table) => $table->dropColumn([
            'mpesa_numero', 'mpesa_titular', 'emola_numero', 'emola_titular',
        ]));
    }
};
