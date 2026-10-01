<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Lembretes de vencimento e avisos de atraso aos clientes — todos os dias às 08:00 (hora de Maputo).
// Precisa do agendador do Laravel a correr (cron: php artisan schedule:run, 1x por minuto).
Schedule::command('notificacoes:gerar')->dailyAt('08:00')->withoutOverlapping();
