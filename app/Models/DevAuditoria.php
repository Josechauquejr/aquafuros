<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Registo de tudo o que o Desenvolvedor faz no painel. Só se acrescenta:
 * nenhuma linha pode ser alterada nem apagada pela aplicação.
 */
class DevAuditoria extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'dev_auditoria';

    protected $fillable = ['user_id', 'acao', 'alvo', 'detalhes', 'ip', 'user_agent'];

    protected $casts = ['detalhes' => 'array'];

    protected static function booted(): void
    {
        static::updating(fn () => throw new \LogicException('O registo de auditoria é imutável.'));
        static::deleting(fn () => throw new \LogicException('O registo de auditoria não pode ser apagado.'));
    }

    public function user()
    {
        return $this->belongsTo(User::class)->withTrashed();
    }

    /** Regista uma acção do painel (nunca deixa uma falha aqui partir o pedido). */
    public static function registar(string $acao, ?string $alvo = null, array $detalhes = [], ?\Illuminate\Http\Request $request = null): void
    {
        try {
            $request ??= request();

            static::create([
                'user_id' => $request->user()?->id,
                'acao' => $acao,
                'alvo' => $alvo !== null ? mb_substr($alvo, 0, 255) : null,
                'detalhes' => $detalhes ?: null,
                'ip' => $request->ip(),
                'user_agent' => mb_substr((string) $request->userAgent(), 0, 255),
            ]);
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
