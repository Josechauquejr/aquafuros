<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

$app = Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // O Railway (tal como a Vercel, Heroku, etc.) termina o HTTPS na borda
        // e reencaminha para o container em HTTP simples, indicando o esquema
        // original via X-Forwarded-Proto. Sem isto, a Laravel gera URLs de
        // assets/rotas como http:// mesmo em produção (erro de "Mixed Content").
        $middleware->trustProxies(at: '*');

        $middleware->alias([
            'redirect.by.role' => \App\Http\Middleware\RedirectRole::class,
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
        ]);
        $middleware->web(append:
        [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \App\Http\Middleware\VerificarFuncionalidadeActiva::class,
            \App\Http\Middleware\VerificarHorarioFuncionamento::class,
            \App\Http\Middleware\RegistarAcesso::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Complementa o canal de log por omissão (não o substitui) com uma
        // linha consultável na interface pelo Desenvolvedor — nunca deixa
        // uma falha ao gravar esconder a excepção original.
        $exceptions->report(function (\Throwable $e) {
            try {
                $request = request();

                \App\Models\ErroSistema::create([
                    'mensagem' => $e->getMessage() ?: $e::class,
                    'excepcao' => $e::class,
                    'ficheiro' => $e->getFile(),
                    'linha' => $e->getLine(),
                    'url' => $request?->fullUrl(),
                    'metodo' => $request?->method(),
                    'user_id' => $request?->user()?->id,
                    'trace' => substr($e->getTraceAsString(), 0, 4000),
                    'created_at' => now(),
                ]);
            } catch (\Throwable) {
                // Nunca deixar a gravação do erro causar outro erro.
            }
        });
    })->create();

// Em plataformas serverless (ex.: Vercel) o sistema de ficheiros da função é
// só de leitura, exceto /tmp. Redirecciona os caminhos de escrita da Laravel
// (logs, views compiladas, cache de ficheiros) para lá quando aplicável.
if (getenv('VERCEL')) {
    $storagePath = '/tmp/storage';

    foreach (['app', 'framework/cache/data', 'framework/sessions', 'framework/testing', 'framework/views', 'logs'] as $dir) {
        $path = "{$storagePath}/{$dir}";
        if (! is_dir($path)) {
            mkdir($path, 0775, true);
        }
    }

    $app->useStoragePath($storagePath);
}

return $app;
