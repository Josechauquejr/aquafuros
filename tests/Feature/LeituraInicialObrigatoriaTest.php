<?php

namespace Tests\Feature;

use App\Models\Cliente;
use App\Models\Leitura;
use App\Models\LeituraEstimada;
use App\Models\Tarifa;
use App\Models\User;
use App\Services\SequenciaLeituras;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * Sem leitura inicial, a primeira leitura partiria de 0 e a factura cobraria
 * o contador inteiro — por isso fica bloqueada até a leitura inicial existir.
 */
class LeituraInicialObrigatoriaTest extends TestCase
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

    private function cliente(?float $inicial, string $numero = 'CLI-0001'): Cliente
    {
        return Cliente::create([
            'numero_cliente' => $numero, 'nome' => 'Ana '.$numero, 'tarifa_id' => $this->tarifa->id,
            'estado' => 'ativo', 'leitura_inicial' => $inicial,
        ]);
    }

    private function registar(Cliente $cliente, float $valor, int $mes = 9)
    {
        return $this->actingAs($this->admin)->post('/leituras', [
            'cliente_id' => $cliente->id, 'mes' => $mes, 'ano' => 2026, 'leitura_actual' => $valor,
        ]);
    }

    public function test_primeira_leitura_e_recusada_sem_leitura_inicial(): void
    {
        $cliente = $this->cliente(null);

        $this->registar($cliente, 1250)->assertSessionHasErrors('leitura_actual');
        $this->assertSame(0, Leitura::count());

        $this->actingAs($this->admin)->postJson('/leituras/previsualizar', [
            'cliente_id' => $cliente->id, 'mes' => 9, 'ano' => 2026, 'leitura_actual' => 1250,
        ])->assertStatus(422);
    }

    public function test_depois_de_registar_a_leitura_inicial_a_leitura_passa(): void
    {
        $cliente = $this->cliente(null);
        $cliente->update(['leitura_inicial' => 1200]);

        $this->registar($cliente, 1250)->assertSessionHasNoErrors();
        $this->assertEquals(1200, Leitura::firstOrFail()->leitura_anterior);
    }

    public function test_leitura_inicial_zero_e_valida(): void
    {
        $this->registar($this->cliente(0), 15)->assertSessionHasNoErrors();
        $this->assertSame(1, Leitura::count());
    }

    public function test_cliente_antigo_com_leituras_continua_a_poder_registar(): void
    {
        $cliente = $this->cliente(null);
        Leitura::create([
            'cliente_id' => $cliente->id, 'mes' => 8, 'ano' => 2026, 'leitura_anterior' => 0,
            'leitura_actual' => 100, 'confirmado' => true, 'registado_por' => $this->admin->id,
        ]);

        $this->registar($cliente, 120)->assertSessionHasNoErrors();
        $this->assertSame(2, Leitura::count());
    }

    public function test_formulario_indica_os_clientes_sem_leitura_inicial(): void
    {
        $this->cliente(null, 'CLI-0001');
        $this->cliente(50, 'CLI-0002');

        $this->actingAs($this->admin)->get('/leituras')
            ->assertInertia(fn (Assert $page) => $page
                ->where('clientes.0.sem_leitura_inicial', true)
                ->where('clientes.1.sem_leitura_inicial', false));
    }

    public function test_estimativa_tambem_e_recusada_sem_leitura_inicial(): void
    {
        $cliente = $this->cliente(null);

        $this->actingAs($this->admin)->post('/leituras-estimadas', [
            'cliente_id' => $cliente->id, 'mes' => 9, 'ano' => 2026, 'consumo_m3' => 10, 'motivo' => 'Contador inacessível',
        ])->assertSessionHasErrors(['cliente_id' => SequenciaLeituras::SEM_LEITURA_INICIAL]);

        $this->assertSame(0, LeituraEstimada::count());
    }
}
