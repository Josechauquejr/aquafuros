<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
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
            'flash' => [
                'status' => fn () => $request->session()->get('status'),
                'error' => fn () => $request->session()->get('error'),
                // Usado para propor o próximo passo do fluxo logo após criar
                // um registo (ex.: "factura emitida — pagar agora?").
                'novaFactura' => fn () => $request->session()->get('novaFactura'),
                // Senha temporária gerada ao criar um utilizador ou repor a
                // senha — mostrada uma única vez, nunca persistida em claro.
                'novaSenha' => fn () => $request->session()->get('novaSenha'),
            ],
        ];
    }
}
