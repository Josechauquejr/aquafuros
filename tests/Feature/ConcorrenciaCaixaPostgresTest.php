<?php

namespace Tests\Feature;

use App\Models\Cliente;
use App\Models\Factura;
use App\Models\FechoCaixa;
use App\Models\Tarifa;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Executar somente com phpunit.postgres.xml: os processos filhos precisam
 * ver os registos committed na base PostgreSQL isolada.
 */
class ConcorrenciaCaixaPostgresTest extends TestCase
{
    private $processoConcorrente = null;

    private array $ficheirosConcorrentes = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->assertSame('pgsql', DB::connection()->getDriverName());
        $this->assertSame('aquafuros_p0_regression_test_20261023', DB::connection()->selectOne('select current_database() as name')->name);
        Artisan::call('migrate:fresh');
        $this->seed(RoleSeeder::class);
    }

    protected function tearDown(): void
    {
        $this->terminarProcessoConcorrente();
        parent::tearDown();
    }

    public function test_fechar_caixa_vence_a_corrida_e_o_pagamento_e_recusado(): void
    {
        [$caixa, $factura] = $this->prepararCaixaEFactura('CLI-RACE-CLOSE', 'F-RACE-CLOSE');

        $this->disputarDepoisDoLock('payment', $caixa, $factura, 100);

        $this->actingAs($caixa)->post('/pagamentos/fecho-caixa/confirmar', ['valor_contado' => 0])
            ->assertSessionHasNoErrors()
            ->assertSessionHas('status');

        $output = $this->aguardarProcesso();

        $this->assertStringContainsString('DONE REJECTED', $output);
        $this->assertDatabaseCount('pagamentos', 0);
        $this->assertSame('pendente', $factura->fresh()->estado);
        $this->assertSame(0, (int) FechoCaixa::where('utilizador_id', $caixa->id)->firstOrFail()->numero_pagamentos);
    }

    public function test_pagamento_vence_a_corrida_e_o_fecho_inclui_o_movimento(): void
    {
        [$caixa, $factura] = $this->prepararCaixaEFactura('CLI-RACE-PAY', 'F-RACE-PAY');

        $this->disputarDepoisDoLock('close', $caixa, $factura, 100);

        $this->actingAs($caixa)->post('/pagamentos', [
            'factura_id' => $factura->id,
            'valor_pago' => 100,
            'metodo_pagamento' => 'dinheiro',
        ])->assertSessionHasNoErrors();

        $output = $this->aguardarProcesso();

        $this->assertStringContainsString('DONE', $output);
        $this->assertStringContainsString('/pagamentos/fecho-caixa', $output);
        $this->assertDatabaseCount('pagamentos', 1);
        $fecho = FechoCaixa::where('utilizador_id', $caixa->id)->firstOrFail();
        $this->assertSame(1, (int) $fecho->numero_pagamentos);
        $this->assertEquals(100, $fecho->total_geral);
        $this->assertEquals(100, $fecho->valor_contado - $fecho->diferenca);
        $this->assertSame('parcial', $factura->fresh()->estado);
    }

    private function prepararCaixaEFactura(string $numeroCliente, string $numeroFactura): array
    {
        $caixa = User::factory()->create();
        $caixa->assignRole('caixa');
        $tarifa = Tarifa::create(['nome' => 'Tarifa concorrencia '.$numeroCliente]);
        $cliente = Cliente::create([
            'numero_cliente' => $numeroCliente,
            'nome' => 'Cliente concorrencia',
            'tarifa_id' => $tarifa->id,
            'estado' => 'ativo',
        ]);
        $factura = Factura::create([
            'numero_factura' => $numeroFactura,
            'cliente_id' => $cliente->id,
            'mes' => now()->month,
            'ano' => now()->year,
            'valor_consumo' => 500,
            'total_pagar' => 500,
            'estado' => 'pendente',
            'data_vencimento' => now()->addDays(10)->toDateString(),
        ]);

        return [$caixa, $factura];
    }

    /** Inicia o outro fluxo enquanto o pedido HTTP actual ainda detem o lock. */
    private function disputarDepoisDoLock(string $accao, User $caixa, Factura $factura, float $valor): void
    {
        $iniciado = false;
        DB::listen(function ($query) use (&$iniciado, $accao, $caixa, $factura, $valor) {
            if ($iniciado || ! str_contains(strtolower($query->sql), 'for update') || ! str_contains(strtolower($query->sql), 'users')) {
                return;
            }

            $iniciado = true;
            $worker = base_path('tests/Support/postgres-concurrency-worker.php');
            $marker = sys_get_temp_dir().DIRECTORY_SEPARATOR.'aquafuros-p0-ready-'.bin2hex(random_bytes(8)).'.tmp';
            $stdout = $marker.'.out';
            $stderr = $marker.'.err';
            $this->ficheirosConcorrentes = [$marker, $stdout, $stderr];
            $command = escapeshellarg(PHP_BINARY).' '.escapeshellarg($worker).' '.escapeshellarg($accao).' '.(int) $caixa->id.' '.(int) $factura->id.' '.(float) $valor.' '.escapeshellarg($marker);
            $this->processoConcorrente = proc_open($command, [0 => ['file', 'NUL', 'r'], 1 => ['file', $stdout, 'a'], 2 => ['file', $stderr, 'a']], $pipes, base_path());
            $this->assertIsResource($this->processoConcorrente, 'Nao foi possivel iniciar o processo PostgreSQL concorrente.');

            $limite = microtime(true) + 10;
            while (! file_exists($marker) && microtime(true) < $limite) {
                usleep(20_000);
            }
            $this->assertFileExists($marker, 'O processo concorrente nao iniciou a requisicao.');

            // O processo ja iniciou o segundo fluxo, que deve aguardar o row lock.
            usleep(300_000);
            $this->assertTrue(proc_get_status($this->processoConcorrente)['running'], 'O segundo fluxo terminou antes de o lock ser libertado.');
        });
    }

    private function aguardarProcesso(): string
    {
        $limite = microtime(true) + 15;
        while (microtime(true) < $limite) {
            $estado = proc_get_status($this->processoConcorrente);
            if (! $estado['running']) {
                break;
            }
            usleep(20_000);
        }

        $saida = is_file($this->ficheirosConcorrentes[1] ?? '') ? file_get_contents($this->ficheirosConcorrentes[1]) : '';
        $saida .= is_file($this->ficheirosConcorrentes[2] ?? '') ? file_get_contents($this->ficheirosConcorrentes[2]) : '';
        $this->assertStringContainsString('DONE', $saida, 'O segundo fluxo nao terminou apos libertar o lock.');
        $this->terminarProcessoConcorrente();

        return $saida;
    }

    private function terminarProcessoConcorrente(): void
    {
        if (is_resource($this->processoConcorrente)) {
            $estado = proc_get_status($this->processoConcorrente);
            if ($estado['running']) proc_terminate($this->processoConcorrente);
            proc_close($this->processoConcorrente);
        }
        foreach ($this->ficheirosConcorrentes as $ficheiro) {
            if (is_file($ficheiro)) @unlink($ficheiro);
        }
        $this->processoConcorrente = null;
        $this->ficheirosConcorrentes = [];
    }
}
