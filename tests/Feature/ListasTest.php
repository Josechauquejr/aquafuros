<?php

namespace Tests\Feature;

use App\Models\Cliente;
use App\Models\Factura;
use App\Models\Pagamento;
use App\Models\Tarifa;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * Listas com ?search / ?periodo / ?sort&dir / filtros — o contrato comum a
 * Clientes, Leituras, Facturas e Pagamentos.
 */
class ListasTest extends TestCase
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

    private function pagamento(Cliente $cliente, string $recibo, float $valor, string $metodo = 'dinheiro'): Pagamento
    {
        $factura = Factura::create([
            'numero_factura' => 'FAT-'.$recibo,
            'cliente_id' => $cliente->id,
            'mes' => 9,
            'ano' => 2026,
            'total_pagar' => $valor,
            'estado' => 'paga',
        ]);

        return Pagamento::create([
            'numero_recibo' => $recibo,
            'factura_id' => $factura->id,
            'cliente_id' => $cliente->id,
            'valor_pago' => $valor,
            'metodo_pagamento' => $metodo,
            'recebido_por' => $this->admin->id,
        ]);
    }

    public function test_pagamentos_ordena_por_valor_e_devolve_o_estado_efectivo(): void
    {
        $ana = $this->cliente('Ana');
        $this->pagamento($ana, 'REC-1', 300);
        $this->pagamento($ana, 'REC-2', 100);
        $this->pagamento($ana, 'REC-3', 200);

        $this->actingAs($this->admin)
            ->get('/pagamentos?sort=valor&dir=asc')
            ->assertInertia(fn (Assert $page) => $page
                ->where('pagamentos.data.0.numero_recibo', 'REC-2')
                ->where('pagamentos.data.2.numero_recibo', 'REC-1')
                ->where('filtros.sort', 'valor')
                ->where('filtros.dir', 'asc'));
    }

    public function test_pagamentos_ignora_coluna_de_ordenacao_invalida(): void
    {
        $this->actingAs($this->admin)
            ->get('/pagamentos?sort=palavra_invalida;drop&dir=asc')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filtros.sort', 'recibo')
                ->where('filtros.dir', 'desc'));
    }

    public function test_pagamentos_filtra_por_metodo_e_pesquisa(): void
    {
        $ana = $this->cliente('Ana');
        $rui = $this->cliente('Rui');
        $this->pagamento($ana, 'REC-1', 100, 'mpesa');
        $this->pagamento($rui, 'REC-2', 100, 'dinheiro');

        $this->actingAs($this->admin)
            ->get('/pagamentos?metodo=mpesa')
            ->assertInertia(fn (Assert $page) => $page->has('pagamentos.data', 1)->where('pagamentos.data.0.numero_recibo', 'REC-1'));

        $this->actingAs($this->admin)
            ->get('/pagamentos?search=Rui')
            ->assertInertia(fn (Assert $page) => $page->has('pagamentos.data', 1)->where('pagamentos.data.0.numero_recibo', 'REC-2'));
    }
}
