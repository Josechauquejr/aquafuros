<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PagamentoImputacao extends Model
{
    protected $table = 'pagamento_imputacoes';
    public $timestamps = false;
    protected $guarded = [];
    protected $casts = ['valor_principal' => 'decimal:2', 'valor_multa' => 'decimal:2'];

    public function factura() { return $this->belongsTo(Factura::class)->withTrashed(); }
    public function pagamento() { return $this->belongsTo(Pagamento::class); }
}
