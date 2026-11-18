<?php

namespace App\Http\Middleware;

use App\Models\EmpresaPerfil;
use App\Support\Alertas;
use App\Support\CicloMes;
use App\Support\IA\Gemini;
use App\Support\Novidades;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user,
                'roles' => $user?->getRoleNames() ?? [],
            ],
            'assistenteDisponivel' => fn () => $user
                && $user->hasAnyRole(['administrador', 'gestor', 'caixa', 'tecnico'])
                && Gemini::disponivel(),
            'emailAtivo' => (bool) config('services.email.enabled', false),
            // Identidade da empresa (nome/NUIT/localização/logotipo) — usada
            // como padrão do sistema (ex.: cabeçalho de facturas/recibos),
            // partilhada globalmente para não ter de passar por cada página.
            'empresa' => fn () => EmpresaPerfil::atual()->toArray(),
            // Novidade do sistema por ver (aparece uma só vez a cada utilizador).
            'novidade' => fn () => Novidades::pendente($user),
            // Bloco "Ciclo de Novembro · dia 7 de 30" do menu lateral e contadores
            // dos itens (Leituras 0/277, Painel 2). Não se aplica ao desenvolvedor.
            'ciclo' => fn () => $user && ! $user->hasRole('desenvolvedor') ? CicloMes::resumo() : null,
            'alertasPendentes' => fn () => $user && $user->hasAnyRole(['administrador', 'gestor'])
                ? Cache::remember('alertas-pendentes.'.($user->hasRole('administrador') ? 'admin' : 'gestor'), 120,
                    fn () => count(Alertas::para($user->hasRole('administrador'))))
                : 0,
            'flash' => [
                'status' => fn () => $request->session()->get('status'),
                'error' => fn () => $request->session()->get('error'),
                // Usado para propor o próximo passo do fluxo logo após criar
                // um registo (ex.: "factura emitida — pagar agora?").
                'novaFactura' => fn () => $request->session()->get('novaFactura'),
                // Senha temporária gerada ao criar um utilizador ou repor a
                // senha — mostrada uma única vez, nunca persistida em claro.
                'novaSenha' => fn () => $request->session()->get('novaSenha'),
                'abrirNovoUtilizador' => fn () => $request->session()->get('abrirNovoUtilizador'),
                'abrirAcaoUtilizador' => fn () => $request->session()->get('abrirAcaoUtilizador'),
                'leituraRegistada' => fn () => $request->session()->get('leituraRegistada'),
                'zonaCriada' => fn () => $request->session()->get('zonaCriada'),
            ],
        ];
    }
}
