<?php

namespace Tests\Feature;

use App\Models\Cliente;
use App\Models\EmpresaPerfil;
use App\Models\Factura;
use App\Models\Leitura;
use App\Models\Tarifa;
use Barryvdh\DomPDF\Facade\Pdf;
use Tests\TestCase;

class FacturaDocumentoTest extends TestCase
{
    public function test_factura_com_divida_e_penalizacoes_cabe_numa_pagina_e_usa_contas_configuradas(): void
    {
        $tarifa = new Tarifa(['nome' => 'Comercial', 'consumo_minimo_m3' => 8, 'taxa_minima' => 600]);
        $cliente = new Cliente(['nome' => 'Cliente de demonstração', 'numero_cliente' => 'CLI-0013', 'telefone' => '844356830', 'endereco' => 'Bairro Intaka, Q.14, Casa 420', 'bairro' => 'Intaka', 'data_adesao' => '2026-10-01']);
        $cliente->setRelation('tarifa', $tarifa);
        $leitura = new Leitura(['numero_leitura' => 'LEI-202611-0001', 'leitura_anterior' => 10, 'leitura_actual' => 15]);
        $factura = new Factura(['numero_factura' => 'FAT-202611-0001', 'mes' => 11, 'ano' => 2026, 'valor_consumo' => 600, 'divida_anterior' => 1200, 'multa_anterior' => 144, 'multa' => 0, 'divida_anterior_incluida' => true, 'total_pagar' => 1944, 'estado' => 'pendente', 'data_vencimento' => now()->addDays(15)]);
        $factura->created_at = now();
        $factura->setRelation('cliente', $cliente)->setRelation('leitura', $leitura);
        $empresa = new EmpresaPerfil(['nome' => 'AQUAFUROS DA MANHIÇA, SU, LDA.', 'nuit' => '123456789', 'localizacao' => 'Manhiça', 'mpesa_numero' => '841234567', 'mpesa_titular' => 'Conta configurada', 'emola_numero' => '871234567', 'emola_titular' => 'Conta configurada']);
        $dados = [
            'factura' => $factura, 'empresa' => $empresa, 'logotipo' => null,
            'leitura' => $leitura, 'primeiraLeitura' => false, 'consumo' => 5,
            'consumoAnterior' => 5, 'tarifaMinima' => true, 'tarifa' => $tarifa,
            'totalPago' => 0, 'emFalta' => 1944, 'urlVerificacao' => 'https://example.test/verificar/factura', 'qrImagem' => null,
        ];

        $html = view('pdf.factura', $dados)->render();
        $this->assertStringContainsString('841 234 567', $html);
        $this->assertStringNotContainsString('853 754 024', $html);
        $this->assertStringContainsString('1.944,00', $html);
        $this->assertStringContainsString('Penalizações anteriores', $html);
        $this->assertStringNotContainsString('Gerada por', $html);
        $pdf = Pdf::loadHTML($html)->setPaper('a4');
        $pdf->render();
        $this->assertSame(1, $pdf->getDomPDF()->getCanvas()->get_page_count());
    }
}
