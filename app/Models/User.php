<?php

namespace App\Models;

use App\Support\CodigoEmail;
use App\Support\Eventos;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasFactory, Notifiable, HasRoles, LogsActivity, SoftDeletes;

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

    /** A verificação do email é por código de 6 dígitos (não pelo link assinado do Laravel). */
    public function sendEmailVerificationNotification(): void
    {
        CodigoEmail::enviar($this->email, CodigoEmail::VERIFICACAO);
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
