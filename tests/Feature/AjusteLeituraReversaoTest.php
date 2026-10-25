<?php

namespace Tests\Feature;

use App\Models\AjusteLeitura;
use App\Models\Cliente;
use App\Models\Factura;
use App\Models\Leitura;
use App\Models\Pagamento;
use App\Models\Tarifa;
use App\Models\User;
use App\Services\SequenciaLeituras;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AjusteLeituraReversaoTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private Cliente $cliente;

    private function criarLeitura(int $mes, float $anterior, float $actual, bool $confirmada = false): Leitura
    {
        return Leitura::create([
            'cliente_id' => $this->cliente->id, 'mes' => $mes, 'ano' => 2026,
            'leitura_anterior' => $anterior, 'leitura_actual' => $actual,
            'confirmado' => $confirmada, 'registado_por' => $this->admin->id,
        ]);
    }

    private function criarFactura(Leitura $leitura): Factura
    {
        return Factura::create([
            'numero_factura' => 'FAT-2026-'.str_pad((string) $leitura->mes, 4, '0', STR_PAD_LEFT),
            'cliente_id' => $this->cliente->id, 'leitura_id' => $leitura->id,
            'mes' => $leitura->mes, 'ano' => $leitura->ano,
            'valor_consumo' => 400, 'total_pagar' => 400, 'estado' => 'pendente',
            'data_vencimento' => now()->addDays(10)->toDateString(),
        ]);
    }

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
        $this->admin = User::factory()->create();
        $this->admin->assignRole('administrador');
        $tarifa = Tarifa::create(['nome' => 'Doméstica', 'preco_m3' => 10, 'taxa_minima' => 0, 'consumo_minimo_m3' => 0]);
        $this->cliente = Cliente::create([
            'numero_cliente' => 'CLI-REV-1', 'nome' => 'Ana', 'tarifa_id' => $tarifa->id,
            'estado' => 'ativo', 'leitura_inicial' => 10,
        ]);
    }

    public function test_reverte_insercao_retroactiva_e_restaura_factura_e_sequencia(): void
    {
        $seguinte = $this->criarLeitura(9, 10, 50, true);
        $factura = $this->criarFactura($seguinte);
        $antesValor = (float) $factura->valor_consumo;
        $antesTotal = (float) $factura->total_pagar;

        app(SequenciaLeituras::class)->inserir($this->cliente, [
            'mes' => 8, 'ano' => 2026, 'leitura_actual' => 30,
        ], $this->admin->id, 'Leitura de Agosto registada fora de prazo');
        $ajuste = AjusteLeitura::where('tipo', 'insercao_retroactiva')->firstOrFail();

        $this->actingAs($this->admin)->post('/ajustes-leitura/'.$ajuste->id.'/reverter', [
            'motivo' => 'A leitura retroactiva foi registada por engano',
        ])->assertSessionHas('status');

        $this->assertSoftDeleted('leituras', ['id' => $ajuste->leitura_id]);
        $this->assertEquals(10, $seguinte->fresh()->leitura_anterior);
        $this->assertEquals($antesValor, (float) $factura->fresh()->valor_consumo);
        $this->assertEquals($antesTotal, (float) $factura->fresh()->total_pagar);
        $this->assertDatabaseHas('ajustes_leitura', [
            'tipo' => 'reversao', 'ajuste_revertido_id' => $ajuste->id,
            'user_id' => $this->admin->id, 'motivo' => 'A leitura retroactiva foi registada por engano',
        ]);
        $this->post('/leituras/lixeira/'.$ajuste->leitura_id.'/restaurar')
            ->assertSessionHas('error', 'Esta leitura foi removida por uma reversão auditada e não pode ser restaurada pela lixeira.');
        $this->assertSoftDeleted('leituras', ['id' => $ajuste->leitura_id]);
        $this->get('/clientes/'.$this->cliente->numero_cliente)->assertInertia(fn (Assert $page) => $page
            ->has('ajustesLeitura', 2)
            ->where('ajustesLeitura.0.tipo', 'reversao')
            ->where('ajustesLeitura.1.reversao.motivo', 'A leitura retroactiva foi registada por engano'));
    }

    public function test_bloqueia_reversao_quando_factura_recebeu_pagamento(): void
    {
        $seguinte = $this->criarLeitura(9, 10, 50, true);
        $factura = $this->criarFactura($seguinte);
        app(SequenciaLeituras::class)->inserir($this->cliente, [
            'mes' => 8, 'ano' => 2026, 'leitura_actual' => 30,
        ], $this->admin->id, 'Leitura retroactiva válida');
        $ajuste = AjusteLeitura::where('tipo', 'insercao_retroactiva')->firstOrFail();
        Pagamento::forceCreate([
            'factura_id' => $factura->id, 'cliente_id' => $this->cliente->id,
            'numero_recibo' => 'REC-REV-0001', 'valor_pago' => 20,
            'metodo_pagamento' => 'dinheiro', 'recebido_por' => $this->admin->id,
        ]);

        $this->actingAs($this->admin)->post('/ajustes-leitura/'.$ajuste->id.'/reverter', [
            'motivo' => 'Tentar reverter com pagamento registado',
        ])->assertSessionHasErrors('ajuste');

        $this->assertNotSoftDeleted('leituras', ['id' => $ajuste->leitura_id]);
        $this->assertEquals(30, $seguinte->fresh()->leitura_anterior);
        $this->assertDatabaseMissing('ajustes_leitura', ['tipo' => 'reversao', 'ajuste_revertido_id' => $ajuste->id]);
    }

    public function test_bloqueia_reversao_quando_a_leitura_seguinte_mudou(): void
    {
        $seguinte = $this->criarLeitura(9, 10, 50);
        app(SequenciaLeituras::class)->inserir($this->cliente, [
            'mes' => 8, 'ano' => 2026, 'leitura_actual' => 30,
        ], $this->admin->id, 'Leitura retroactiva válida');
        $ajuste = AjusteLeitura::where('tipo', 'insercao_retroactiva')->firstOrFail();
        $seguinte->update(['leitura_actual' => 51]);

        $this->actingAs($this->admin)->post('/ajustes-leitura/'.$ajuste->id.'/reverter', [
            'motivo' => 'Reverter depois de mudar a leitura seguinte',
        ])->assertSessionHasErrors('ajuste');

        $this->assertNotSoftDeleted('leituras', ['id' => $ajuste->leitura_id]);
        $this->assertEquals(30, $seguinte->fresh()->leitura_anterior);
        $this->assertDatabaseMissing('ajustes_leitura', ['tipo' => 'reversao', 'ajuste_revertido_id' => $ajuste->id]);
    }

    public function test_reverte_alteracao_da_leitura_inicial(): void
    {
        $primeira = $this->criarLeitura(9, 10, 50, true);
        $factura = $this->criarFactura($primeira);
        $antesValor = (float) $factura->valor_consumo;
        $antesTotal = (float) $factura->total_pagar;
        app(SequenciaLeituras::class)->alterarLeituraInicial($this->cliente, 20, $this->admin->id, 'Valor inicial corrigido');
        $ajuste = AjusteLeitura::where('tipo', 'leitura_inicial')->firstOrFail();

        $this->actingAs($this->admin)->post('/ajustes-leitura/'.$ajuste->id.'/reverter', [
            'motivo' => 'Correcção original não devia ter sido aplicada',
        ])->assertSessionHas('status');

        $this->assertEquals(10, (float) $this->cliente->fresh()->leitura_inicial);
        $this->assertEquals(10, (float) $primeira->fresh()->leitura_anterior);
        $this->assertEquals($antesValor, (float) $factura->fresh()->valor_consumo);
        $this->assertEquals($antesTotal, (float) $factura->fresh()->total_pagar);
    }
}
