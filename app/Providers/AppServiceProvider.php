<?php

namespace App\Providers;

use App\Mail\GmailTransport;
use App\Support\Agendador;
use Illuminate\Console\Events\ScheduledTaskFailed;
use Illuminate\Console\Events\ScheduledTaskFinished;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Mail::extend('gmail', fn () => new GmailTransport());

        // Guarda quando cada tarefa agendada correu (e se falhou) para o painel do Desenvolvedor.
        Event::listen(ScheduledTaskFinished::class, Agendador::registarExecucao(...));
        Event::listen(ScheduledTaskFailed::class, Agendador::registarExecucao(...));
    }
}
