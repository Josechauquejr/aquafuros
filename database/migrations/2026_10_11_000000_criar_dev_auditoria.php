<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dev_auditoria', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('acao', 120);          // ex.: dev.users.reset-password
            $table->string('alvo', 255)->nullable(); // o que foi tocado (ex.: user #3)
            $table->json('detalhes')->nullable();    // campos enviados (sem segredos), resultado, antes/depois
            $table->string('ip', 45)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('created_at');
            $table->index(['user_id', 'created_at']);
            $table->index('acao');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dev_auditoria');
    }
};
