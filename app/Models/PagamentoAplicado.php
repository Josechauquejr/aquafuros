<?php

namespace App\Models;

/** Projecção de leitura: uma parcela de um recibo aplicada à factura de origem. */
class PagamentoAplicado extends Pagamento
{
    protected $table = 'pagamentos_aplicados';
    protected $with = [];
    protected $appends = [];

    protected static function booted(): void
    {
        static::saving(fn () => throw new \LogicException('As parcelas são geridas através do recibo original.'));
        static::deleting(fn () => throw new \LogicException('Estorne o recibo original para remover as suas parcelas.'));
    }
}
