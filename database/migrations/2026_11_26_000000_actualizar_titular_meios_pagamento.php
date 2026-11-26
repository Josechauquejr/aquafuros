<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /** Todas as contas de pagamento (M-Pesa e E-Mola) estão em nome de José Zeferino Chauque. */
    public function up(): void
    {
        DB::table('empresa_perfil')->update([
            'mpesa_titular' => 'José Zeferino Chauque',
            'emola_titular' => 'José Zeferino Chauque',
        ]);
    }

    public function down(): void
    {
        DB::table('empresa_perfil')->update([
            'mpesa_titular' => 'José Chaúque',
            'emola_titular' => 'José Chauque',
        ]);
    }
};
