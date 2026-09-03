<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Configurações de negócio editáveis a partir da interface (ex.: a
        // taxa de ligação de novo contrato) — substitui os valores fixos
        // que antes viviam em config/aquafuros.php.
        Schema::create('configuracoes', function (Blueprint $table) {
            $table->id();
            $table->string('chave', 100)->unique();
            $table->decimal('valor', 10, 2);
            $table->timestamps();
        });

        DB::table('configuracoes')->insert([
            'chave' => 'taxa_ligacao_nova',
            'valor' => (float) env('AQUAFUROS_TAXA_LIGACAO_NOVA', 3250.00),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('configuracoes');
    }
};
