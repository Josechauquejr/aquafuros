<?php

namespace App\Console\Commands;

use App\Models\Factura;
use Illuminate\Console\Command;

/**
 * As facturas antigas somavam a "dívida anterior" ao total, mas as facturas
 * onde essa dívida nasceu continuavam em aberto — contada a dobrar. Este
 * comando tira essa dívida do total das facturas antigas AINDA PENDENTES E
 * SEM PAGAMENTOS (as únicas em que é seguro). Por omissão só mostra o que
 * faria; com --aplicar grava. As parciais e pagas não se tocam: o que o
 * cliente já pagou pode ter coberto essa dívida, por isso são só listadas.
 */
class CorrigirDividaAnteriorDasFacturas extends Command
{
    protected $signature = 'facturas:corrigir-divida-anterior {--aplicar : Grava as alterações (sem isto só mostra)}';

    protected $description = 'Remove a dívida anterior (contada a dobrar) do total das facturas antigas pendentes e sem pagamentos';

    public function handle(): int
    {
        $antigas = Factura::where('divida_anterior_incluida', true)
            ->where('divida_anterior', '>', 0)
            ->whereIn('estado', ['pendente', 'parcial'])
            ->withCount('pagamentos')
            ->orderBy('numero_factura')
            ->get();

        $seguras = $antigas->filter(fn ($f) => $f->estado === 'pendente' && $f->pagamentos_count === 0);
        $revisao = $antigas->diff($seguras);

        $this->info($seguras->count().' factura(s) pendente(s) sem pagamentos a corrigir:');
        $this->table(
            ['Factura', 'Total actual', 'Dívida anterior', 'Novo total'],
            $seguras->map(fn ($f) => [
                $f->numero_factura,
                number_format((float) $f->total_pagar, 2),
                number_format((float) $f->divida_anterior, 2),
                number_format($f->valorProprio(), 2),
            ])->all(),
        );

        if ($revisao->isNotEmpty()) {
            $this->warn($revisao->count().' factura(s) parcial(is) / com pagamentos — NÃO alteradas, rever à mão:');
            $this->table(
                ['Factura', 'Estado', 'Total', 'Dívida anterior incluída'],
                $revisao->map(fn ($f) => [$f->numero_factura, $f->estado, number_format((float) $f->total_pagar, 2), number_format((float) $f->divida_anterior, 2)])->all(),
            );
        }

        if (! $this->option('aplicar')) {
            $this->comment('Nada foi gravado. Repita com --aplicar para gravar.');

            return self::SUCCESS;
        }

        $seguras->each(fn (Factura $f) => $f->update([
            'total_pagar' => $f->valorProprio(),
            'divida_anterior_incluida' => false,
        ]));
        $this->info($seguras->count().' factura(s) corrigida(s).');

        return self::SUCCESS;
    }
}
