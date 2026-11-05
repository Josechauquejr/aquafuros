<?php

use App\Http\Middleware\AuditarPainelDev;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\RedirectRole;
use App\Http\Middleware\RegistarAcesso;
use App\Http\Middleware\VerificarFuncionalidadeActiva;
use App\Http\Middleware\VerificarHorarioFuncionamento;
use App\Models\ErroSistema;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Spatie\Permission\Exceptions\UnauthorizedException;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;
use Spatie\Permission\Middleware\RoleOrPermissionMiddleware;

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
            'redirect.by.role' => RedirectRole::class,
            'role' => RoleMiddleware::class,
            'permission' => PermissionMiddleware::class,
            'role_or_permission' => RoleOrPermissionMiddleware::class,
            'dev.auditar' => AuditarPainelDev::class,
        ]);
        $middleware->web(append: [
            HandleInertiaRequests::class,
            VerificarFuncionalidadeActiva::class,
            VerificarHorarioFuncionamento::class,
            RegistarAcesso::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Complementa o canal de log por omissão (não o substitui) com uma
        // linha consultável na interface pelo Desenvolvedor — nunca deixa
        // uma falha ao gravar esconder a excepção original.
        $exceptions->report(function (Throwable $e) {
            try {
                $request = request();

                ErroSistema::create([
                    'mensagem' => $e->getMessage() ?: $e::class,
                    'excepcao' => $e::class,
                    'ficheiro' => $e->getFile(),
                    'linha' => $e->getLine(),
                    // Evita persistir valores de filtros ou tokens na query.
                    'url' => $request?->url(),
                    'metodo' => $request?->method(),
                    'user_id' => $request?->user()?->id,
                    'trace' => substr($e->getTraceAsString(), 0, 4000),
                    'created_at' => now(),
                ]);
            } catch (Throwable) {
                // Nunca deixar a gravação do erro causar outro erro.
            }
        });

        // Quem não tem o papel exigido por uma rota (middleware `role:`) via
        // uma página em vez do 403 em branco do Symfony — se ainda estiver
        // autenticado, explica que não tem acesso; sem sessão, manda para o
        // login (nunca deveria acontecer aqui, já que `auth` corre primeiro,
        // mas serve de rede de segurança).
        $exceptions->render(function (UnauthorizedException|AuthorizationException $e, Request $request) {
            if (! $request->user()) {
                return redirect()->guest(route('login'));
            }

            return Inertia::render('AcessoBloqueado', ['motivo' => 'permissao'])
                ->toResponse($request)
                ->setStatusCode(403);
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
