<?php

namespace App\Providers;

use App\Mail\GmailTransport;
use App\Support\Agendador;
use Illuminate\Console\Events\ScheduledTaskFailed;
use Illuminate\Console\Events\ScheduledTaskFinished;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Support\Facades\DB;
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

        // Recolhe métricas sem guardar cada SQL e bindings em memória durante
        // todo o pedido (o query log pesava especialmente nas páginas analíticas).
        DB::listen(function (QueryExecuted $query): void {
            if (! app()->bound('request')) {
                return;
            }

            $request = request();
            if (! $request->attributes->has('_inicio_pedido')) {
                return;
            }

            $request->attributes->set('_tempo_bd_ms', ($request->attributes->get('_tempo_bd_ms') ?? 0) + $query->time);
            $request->attributes->set('_consultas', ($request->attributes->get('_consultas') ?? 0) + 1);
        });

        // Guarda quando cada tarefa agendada correu (e se falhou) para o painel do Desenvolvedor.
        Event::listen(ScheduledTaskFinished::class, Agendador::registarExecucao(...));
        Event::listen(ScheduledTaskFailed::class, Agendador::registarExecucao(...));
    }
}
