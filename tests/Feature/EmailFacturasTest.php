<?php

namespace Tests\Feature;

use App\Mail\FacturaMail;
use App\Models\Cliente;
use App\Models\EnvioEmail;
use App\Models\Factura;
use App\Models\Leitura;
use App\Models\Tarifa;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/** Envio de facturas por email: PDF no servidor, anexo, registo de cada envio e envio em lote. */
class EmailFacturasTest extends TestCase
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
    }

    private function cliente(string $nome, ?string $email): Cliente
    {
        static $n = 0;
        $n++;

        return Cliente::create(['numero_cliente' => 'CLI-'.$n, 'nome' => $nome, 'email' => $email, 'tarifa_id' => $this->tarifa->id, 'estado' => 'ativo']);
    }

    private function factura(Cliente $cliente, string $numero, string $estado = 'pendente'): Factura
    {
        return Factura::create([
            'numero_factura' => $numero, 'cliente_id' => $cliente->id, 'mes' => 9, 'ano' => 2026, 'valor_consumo' => 350,
            'total_pagar' => 350, 'estado' => $estado, 'data_vencimento' => now()->addDays(10)->toDateString(),
        ]);
    }

    public function test_o_pdf_da_factura_e_gerado_no_servidor(): void
    {
        $f = $this->factura($this->cliente('Ana', 'ana@exemplo.co.mz'), 'FAT-2026-0001');

        $resposta = $this->actingAs($this->admin)->get('/facturas/'.$f->id.'/pdf');

        $resposta->assertOk()->assertHeader('content-type', 'application/pdf');
        $this->assertStringStartsWith('%PDF', $resposta->getContent());
    }

    public function test_envia_a_factura_por_email_com_o_pdf_e_regista_o_envio(): void
    {
        Mail::fake();
        $ana = $this->cliente('Ana', 'ana@exemplo.co.mz');
        $f = $this->factura($ana, 'FAT-2026-0002');

        $this->actingAs($this->admin)->post('/facturas/'.$f->id.'/email')->assertSessionHas('status');

        Mail::assertSent(FacturaMail::class, function (FacturaMail $mail) use ($f) {
            $this->assertTrue($mail->hasTo('ana@exemplo.co.mz'));
            $this->assertStringContainsString($f->numero_factura, $mail->envelope()->subject);

            return true;
        });
        $this->assertDatabaseHas('envios_email', ['factura_id' => $f->id, 'email' => 'ana@exemplo.co.mz', 'estado' => 'enviado', 'enviado_por' => $this->admin->id]);

        // o anexo é mesmo um PDF
        $mail = new FacturaMail($f->fresh());
        $this->assertSame('Factura-FAT-2026-0002.pdf', $mail->attachments()[0]->as);
        $this->assertStringContainsString('FAT-2026-0002', $mail->render());

        // a lista mostra o último envio
        $this->get('/facturas')->assertInertia(fn (Assert $p) => $p->where('facturas.data.0.ultimo_envio.estado', 'enviado'));
    }

    public function test_recusa_sem_email_e_facturas_anuladas(): void
    {
        Mail::fake();
        $semEmail = $this->factura($this->cliente('Bia', null), 'FAT-2026-0003');
        $anulada = $this->factura($this->cliente('Carlos', 'c@exemplo.co.mz'), 'FAT-2026-0004', 'anulada');

        $this->actingAs($this->admin)->post('/facturas/'.$semEmail->id.'/email')->assertSessionHas('error');
        $this->post('/facturas/'.$anulada->id.'/email')->assertSessionHas('error');

        Mail::assertNothingSent();
        $this->assertSame(0, EnvioEmail::count());
    }

    public function test_falha_ao_enviar_fica_registada_com_o_motivo(): void
    {
        $f = $this->factura($this->cliente('Ana', 'ana@exemplo.co.mz'), 'FAT-2026-0005');
        Mail::shouldReceive('to')->andThrow(new \RuntimeException('Connection refused'));

        $this->actingAs($this->admin)->post('/facturas/'.$f->id.'/email')->assertSessionHas('error');

        $this->assertDatabaseHas('envios_email', ['factura_id' => $f->id, 'estado' => 'falhou', 'erro' => 'Connection refused']);
    }

    public function test_envio_em_lote_ignora_quem_nao_tem_email(): void
    {
        Mail::fake();
        $a = $this->factura($this->cliente('Ana', 'ana@exemplo.co.mz'), 'FAT-2026-0006');
        $b = $this->factura($this->cliente('Bia', null), 'FAT-2026-0007');

        $this->actingAs($this->admin)->post('/facturas/email-lote', ['ids' => [$a->id, $b->id]])
            ->assertSessionHas('status', fn ($m) => str_contains($m, '1 factura') && str_contains($m, 'sem email'));

        Mail::assertSent(FacturaMail::class, 1);

        $this->post('/facturas/email-lote', ['ids' => [$b->id]])->assertSessionHas('error');
    }

    public function test_emitir_o_mes_pode_enviar_logo_por_email(): void
    {
        Mail::fake();
        $ana = $this->cliente('Ana', 'ana@exemplo.co.mz');
        $bia = $this->cliente('Bia', null);
        foreach ([$ana, $bia] as $c) {
            Leitura::create(['cliente_id' => $c->id, 'mes' => 9, 'ano' => 2026, 'leitura_anterior' => 0, 'leitura_actual' => 10, 'confirmado' => true, 'registado_por' => $this->admin->id]);
        }

        $this->actingAs($this->admin)->post('/facturas/emitir-lote', ['mes' => 9, 'ano' => 2026, 'enviar_email' => true])
            ->assertSessionHas('status', fn ($m) => str_contains($m, '2 factura(s) emitida(s)') && str_contains($m, 'sem email'));

        $this->assertSame(2, Factura::count());
        Mail::assertSent(FacturaMail::class, 1);
    }

    public function test_so_administrador_e_gestor_enviam_e_o_email_do_cliente_e_validado(): void
    {
        Mail::fake();
        $f = $this->factura($this->cliente('Ana', 'ana@exemplo.co.mz'), 'FAT-2026-0008');
        $caixa = User::factory()->create();
        $caixa->assignRole('caixa');

        $this->actingAs($caixa)->post('/facturas/'.$f->id.'/email')->assertForbidden();

        $this->actingAs($this->admin)->post('/clientes', [
            'nome' => 'Dina', 'tarifa_id' => $this->tarifa->id, 'estado' => 'ativo', 'leitura_inicial' => 0, 'email' => 'isto-nao-e-email',
        ])->assertSessionHasErrors('email');

        $this->post('/clientes', [
            'nome' => 'Dina', 'tarifa_id' => $this->tarifa->id, 'estado' => 'ativo', 'leitura_inicial' => 0, 'email' => 'dina@exemplo.co.mz',
        ])->assertSessionHasNoErrors();
        $this->assertDatabaseHas('clientes', ['nome' => 'Dina', 'email' => 'dina@exemplo.co.mz']);
    }
}
