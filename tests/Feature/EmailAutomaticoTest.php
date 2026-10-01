<?php

namespace Tests\Feature;

use App\Mail\FacturaMail;
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

/** Aprovada a leitura, a factura sai e segue por email (a quem tem email). */
class EmailAutomaticoTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private Tarifa $tarifa;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->admin = User::factory()->create();
        $this->admin->assignRole('administrador');
        $this->tarifa = Tarifa::create(['nome' => 'Doméstica']);
        Mail::fake();
    }

    private function leitura(string $nome, ?string $email, int $consumo = 10): Leitura
    {
        static $n = 0;
        $n++;
        $cliente = Cliente::create(['numero_cliente' => 'CLI-'.$n, 'nome' => $nome, 'email' => $email, 'tarifa_id' => $this->tarifa->id, 'estado' => 'ativo']);

        return Leitura::create([
            'cliente_id' => $cliente->id, 'mes' => now()->month, 'ano' => now()->year, 'leitura_anterior' => 0,
            'leitura_actual' => $consumo, 'confirmado' => false, 'registado_por' => $this->admin->id,
        ]);
    }

    public function test_confirmar_a_leitura_emite_a_factura_e_envia_por_email(): void
    {
        $l = $this->leitura('Ana', 'ana@exemplo.co.mz');

        $this->actingAs($this->admin)->put('/leituras/'.$l->id, ['leitura_actual' => 10, 'confirmado' => true])
            ->assertSessionHas('status', fn ($m) => str_contains($m, 'factura FAT-') && str_contains($m, 'ana@exemplo.co.mz'));

        $factura = Factura::where('leitura_id', $l->id)->firstOrFail();
        $this->assertEquals(700, $factura->total_pagar);
        Mail::assertSent(FacturaMail::class, fn ($m) => $m->hasTo('ana@exemplo.co.mz') && $m->factura->id === $factura->id);
        $this->assertDatabaseHas('envios_email', ['factura_id' => $factura->id, 'estado' => 'enviado']);
    }

    public function test_cliente_sem_email_tem_factura_mas_nao_recebe_email(): void
    {
        $l = $this->leitura('Bia', null);

        $this->actingAs($this->admin)->put('/leituras/'.$l->id, ['leitura_actual' => 10, 'confirmado' => true])
            ->assertSessionHas('status', fn ($m) => str_contains($m, 'não tem email'));

        $this->assertSame(1, Factura::count());
        Mail::assertNothingSent();
    }

    public function test_confirmar_todas_emite_e_envia_so_a_quem_tem_email(): void
    {
        $this->leitura('Ana', 'ana@exemplo.co.mz');
        $this->leitura('Bia', null);

        $this->actingAs($this->admin)->put('/leituras/confirmar-todas')
            ->assertSessionHas('status', fn ($m) => str_contains($m, '2 factura(s) emitida(s)') && str_contains($m, '1 a enviar por email'));

        $this->assertSame(2, Factura::count());
        Mail::assertSent(FacturaMail::class, 1);
    }

    public function test_com_a_emissao_automatica_desligada_a_leitura_so_fica_confirmada(): void
    {
        Configuracao::definir('email_facturar_ao_confirmar', 0);
        $l = $this->leitura('Ana', 'ana@exemplo.co.mz');

        $this->actingAs($this->admin)->put('/leituras/'.$l->id, ['leitura_actual' => 10, 'confirmado' => true])
            ->assertSessionHas('status', 'Leitura actualizada com sucesso.');

        $this->assertSame(0, Factura::count());
        Mail::assertNothingSent();
    }

    public function test_emitir_a_mao_so_envia_se_o_envio_ao_emitir_estiver_ligado(): void
    {
        Configuracao::definir('email_facturar_ao_confirmar', 0);
        $l = $this->leitura('Ana', 'ana@exemplo.co.mz');
        $l->update(['confirmado' => true]);

        Configuracao::definir('email_enviar_ao_emitir', 0);
        $this->actingAs($this->admin)->post('/facturas', ['leitura_id' => $l->id])->assertSessionHas('status', 'Factura emitida com sucesso.');
        Mail::assertNothingSent();

        $l2 = $this->leitura('Carlos', 'c@exemplo.co.mz');
        $l2->update(['confirmado' => true]);
        Configuracao::definir('email_enviar_ao_emitir', 1);
        $this->post('/facturas', ['leitura_id' => $l2->id])->assertSessionHas('status', fn ($m) => str_contains($m, 'A enviar por email'));
        Mail::assertSent(FacturaMail::class, 1);
    }

    public function test_o_administrador_liga_e_desliga_os_automatismos(): void
    {
        $this->actingAs($this->admin)->put('/admin/email/automatico', [
            'facturar_ao_confirmar' => false, 'enviar_ao_emitir' => true, 'cobranca_automatica' => false,
        ])->assertSessionHasNoErrors();

        $this->get('/admin/email')->assertInertia(fn (Assert $p) => $p
            ->where('automatico.facturar_ao_confirmar', false)->where('automatico.enviar_ao_emitir', true)->where('automatico.cobranca_automatica', false));

        $gestor = User::factory()->create();
        $gestor->assignRole('gestor');
        $this->actingAs($gestor)->put('/admin/email/automatico', ['facturar_ao_confirmar' => true, 'enviar_ao_emitir' => true, 'cobranca_automatica' => true])->assertForbidden();
    }
}
