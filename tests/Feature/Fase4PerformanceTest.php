<?php

namespace Tests\Feature;

use App\Models\AcessoSistema;
use App\Models\Cliente;
use App\Models\Factura;
use App\Models\Leitura;
use App\Models\Pagamento;
use App\Models\Tarifa;
use App\Models\User;
use App\Support\AnaliseDados;
use App\Support\AnaliseMensal;
use App\Support\ResumoMensal;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class Fase4PerformanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_serie_mensal_preserva_os_totais_dos_resumos_individuais(): void
    {
        $cliente = $this->cliente();
        $facturaSetembro = $this->factura($cliente, 'P4-SET', 9, 2026, 300, 'pendente', Carbon::parse('2026-09-10'));
        $this->factura($cliente, 'P4-OUT', 10, 2026, 450, 'pendente', Carbon::parse('2026-10-10'));
        $this->factura($cliente, 'P4-ANULADA', 10, 2026, 999, 'anulada', Carbon::parse('2026-10-11'));

        Pagamento::create([
            'numero_recibo' => 'P4-REC', 'factura_id' => $facturaSetembro->id, 'cliente_id' => $cliente->id,
            'valor_pago' => 125, 'metodo_pagamento' => 'dinheiro', 'pago_em' => Carbon::parse('2026-09-20'),
        ]);

        $referencia = Carbon::parse('2026-10-24');
        $serie = ResumoMensal::serie($referencia, 6);

        foreach ($serie as $chave => $resumo) {
            [$ano, $mes] = explode('-', $chave);
            $this->assertEquals(ResumoMensal::calcular((int) $mes, (int) $ano), $resumo, $chave);
        }
    }

    public function test_anomalias_de_consumo_usam_as_tres_leituras_anteriores_do_cliente(): void
    {
        $cliente = $this->cliente();
        $utilizador = User::factory()->create();
        foreach ([[6, 10], [7, 20], [8, 30], [10, 150]] as [$mes, $consumo]) {
            Leitura::create([
                'cliente_id' => $cliente->id, 'mes' => $mes, 'ano' => 2026,
                'leitura_anterior' => 0, 'leitura_actual' => $consumo,
                'confirmado' => true, 'registado_por' => $utilizador->id,
            ]);
        }

        $resultado = AnaliseMensal::consumo(Carbon::parse('2026-10-01'), []);

        $this->assertSame(1, $resultado['totalAnomalias']);
        $this->assertSame('Cliente de teste', $resultado['anomalias'][0]['cliente']);
        $this->assertSame(150.0, $resultado['anomalias'][0]['consumo']);
        $this->assertSame(20.0, $resultado['anomalias'][0]['media']);
    }

    public function test_analise_de_lentidao_agrega_a_contagem_de_consultas(): void
    {
        foreach ([[100, 10, 3], [200, 20, 7], [300, 30, 5]] as [$duracao, $bd, $consultas]) {
            AcessoSistema::create([
                'url' => 'http://aquafuros.test/facturas', 'metodo' => 'GET', 'status_code' => 200,
                'duracao_ms' => $duracao, 'tempo_bd_ms' => $bd, 'consultas' => $consultas,
                'created_at' => now(),
            ]);
        }

        $rota = collect(AnaliseDados::lentidao()['rotas'])->firstWhere('rota', 'GET /facturas');

        $this->assertSame(3, $rota['pedidos']);
        $this->assertSame(5, $rota['consultas_media']);
        $this->assertSame(5, $rota['consultas_p95']);
    }

    public function test_pedido_autenticado_guarda_a_contagem_de_consultas(): void
    {
        $this->seed(RoleSeeder::class);
        $utilizador = User::factory()->create();
        $utilizador->assignRole('administrador');

        $this->actingAs($utilizador)->get('/leituras')->assertOk();

        $acesso = AcessoSistema::where('user_id', $utilizador->id)->latest('id')->firstOrFail();

        $this->assertNotNull($acesso->consultas);
        $this->assertGreaterThan(0, $acesso->consultas);
    }

    private function cliente(): Cliente
    {
        $tarifa = Tarifa::create(['nome' => 'Doméstica']);

        return Cliente::create([
            'numero_cliente' => 'CLI-P4', 'nome' => 'Cliente de teste', 'telefone' => '845626156',
            'tarifa_id' => $tarifa->id, 'estado' => 'ativo',
        ]);
    }

    private function factura(Cliente $cliente, string $numero, int $mes, int $ano, float $valor, string $estado, Carbon $emitidaEm): Factura
    {
        $factura = Factura::create([
            'numero_factura' => $numero, 'cliente_id' => $cliente->id, 'mes' => $mes, 'ano' => $ano,
            'total_pagar' => $valor, 'estado' => $estado,
        ]);
        $factura->forceFill(['created_at' => $emitidaEm])->saveQuietly();

        return $factura;
    }
}
