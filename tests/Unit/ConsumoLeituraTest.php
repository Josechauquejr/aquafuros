<?php

namespace Tests\Unit;

use App\Models\Leitura;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ConsumoLeituraTest extends TestCase
{
    public function test_calculo_do_modelo_e_expressao_sql_produzem_o_mesmo_consumo(): void
    {
        foreach ([[115, 100, 15.0], [100, 100, 0.0], [93, 100, 0.0], [null, 5, 0.0]] as [$actual, $anterior, $esperado]) {
            $leitura = new Leitura([
                'leitura_actual' => $actual,
                'leitura_anterior' => $anterior,
            ]);

            $this->assertSame($esperado, Leitura::consumoEntre($actual, $anterior));
            $this->assertSame($esperado, $leitura->consumo());

            $expresso = Leitura::expressaoConsumoSql('actual', 'anterior');
            $resultadoSql = DB::query()->fromRaw('(SELECT ?::numeric AS actual, ?::numeric AS anterior) AS leitura', [$actual, $anterior])
                ->selectRaw("{$expresso} AS consumo")
                ->value('consumo');

            $this->assertEquals($esperado, (float) $resultadoSql);
        }
    }

    public function test_expressao_sql_recusa_identificadores_nao_validos(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        Leitura::expressaoConsumoSql('leitura_actual; DROP TABLE leituras', 'leitura_anterior');
    }
}
