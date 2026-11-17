<?php

namespace Tests\Feature;

use App\Models\Cliente;
use App\Models\Factura;
use App\Models\Leitura;
use App\Models\Tarifa;
use App\Models\User;
use App\Models\Zona;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class RecomecarSistemaTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private Cliente $ana;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->admin = User::factory()->create();
        $this->admin->assignRole('administrador');

        $tarifa = Tarifa::create(['nome' => 'Doméstica']);
        $zona = Zona::create(['nome' => 'Centro']);
        $this->ana = Cliente::create([
            'numero_cliente' => 'CLI-0001', 'nome' => 'Ana', 'telefone' => '840000000', 'email' => 'ana@exemplo.test',
            'tarifa_id' => $tarifa->id, 'zona_id' => $zona->id, 'estado' => 'ativo', 'leitura_inicial' => 100,
        ]);

        // Movimento real, pelos mesmos fluxos que a aplicação usa.
        $this->actingAs($this->admin)->post('/leituras', [
            'cliente_id' => $this->ana->id, 'mes' => 9, 'ano' => 2026, 'leitura_actual' => 120,
        ])->assertSessionHasNoErrors();

        $factura = Factura::create([
            'numero_factura' => 'F-1', 'cliente_id' => $this->ana->id, 'leitura_id' => Leitura::firstOrFail()->id,
            'mes' => 9, 'ano' => 2026, 'total_pagar' => 300, 'estado' => 'pendente', 'data_vencimento' => '2099-01-01',
        ]);
        // Paga a mais e guarda o excesso: gera recibo, imputação e crédito.
        $this->actingAs($this->admin)->post('/pagamentos', [
            'factura_id' => $factura->id, 'valor_pago' => 350, 'metodo_pagamento' => 'dinheiro', 'guardar_excesso' => true,
        ])->assertSessionHasNoErrors();
        $this->assertGreaterThan(0, DB::table('pagamentos')->count());

        DB::table('ocorrencias')->insert([
            'cliente_id' => $this->ana->id, 'tipo' => 'fuga', 'descricao' => 'Fuga no contador',
            'estado' => 'aberta', 'reportada_em' => now(), 'registado_por' => $this->admin->id,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $factura->delete(); // também os que estão na lixeira têm de sair
    }

    public function test_sem_aplicar_nao_altera_nada(): void
    {
        $this->artisan('sistema:recomecar')->assertSuccessful();

        $this->assertSame(1, Leitura::withTrashed()->count());
        $this->assertSame(1, Factura::withTrashed()->count());
        $this->assertEquals(100, $this->ana->fresh()->leitura_inicial);
    }

    public function test_cancela_sem_a_palavra_de_confirmacao(): void
    {
        $this->artisan('sistema:recomecar', ['--aplicar' => true])
            ->expectsQuestion('Isto não se pode desfazer. Escreva RECOMECAR para continuar', 'sim')
            ->assertFailed();

        $this->assertSame(1, Leitura::withTrashed()->count());
    }

    public function test_deixa_so_os_clientes_sem_leitura_inicial(): void
    {
        $numeroCliente = DB::table('numeracoes_documentos')->where('chave', 'CLI')->value('proximo_numero');

        $this->artisan('sistema:recomecar', ['--aplicar' => true])
            ->expectsQuestion('Isto não se pode desfazer. Escreva RECOMECAR para continuar', 'RECOMECAR')
            ->assertSuccessful();

        foreach (['leituras', 'facturas', 'pagamentos', 'pagamento_imputacoes', 'creditos', 'ocorrencias',
            'fechos_caixa', 'envios_email', 'notificacoes', 'leituras_estimadas', 'ajustes_leitura'] as $tabela) {
            $this->assertSame(0, DB::table($tabela)->count(), "{$tabela} não ficou vazia");
        }

        $ana = $this->ana->fresh();
        $this->assertNull($ana->leitura_inicial);
        $this->assertSame(['Ana', 'CLI-0001', '840000000', 'ana@exemplo.test', 'ativo'],
            [$ana->nome, $ana->numero_cliente, $ana->telefone, $ana->email, $ana->estado]);
        $this->assertNotNull($ana->zona_id);

        // A numeração de documentos recomeça; a de clientes continua.
        $this->assertSame(0, DB::table('numeracoes_documentos')->where('chave', '!=', 'CLI')->count());
        $this->assertEquals($numeroCliente, DB::table('numeracoes_documentos')->where('chave', 'CLI')->value('proximo_numero'));
        $this->assertSame(0, DB::table('activity_log')->where('subject_type', Factura::class)->count());

        $this->assertSame(1, User::count());
    }
}
