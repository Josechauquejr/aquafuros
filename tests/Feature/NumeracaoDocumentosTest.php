<?php

namespace Tests\Feature;

use App\Models\Cliente;
use App\Models\Factura;
use App\Models\Tarifa;
use App\Support\NumeracaoDocumentos;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NumeracaoDocumentosTest extends TestCase
{
    use RefreshDatabase;

    public function test_sequencia_comeca_depois_do_maior_numero_historico_incluindo_factura_anulada(): void
    {
        $tarifa = Tarifa::create(['nome' => 'Doméstica']);
        $cliente = Cliente::create([
            'numero_cliente' => 'CLI-0001',
            'nome' => 'Ana',
            'tarifa_id' => $tarifa->id,
            'estado' => 'ativo',
        ]);

        $factura = Factura::create([
            'numero_factura' => 'FAT-202610-0012',
            'cliente_id' => $cliente->id,
            'mes' => 10,
            'ano' => 2026,
            'total_pagar' => 100,
            'estado' => 'anulada',
        ]);
        $factura->delete();

        $consulta = fn () => Factura::withTrashed()
            ->where('numero_factura', 'like', 'FAT-202610-%');

        $this->assertSame(
            'FAT-202610-0013',
            NumeracaoDocumentos::proximoNumero('FAT-202610', $consulta(), 'numero_factura', 'FAT-202610-%04d'),
        );
        $this->assertSame(
            'FAT-202610-0014',
            NumeracaoDocumentos::proximoNumero('FAT-202610', $consulta(), 'numero_factura', 'FAT-202610-%04d'),
        );
    }
}
