<?php

namespace Tests\Feature;

use App\Models\Cliente;
use App\Models\Configuracao;
use App\Models\Factura;
use App\Models\Leitura;
use App\Models\Tarifa;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/** Cobertura da emissao automatica de facturas, sem envio de emails a clientes. */
class EmailAutomaticoTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $dev;

    private Tarifa $tarifa;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
        $this->admin = User::factory()->create();
        $this->admin->assignRole('administrador');
        $this->dev = User::factory()->create();
        $this->dev->assignRole('desenvolvedor');
        $this->tarifa = Tarifa::create(['nome' => 'Domestica']);
        Mail::fake();
    }

    private function leitura(?string $email, int $consumo = 10): Leitura
    {
        static $n = 0;
        $n++;
        $cliente = Cliente::create([
            'numero_cliente' => 'CLI-'.$n, 'nome' => 'Cliente '.$n, 'email' => $email,
            'tarifa_id' => $this->tarifa->id, 'estado' => 'ativo',
        ]);

        return Leitura::create([
            'cliente_id' => $cliente->id, 'mes' => now()->month, 'ano' => now()->year,
            'leitura_anterior' => 0, 'leitura_actual' => $consumo, 'confirmado' => false,
            'registado_por' => $this->admin->id,
        ]);
    }

    public function test_confirmar_leitura_emite_factura_sem_enviar_email_ao_cliente(): void
    {
        $leitura = $this->leitura('cliente@example.test');

        $this->actingAs($this->admin)->put('/leituras/'.$leitura->id, [
            'leitura_actual' => 10, 'confirmado' => true,
        ])->assertSessionHasNoErrors();

        $this->assertDatabaseHas('facturas', ['leitura_id' => $leitura->id]);
        Mail::assertNothingSent();
    }

    public function test_confirmar_leituras_em_lote_emite_facturas_sem_emails_a_clientes(): void
    {
        $comEmail = $this->leitura('cliente@example.test');
        $semEmail = $this->leitura(null);

        $this->actingAs($this->admin)->put('/leituras/confirmar-todas')->assertSessionHasNoErrors();

        $this->assertSame(2, Factura::whereIn('leitura_id', [$comEmail->id, $semEmail->id])->count());
        Mail::assertNothingSent();
    }

    public function test_interruptor_desliga_a_emissao_automatica_de_facturas(): void
    {
        Configuracao::definir('email_facturar_ao_confirmar', 0);
        $leitura = $this->leitura('cliente@example.test');

        $this->actingAs($this->admin)->put('/leituras/'.$leitura->id, [
            'leitura_actual' => 10, 'confirmado' => true,
        ])->assertSessionHasNoErrors();

        $this->assertSame(0, Factura::count());
        Mail::assertNothingSent();
    }

    public function test_desenvolvedor_configura_apenas_a_emissao_automatica(): void
    {
        $this->actingAs($this->dev)->withSession(['auth.password_confirmed_at' => time()])
            ->put('/dev/email/automatico', ['facturar_ao_confirmar' => false])
            ->assertSessionHasNoErrors();

        $this->actingAs($this->dev)->get('/dev/email')->assertInertia(fn (Assert $page) => $page
            ->where('automatico.facturar_ao_confirmar', false));

        $this->actingAs($this->admin)->put('/dev/email/automatico', ['facturar_ao_confirmar' => true])->assertForbidden();
    }
}
