<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class ManterSessaoTest extends TestCase
{
    use RefreshDatabase;

    private function entrarComLembrar(User $user): string
    {
        $resposta = $this->post('/login', [
            'username' => $user->username,
            'password' => 'password',
            'remember' => true,
        ]);

        $nome = Auth::guard('web')->getRecallerName();
        $cookie = collect($resposta->headers->getCookies())->first(fn ($c) => $c->getName() === $nome);
        $this->assertNotNull($cookie, 'O cookie de "manter sessão" não foi enviado.');

        return $cookie->getValue();
    }

    private function novaVisitaSoComCookie(string $valor)
    {
        // Simula o browser a voltar dias depois: a sessão do servidor já
        // expirou, sobra apenas o cookie de lembrar.
        $this->flushSession();
        Auth::forgetGuards();
        $this->app['auth']->forgetGuards();

        return $this->withUnencryptedCookie(Auth::guard('web')->getRecallerName(), $valor)->get('/dashboard');
    }

    public function test_o_cookie_de_lembrar_volta_a_autenticar_apos_a_sessao_expirar(): void
    {
        $user = User::factory()->create();
        $valor = $this->entrarComLembrar($user);

        $resposta = $this->novaVisitaSoComCookie($valor);

        $this->assertFalse($resposta->isRedirect(route('login')), 'Foi mandado para o login.');
        $this->assertAuthenticatedAs($user);
    }

    public function test_terminar_sessao_noutro_dispositivo_nao_desliga_este(): void
    {
        $user = User::factory()->create();
        $telemovel = $this->entrarComLembrar($user);

        // No computador: entra e sai.
        $this->flushSession();
        $this->app['auth']->forgetGuards();
        $this->actingAs($user->fresh())->post('/logout');

        $resposta = $this->novaVisitaSoComCookie($telemovel);

        $this->assertFalse($resposta->isRedirect(route('login')), 'O telemóvel perdeu a sessão.');
        $this->assertAuthenticatedAs($user);
    }

    public function test_pagina_expirada_volta_atras_em_vez_de_419(): void
    {
        \Illuminate\Support\Facades\Route::middleware('web')->post('/_teste-419', function () {
            throw new \Illuminate\Session\TokenMismatchException('CSRF token mismatch.');
        });

        $this->withHeaders(['X-Inertia' => 'true', 'Referer' => url('/login')])
            ->post('/_teste-419')
            ->assertRedirect(url('/login'))
            ->assertSessionHas('error');
    }
}
