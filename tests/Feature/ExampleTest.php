<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    use RefreshDatabase;
    /**
     * A basic test example.
     */
    public function test_a_raiz_leva_ao_login_sem_sessao(): void
    {
        $this->get('/')->assertRedirect('/dashboard');
        $this->get('/dashboard')->assertRedirect('/login');
    }

    public function test_o_registo_publico_nao_existe(): void
    {
        $this->get('/register')->assertNotFound();
        $this->post('/register', ['name' => 'X', 'username' => 'x', 'email' => 'x@x.co.mz', 'password' => 'password', 'password_confirmation' => 'password'])
            ->assertNotFound();
    }

    public function test_conta_sem_papel_ve_acesso_bloqueado(): void
    {
        $this->actingAs(\App\Models\User::factory()->create())->get('/dashboard')
            ->assertForbidden()
            ->assertInertia(fn ($pagina) => $pagina->component('AcessoBloqueado')->where('motivo', 'sem_papel'));
    }
}
