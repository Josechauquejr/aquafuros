<?php

namespace App\Models;

use App\Support\Eventos;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * Configurações de negócio editáveis a partir da interface (ex.: a taxa de
 * ligação de novo contrato), guardadas como pares chave/valor em vez de
 * espalhadas em ficheiros de config — para poderem ser alteradas sem
 * precisar de acesso ao servidor.
 */
class Configuracao extends Model
{
    private const PREFIXO_MULTA_ISENTA = 'multa_isenta_';

    use LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['valor'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('configuracao')
            ->setDescriptionForEvent(
                fn (string $evento) => "Configuração \"{$this->chave}\" foi " . Eventos::verbo($evento),
            );
    }

    protected $table = 'configuracoes';

    protected $fillable = ['chave', 'valor'];

    protected $casts = [
        'valor' => 'decimal:2',
    ];

    public static function valor(string $chave, float $omissao = 0.0): float
    {
        return (float) (static::where('chave', $chave)->value('valor') ?? $omissao);
    }

    /** Interruptor (sim/não) guardado como 1/0. */
    public static function ligado(string $chave, bool $omissao = false): bool
    {
        return static::valor($chave, $omissao ? 1.0 : 0.0) >= 1.0;
    }

    /** Prazos e limites editáveis em Tarifas > Regras gerais de cobrança (com os valores de origem). */
    public static function regrasDeCobranca(): array
    {
        return [
            'leituras_dia_limite' => (int) static::valor('leituras_dia_limite', 25),
            'pagamento_dias_retroactivos' => (int) static::valor('pagamento_dias_retroactivos', 7),
        ];
    }

    public static function multaIsentaParaMes(int $mes, int $ano): bool
    {
        $chave = self::chaveMultaIsenta($mes, $ano);
        $cacheKey = 'configuracoes.multa_isenta.'.sprintf('%04d%02d', $ano, $mes);

        return Cache::remember($cacheKey, now()->addMinutes(5), fn (): bool => static::ligado($chave));
    }

    public static function definirMultaIsenta(int $mes, int $ano, bool $isenta): void
    {
        $chave = self::chaveMultaIsenta($mes, $ano);
        static::definir($chave, $isenta ? 1.0 : 0.0);
        Cache::forget('configuracoes.multa_isenta.'.sprintf('%04d%02d', $ano, $mes));
    }

    /** @return list<array{referencia: string, mes: int, ano: int}> */
    public static function mesesSemMulta(): array
    {
        return static::query()->where('chave', 'like', self::PREFIXO_MULTA_ISENTA.'%')
            ->where('valor', '>=', 1)
            ->orderBy('chave')
            ->pluck('chave')
            ->map(function (string $chave): ?array {
                if (! preg_match('/^multa_isenta_(\\d{4})(\\d{2})$/', $chave, $correspondencia)) {
                    return null;
                }

                $ano = (int) $correspondencia[1];
                $mes = (int) $correspondencia[2];
                if (! checkdate($mes, 1, $ano)) {
                    return null;
                }

                return ['referencia' => sprintf('%04d-%02d', $ano, $mes), 'mes' => $mes, 'ano' => $ano];
            })
            ->filter()
            ->values()
            ->all();
    }

    private static function chaveMultaIsenta(int $mes, int $ano): string
    {
        return sprintf('%s%04d%02d', self::PREFIXO_MULTA_ISENTA, $ano, $mes);
    }
    public static function definir(string $chave, float $valor): void
    {
        static::updateOrCreate(['chave' => $chave], ['valor' => $valor]);
    }
}
