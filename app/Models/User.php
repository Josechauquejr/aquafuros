<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasRoles;
    
    
    protected $fillable = ['name','username', 'email', 'telefone', 'password', 'is_active'];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'password'  => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    public function leituras()
    {
        return $this->hasMany(Leitura::class, 'registado_por');
    }

    public function facturas()
    {
        return $this->hasMany(Factura::class, 'gerada_por');
    }

    public function pagamentos()
    {
        return $this->hasMany(Pagamento::class, 'recebido_por');
    }
}
