<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * As cobranças passam a sair por EMAIL (e não por WhatsApp). A fila ganha o
     * endereço de destino; as mensagens que ainda estavam por enviar herdam o
     * email do cliente e, se o cliente não tem email, são retiradas da fila
     * (não há como as enviar — o sistema só envia a quem tem email).
     */
    public function up(): void
    {
        Schema::table('notificacoes', function (Blueprint $table) {
            $table->string('email')->nullable()->after('canal');
        });

        DB::table('notificacoes')->where('estado', 'pendente')->update([
            'canal' => 'email',
            'email' => DB::raw('(select email from clientes where clientes.id = notificacoes.cliente_id)'),
        ]);
        DB::table('notificacoes')->where('estado', 'pendente')->where(fn ($q) => $q->whereNull('email')->orWhere('email', ''))->delete();
    }

    public function down(): void
    {
        Schema::table('notificacoes', fn (Blueprint $t) => $t->dropColumn('email'));
    }
};
