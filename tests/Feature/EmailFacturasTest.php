<?php

namespace Tests\Feature;

use App\Models\Cliente;
use App\Models\Factura;
use App\Models\Leitura;
use App\Models\Tarifa;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/** PDFs e emissao de facturas; o produto nao envia facturas por email. */
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
        $this->tarifa = Tarifa::create(['nome' => 'Domestica']);
        Mail::fake();
    }

    private function cliente(?string $email = null): Cliente
    {
        static $n = 0;
        $n++;

        return Cliente::create([
            'numero_cliente' => 'CLI-'.$n, 'nome' => 'Cliente '.$n, 'email' => $email,
            'tarifa_id' => $this->tarifa->id, 'estado' => 'ativo',
        ]);
    }

    private function factura(Cliente $cliente, string $numero): Factura
    {
        return Factura::create([
            'numero_factura' => $numero, 'cliente_id' => $cliente->id, 'mes' => 9, 'ano' => 2026,
            'valor_consumo' => 350, 'total_pagar' => 350, 'estado' => 'pendente',
            'data_vencimento' => now()->addDays(10)->toDateString(),
        ]);
    }

    public function test_o_pdf_da_factura_e_gerado_no_servidor(): void
    {
        $factura = $this->factura($this->cliente(), 'FAT-2026-0001');
        $response = $this->actingAs($this->admin)->get('/facturas/'.$factura->id.'/pdf');

        $response->assertOk()->assertHeader('content-type', 'application/pdf');
        $this->assertStringStartsWith('%PDF', $response->getContent());
    }

    public function test_emissao_em_lote_cria_facturas_sem_enviar_emails_a_clientes(): void
    {
        $cliente = $this->cliente('cliente@example.test');
        Leitura::create([
            'cliente_id' => $cliente->id, 'mes' => 9, 'ano' => 2026, 'leitura_anterior' => 0,
            'leitura_actual' => 10, 'confirmado' => true, 'registado_por' => $this->admin->id,
        ]);

        $this->actingAs($this->admin)->post('/facturas/emitir-lote', [
            'mes' => 9, 'ano' => 2026, 'enviar_email' => true,
        ])->assertSessionHasNoErrors();

        $this->assertSame(1, Factura::count());
        Mail::assertNothingSent();
    }

    public function test_repetir_emissao_em_lote_nao_duplica_facturas(): void
    {
        $cliente = $this->cliente();
        Leitura::create([
            'cliente_id' => $cliente->id, 'mes' => 9, 'ano' => 2026, 'leitura_anterior' => 0,
            'leitura_actual' => 10, 'confirmado' => true, 'registado_por' => $this->admin->id,
        ]);
        $dados = ['mes' => 9, 'ano' => 2026];

        $this->actingAs($this->admin)->post('/facturas/emitir-lote', $dados)->assertSessionHasNoErrors();
        Factura::whereNotNull('leitura_id')->firstOrFail()->delete();
        $this->post('/facturas/emitir-lote', $dados)->assertSessionHas('error');

        $this->assertSame(1, Factura::withTrashed()->whereNotNull('leitura_id')->count());
        Mail::assertNothingSent();
    }

    public function test_rota_legada_de_envio_de_factura_por_email_nao_existe(): void
    {
        $factura = $this->factura($this->cliente('cliente@example.test'), 'FAT-2026-0004');

        $this->actingAs($this->admin)->post('/facturas/'.$factura->id.'/email')->assertNotFound();
        Mail::assertNothingSent();
    }
}
