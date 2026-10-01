<?php

namespace App\Console\Commands;

use App\Models\EnvioEmail;
use App\Models\Notificacao;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class EstadoEmails extends Command
{
    protected $signature = 'emails:estado';

    protected $description = 'Mostra o estado dos emails e da fila de processamento';

    public function handle(): int
    {
        $this->table(['Indicador', 'Quantidade'], [
            ['Emails enviados', EnvioEmail::where('estado', 'enviado')->count()],
            ['Emails falhados', EnvioEmail::where('estado', 'falhou')->count()],
            ['Cobranças por enviar', Notificacao::where('estado', 'pendente')->count()],
            ['Cobranças falhadas', Notificacao::where('estado', 'falhou')->count()],
            ['Jobs na fila', DB::table('jobs')->count()],
            ['Jobs falhados', DB::table('failed_jobs')->count()],
        ]);

        return self::SUCCESS;
    }
}
