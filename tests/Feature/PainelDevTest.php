<?php

namespace Tests\Feature;

use App\Models\DevAuditoria;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/** Fase 1 do painel do Desenvolvedor: acesso restrito, senha reconfirmada, auditoria e saúde. */
class PainelDevTest extends TestCase
{
    use RefreshDatabase;

    private User $dev;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
        $this->dev = User::factory()->create();
        $this->dev->assignRole('desenvolvedor');
    }

    public function test_so_o_desenvolvedor_acede_a_saude_e_auditoria(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('administrador');

        foreach (['/dev/saude', '/dev/auditoria'] as $url) {
            $this->actingAs($admin)->get($url)->assertForbidden();
            $this->actingAs($this->dev)->get($url)->assertOk();
        }
        auth()->logout();
        $this->get('/dev/saude')->assertRedirect('/login');
    }

    public function test_saude_devolve_os_servicos_sem_erros(): void
    {
        $this->actingAs($this->dev)->get('/dev/saude')
            ->assertInertia(fn (Assert $p) => $p->component('Dev/Saude')
                ->where('servicos.base_dados.ok', true)
                ->where('servicos.cache.ok', true)
                ->where('servicos.fila.ok', true)
                ->has('alertas')
                ->has('aplicacao.laravel'));
    }

    public function test_accao_que_altera_pede_a_senha_e_nao_executa_sem_ela(): void
    {
        $alvo = User::factory()->create();
        $senhaAntes = $alvo->password;

        $this->actingAs($this->dev)->post("/dev/users/{$alvo->id}/reset-password")
            ->assertRedirect(route('password.confirm'));

        $this->assertSame($senhaAntes, $alvo->fresh()->password);
    }

    public function test_com_a_senha_confirmada_executa_e_fica_na_auditoria_sem_segredos(): void
    {
        $alvo = User::factory()->create();

        $this->actingAs($this->dev)->withSession(['auth.password_confirmed_at' => time()])
            ->post("/dev/users/{$alvo->id}/reset-password", ['password' => 'segredo-muito-secreto'])
            ->assertRedirect();

        $registo = DevAuditoria::where('acao', 'dev.users.reset-password')->firstOrFail();
        $this->assertSame($this->dev->id, $registo->user_id);
        $this->assertSame("user={$alvo->id}", $registo->alvo);
        $this->assertSame('••••', $registo->detalhes['campos']['password']);
        $this->assertStringNotContainsString('segredo-muito-secreto', json_encode($registo->detalhes));
    }

    public function test_senha_confirmada_ha_mais_de_15_minutos_volta_a_ser_pedida(): void
    {
        $alvo = User::factory()->create();

        $this->actingAs($this->dev)->withSession(['auth.password_confirmed_at' => time() - 1000])
            ->post("/dev/users/{$alvo->id}/reset-password")
            ->assertRedirect(route('password.confirm'));
    }

    public function test_a_auditoria_e_imutavel(): void
    {
        DevAuditoria::registar('teste.acao', 'alvo');
        $registo = DevAuditoria::firstOrFail();

        $this->expectException(\LogicException::class);
        $registo->update(['acao' => 'adulterada']);
    }

    public function test_a_auditoria_nao_pode_ser_apagada(): void
    {
        DevAuditoria::registar('teste.acao');

        $this->expectException(\LogicException::class);
        DevAuditoria::firstOrFail()->delete();
    }
}
