<?php

namespace App\Support;

/**
 * Lê os ficheiros de log da aplicação (storage/logs/*.log) para o painel do
 * Desenvolvedor. Só lê o fim de cada ficheiro (os últimos MAX_BYTES) para
 * nunca carregar um log enorme em memória, e mascara segredos no texto.
 */
class LeitorLogs
{
    public const MAX_BYTES = 2097152; // 2 MB

    public const NIVEIS = ['debug', 'info', 'notice', 'warning', 'error', 'critical', 'alert', 'emergency'];

    private const CABECALHO = '/^\[(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2})[^\]]*\] (\w+)\.([A-Za-z]+): (.*)$/';

    /** @return array<int, array{nome: string, kb: int, modificado: string}> mais recente primeiro */
    public static function ficheiros(): array
    {
        return collect(glob(storage_path('logs/*.log')) ?: [])
            ->filter(fn ($f) => is_file($f) && is_readable($f))
            ->sortByDesc(fn ($f) => filemtime($f))
            ->map(fn ($f) => ['nome' => basename($f), 'kb' => (int) round(filesize($f) / 1024), 'modificado' => date('Y-m-d H:i:s', filemtime($f))])
            ->values()->all();
    }

    /**
     * Entradas do ficheiro (só o nome base, nunca um caminho), da mais recente
     * para a mais antiga, já filtradas.
     *
     * @return array{entradas: array<int, array>, truncado: bool}
     */
    public static function entradas(string $nome, ?string $nivel, ?string $data, ?string $search): array
    {
        $caminho = collect(self::ficheiros())->firstWhere('nome', $nome) ? storage_path('logs/'.$nome) : null;
        if (! $caminho) {
            return ['entradas' => [], 'truncado' => false];
        }

        $tamanho = filesize($caminho);
        $truncado = $tamanho > self::MAX_BYTES;
        $f = fopen($caminho, 'rb');
        if ($truncado) {
            fseek($f, -self::MAX_BYTES, SEEK_END);
        }
        $texto = (string) stream_get_contents($f);
        fclose($f);

        $entradas = [];
        $actual = null;
        foreach (preg_split('/\R/', $texto) as $linha) {
            if (preg_match(self::CABECALHO, $linha, $m)) {
                if ($actual) {
                    $entradas[] = $actual;
                }
                $actual = ['data' => $m[1], 'ambiente' => $m[2], 'nivel' => mb_strtolower($m[3]), 'mensagem' => $m[4], 'detalhe' => ''];
            } elseif ($actual) {
                $actual['detalhe'] .= ($actual['detalhe'] === '' ? '' : "\n").$linha;
            } // linhas antes da primeira entrada (corte a meio) são ignoradas
        }
        if ($actual) {
            $entradas[] = $actual;
        }

        $termo = $search !== null && $search !== '' ? mb_strtolower($search) : null;
        $entradas = array_values(array_filter(array_reverse($entradas), function ($e) use ($nivel, $data, $termo) {
            return (! $nivel || $e['nivel'] === $nivel)
                && (! $data || str_starts_with($e['data'], $data))
                && (! $termo || str_contains(mb_strtolower($e['mensagem'].' '.$e['detalhe']), $termo));
        }));

        return [
            'entradas' => array_map(fn ($e) => [
                ...$e,
                'mensagem' => self::mascarar(mb_substr($e['mensagem'], 0, 2000)),
                'detalhe' => self::mascarar(mb_substr(trim($e['detalhe']), 0, 6000)),
            ], $entradas),
            'truncado' => $truncado,
        ];
    }

    /** Esconde valores de campos sensíveis e cabeçalhos de autorização no texto do log. */
    public static function mascarar(string $texto): string
    {
        $texto = preg_replace('/(authorization["\']?\s*[:=]\s*["\']?(?:bearer|basic)?\s*)[A-Za-z0-9._\-+\/=]{8,}/i', '$1••••', $texto);

        return preg_replace('/((?:password|senha|token|secret|api[_-]?key|refresh_token|client_secret)["\']?\s*[:=>]+\s*["\']?)[^"\'\s,;&)}\]]+/i', '$1••••', $texto);
    }
}
