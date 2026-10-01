<?php

namespace App\Console\Commands;

use App\Support\Notificacoes;
use Illuminate\Console\Command;

/** Gera os lembretes de vencimento e avisos de atraso do dia e envia os pendentes (se houver canal configurado). */
class GerarNotificacoes extends Command
{
    protected $signature = 'notificacoes:gerar';

    protected $description = 'Gera os lembretes e avisos de atraso aos clientes e envia os pendentes';

    public function handle(): int
    {
        if (! Notificacoes::automaticas()) {
            $this->comment('Emails automáticos de cobrança desligados (Administração > Email).');

            return self::SUCCESS;
        }

        $criadas = Notificacoes::gerar();
        $enviadas = Notificacoes::enviarPendentes();

        $this->info("{$criadas} email(s) de cobrança criado(s), {$enviadas} enviado(s).");

        return self::SUCCESS;
    }
}
