<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('facturas', function (Blueprint $table) {
            $table->foreignId('transferida_para_id')->nullable()->after('divida_anterior_incluida')
                ->constrained('facturas')->nullOnDelete();
            $table->decimal('multa_anterior', 10, 2)->default(0)->after('multa');
        });
    }

    public function down(): void
    {
        Schema::table('facturas', function (Blueprint $table) {
            $table->dropColumn('multa_anterior');
            $table->dropConstrainedForeignId('transferida_para_id');
        });
    }
};
