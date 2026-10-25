<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('acessos_sistema', function (Blueprint $table) {
            $table->unsignedInteger('consultas')->nullable()->after('tempo_bd_ms');
        });
    }

    public function down(): void
    {
        Schema::table('acessos_sistema', function (Blueprint $table) {
            $table->dropColumn('consultas');
        });
    }
};
