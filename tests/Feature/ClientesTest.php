<?php

namespace Tests\Feature;

use App\Models\Cliente;
use App\Models\Factura;
use App\Models\Leitura;
use App\Models\Pagamento;
use App\Models\Tarifa;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ClientesTest extends TestCase
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

    private function cliente(string $nome, array $extra = []): Cliente
    {
        static $n = 0;
        $n++;

        return Cliente::create([
            'numero_cliente' => sprintf('CLI-%04d', $n),
            'nome' => $nome,
            'tarifa_id' => $this->tarifa->id,
            'estado' => 'ativo',
            ...$extra,
        ]);
    }

    private function dividaDe(Cliente $cliente, float $total, float $pago = 0): void
    {
        static $n = 0;
        $n++;

        $factura = Factura::create([
            'numero_factura' => "F-{$n}", 'cliente_id' => $cliente->id, 'mes' => 9, 'ano' => 2026,
            'total_pagar' => $total, 'estado' => $pago > 0 ? 'parcial' : 'pendente',
        ]);

        if ($pago > 0) {
            Pagamento::create([
                'numero_recibo' => "R-{$n}", 'factura_id' => $factura->id, 'cliente_id' => $cliente->id,
                'valor_pago' => $pago, 'metodo_pagamento' => 'dinheiro', 'recebido_por' => $this->admin->id,
            ]);
        }
    }

    public function test_ordem_por_defeito_e_nome_a_z_e_ordena_por_divida(): void
    {
        $bia = $this->cliente('Bia');
        $ana = $this->cliente('Ana');
        $this->cliente('Caio');
        $this->dividaDe($bia, 500, 200); // deve 300
        $this->dividaDe($ana, 100);

        $this->actingAs($this->admin)->get('/clientes')
            ->assertInertia(fn (Assert $page) => $page
                ->where('clientes.data.0.nome', 'Ana')
                ->where('filtros.sort', 'nome')
                ->where('filtros.dir', 'asc'));

        $this->actingAs($this->admin)->get('/clientes?sort=divida&dir=desc')
            ->assertInertia(fn (Assert $page) => $page
                ->where('clientes.data.0.nome', 'Bia')
                ->where('clientes.data.1.nome', 'Ana')
                ->where('clientes.data.2.nome', 'Caio'));
    }

    public function test_filtros_so_com_divida_bairro_e_tarifa(): void
    {
        $ana = $this->cliente('Ana', ['bairro' => 'Centro']);
        $this->cliente('Bia', ['bairro' => 'Sul']);
        $this->dividaDe($ana, 100);

        $this->actingAs($this->admin)->get('/clientes?so_divida=1')
            ->assertInertia(fn (Assert $page) => $page->has('clientes.data', 1)->where('clientes.data.0.nome', 'Ana'));

        $this->actingAs($this->admin)->get('/clientes?bairro=Sul')
            ->assertInertia(fn (Assert $page) => $page->has('clientes.data', 1)->where('clientes.data.0.nome', 'Bia'));

        $this->actingAs($this->admin)->get('/clientes?tarifa='.$this->tarifa->id)
            ->assertInertia(fn (Assert $page) => $page->has('clientes.data', 2));
    }

    public function test_novo_cliente_exige_leitura_inicial_e_guarda_so_digitos_do_telefone(): void
    {
        $base = ['nome' => 'Nova', 'tarifa_id' => $this->tarifa->id, 'estado' => 'ativo', 'telefone' => '84 562 6156'];

        $this->actingAs($this->admin)->post('/clientes', $base)->assertSessionHasErrors('leitura_inicial');

        $this->actingAs($this->admin)->post('/clientes', [...$base, 'leitura_inicial' => 430])->assertSessionHasNoErrors();

        $cliente = Cliente::where('nome', 'Nova')->firstOrFail();
        $this->assertSame('845626156', $cliente->telefone);
        $this->assertEquals(430, $cliente->leitura_inicial);
    }

    public function test_telefone_invalido_e_rejeitado_e_fixo_de_8_digitos_e_aceite(): void
    {
        $base = ['nome' => 'X', 'tarifa_id' => $this->tarifa->id, 'estado' => 'ativo', 'leitura_inicial' => 0];

        $this->actingAs($this->admin)->post('/clientes', [...$base, 'telefone' => '12345'])->assertSessionHasErrors('telefone');
        $this->actingAs($this->admin)->post('/clientes', [...$base, 'telefone' => '+258 91 000 0000'])->assertSessionHasErrors('telefone');
        $this->actingAs($this->admin)->post('/clientes', [...$base, 'telefone' => '21 745 220'])->assertSessionHasNoErrors();

        $this->assertSame('21745220', Cliente::where('nome', 'X')->firstOrFail()->telefone);
    }

    public function test_primeira_leitura_usa_a_leitura_inicial_como_anterior(): void
    {
        $cliente = $this->cliente('Ana', ['leitura_inicial' => 430]);

        $this->actingAs($this->admin)->post('/leituras', [
            'cliente_id' => $cliente->id, 'mes' => 9, 'ano' => 2026, 'leitura_actual' => 450,
        ])->assertSessionHasNoErrors();

        $leitura = Leitura::firstOrFail();
        $this->assertEquals(430, $leitura->leitura_anterior);
        $this->assertEquals(20, $leitura->consumo());

        // Menor do que a leitura inicial não é aceite.
        $outro = $this->cliente('Rui', ['leitura_inicial' => 100]);
        $this->actingAs($this->admin)->post('/leituras', [
            'cliente_id' => $outro->id, 'mes' => 9, 'ano' => 2026, 'leitura_actual' => 50,
        ])->assertSessionHasErrors('leitura_actual');
    }

    public function test_leituras_expoe_anterior_prevista_e_consumo_medio_para_os_avisos(): void
    {
        $cliente = $this->cliente('Ana', ['leitura_inicial' => 100]);

        $this->actingAs($this->admin)->get('/leituras')
            ->assertInertia(fn (Assert $page) => $page
                ->where('clientes.0.leitura_anterior', 100)
                ->where('clientes.0.consumo_medio', null));

        Leitura::create([
            'cliente_id' => $cliente->id, 'mes' => 8, 'ano' => 2026, 'leitura_anterior' => 100,
            'leitura_actual' => 120, 'confirmado' => true, 'registado_por' => $this->admin->id,
        ]);

        $this->actingAs($this->admin)->get('/leituras')
            ->assertInertia(fn (Assert $page) => $page
                ->where('clientes.0.leitura_anterior', 120)
                ->where('clientes.0.consumo_medio', 20));
    }
}
