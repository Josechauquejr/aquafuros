<?php

namespace App\Models;

use App\Support\Eventos;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasRoles, LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            // A password NUNCA é registada, mesmo alterada — só estes campos.
            ->logOnly(['name', 'email', 'telefone', 'is_active'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('utilizador')
            ->setDescriptionForEvent(fn (string $evento) => "Utilizador {$this->name} foi " . Eventos::verbo($evento));
    }


    protected $fillable = ['name','username', 'email', 'telefone', 'password', 'is_active'];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'password'  => 'hashed',
            'is_active' => 'boolean',
            'email_verified_at' => 'datetime',
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
