<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/** A novidade do sistema aparece uma única vez a cada utilizador. */
class NovidadesTest extends TestCase
{
    use RefreshDatabase;

    private function utilizador(string $papel): User
    {
        $this->seed(RoleSeeder::class);
        $user = User::factory()->create();
        $user->assignRole($papel);

        return $user;
    }

    public function test_aparece_ate_ser_vista_e_depois_nao_volta(): void
    {
        $admin = $this->utilizador('administrador');

        $this->actingAs($admin)->get('/profile')
            ->assertInertia(fn (Assert $p) => $p->where('novidade.id', collect(config('novidades'))->last()['id']));

        $this->actingAs($admin)->post('/novidades/vista')->assertRedirect();

        $this->actingAs($admin)->get('/profile')
            ->assertInertia(fn (Assert $p) => $p->where('novidade', null));
    }

    public function test_so_mostra_ao_utilizador_as_novidades_do_seu_papel(): void
    {
        config(['novidades' => [[
            'id' => 'x', 'data' => '2026-10-01', 'titulo' => 'T', 'resumo' => null,
            'novidades' => [
                ['titulo' => 'Só caixa', 'texto' => '.', 'roles' => ['caixa']],
                ['titulo' => 'Só admin', 'texto' => '.', 'roles' => ['administrador']],
            ],
        ]]]);

        $this->actingAs($this->utilizador('caixa'))->get('/profile')
            ->assertInertia(fn (Assert $p) => $p->has('novidade.novidades', 1)->where('novidade.novidades.0.titulo', 'Só caixa'));
    }

    public function test_nova_entrada_volta_a_aparecer_a_quem_viu_a_anterior(): void
    {
        $admin = $this->utilizador('administrador');
        $admin->forceFill(['novidade_vista' => 'antiga'])->saveQuietly();

        $this->actingAs($admin)->get('/profile')
            ->assertInertia(fn (Assert $p) => $p->has('novidade'));
    }
}
