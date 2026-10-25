<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');


// Pulso do agendador: renova-se a cada minuto e o painel do Desenvolvedor (Saúde)
// avisa se parar — é assim que se sabe que o cron/schedule:run está mesmo a correr.
Schedule::call(fn () => Cache::put(\App\Support\SaudeSistema::PULSO_AGENDADOR, time(), now()->addMinutes(10)))->everyMinute()->name('pulso-agendador');
