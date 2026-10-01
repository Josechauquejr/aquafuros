<?php

namespace Tests\Feature;

use App\Models\Cliente;
use App\Models\Factura;
use App\Models\Leitura;
use App\Models\LeituraCorreccao;
use App\Models\Pagamento;
use App\Models\Tarifa;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/** Só o administrador corrige uma leitura confirmada; a factura acompanha e tudo se desfaz. */
class CorrigirLeituraTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private Leitura $leitura;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        $this->seed(RoleSeeder::class);
        $this->admin = User::factory()->create();
        $this->admin->assignRole('administrador');

        $tarifa = Tarifa::create(['nome' => 'Doméstica']);
        $cliente = Cliente::create(['numero_cliente' => 'CLI-1', 'nome' => 'Ana', 'tarifa_id' => $tarifa->id, 'estado' => 'ativo']);
        $this->leitura = Leitura::create([
            'cliente_id' => $cliente->id, 'mes' => 9, 'ano' => 2026, 'leitura_anterior' => 0,
            'leitura_actual' => 10, 'confirmado' => true, 'registado_por' => $this->admin->id,
        ]);
        $this->actingAs($this->admin)->put('/leituras/'.$this->leitura->id.'/corrigir', []); // sem dados: só valida
    }

    private function facturar(): Factura
    {
        $this->leitura->update(['confirmado' => false]);
        $this->actingAs($this->admin)->put('/leituras/'.$this->leitura->id, ['leitura_actual' => 10, 'confirmado' => true]);

        return Factura::where('leitura_id', $this->leitura->id)->firstOrFail();
    }

    public function test_so_o_administrador_corrige(): void
    {
        $gestor = User::factory()->create();
        $gestor->assignRole('gestor');

        $this->actingAs($gestor)->put('/leituras/'.$this->leitura->id.'/corrigir', ['leitura_actual' => 12, 'motivo' => 'erro de leitura'])
            ->assertForbidden();
        $this->assertEquals(10, $this->leitura->fresh()->leitura_actual);
    }

    public function test_corrigir_recalcula_a_factura_e_desfazer_repoe(): void
    {
        $factura = $this->facturar();
        $this->assertEquals(700, $factura->total_pagar);

        $this->actingAs($this->admin)->put('/leituras/'.$this->leitura->id.'/corrigir', ['leitura_actual' => 20, 'motivo' => 'número mal lido'])
            ->assertSessionHas('status');

        $this->assertEquals(20, $this->leitura->fresh()->leitura_actual);
        $this->assertEquals(1400, $factura->fresh()->total_pagar);

        $correccao = LeituraCorreccao::firstOrFail();
        $this->actingAs($this->admin)->post('/leituras/correccoes/'.$correccao->id.'/desfazer')->assertSessionHas('status');

        $this->assertEquals(10, $this->leitura->fresh()->leitura_actual);
        $this->assertEquals(700, $factura->fresh()->total_pagar);
        $this->assertNotNull($correccao->fresh()->desfeita_em);
    }

    public function test_nao_corrige_com_pagamentos_na_factura(): void
    {
        $factura = $this->facturar();
        Pagamento::forceCreate(['factura_id' => $factura->id, 'cliente_id' => $factura->cliente_id, 'numero_recibo' => 'REC-2026-0001', 'valor_pago' => 100, 'metodo_pagamento' => 'dinheiro', 'recebido_por' => $this->admin->id]);

        $this->actingAs($this->admin)->put('/leituras/'.$this->leitura->id.'/corrigir', ['leitura_actual' => 20, 'motivo' => 'número mal lido'])
            ->assertSessionHas('error');
        $this->assertEquals(10, $this->leitura->fresh()->leitura_actual);
    }

    public function test_a_leitura_seguinte_pendente_parte_do_novo_valor(): void
    {
        $seguinte = Leitura::create([
            'cliente_id' => $this->leitura->cliente_id, 'mes' => 10, 'ano' => 2026, 'leitura_anterior' => 10,
            'leitura_actual' => 30, 'confirmado' => false, 'registado_por' => $this->admin->id,
        ]);

        $this->actingAs($this->admin)->put('/leituras/'.$this->leitura->id.'/corrigir', ['leitura_actual' => 15, 'motivo' => 'número mal lido']);
        $this->assertEquals(15, $seguinte->fresh()->leitura_anterior);

        $this->actingAs($this->admin)->post('/leituras/correccoes/'.LeituraCorreccao::firstOrFail()->id.'/desfazer');
        $this->assertEquals(10, $seguinte->fresh()->leitura_anterior);
    }

    public function test_administrador_que_regista_leitura_e_perguntado_se_confirma(): void
    {
        $this->actingAs($this->admin)->post('/leituras', ['cliente_id' => $this->leitura->cliente_id, 'mes' => 11, 'ano' => 2026, 'leitura_actual' => 25])
            ->assertSessionHas('leituraRegistada.leitura_actual');
    }
}
