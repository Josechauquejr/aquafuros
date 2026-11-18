<?php

namespace App\Support\IA;

use App\Models\PedidoIa;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Cliente mínimo da API do Google Gemini (REST generateContent).
 *
 * Todas as funcionalidades de IA passam por aqui: a chave nunca sai do
 * servidor, cada chamada fica em `pedidos_ia` e há um limite diário por
 * utilizador. A IA só recebe dados e devolve texto/JSON — nunca altera nada.
 */
class Gemini
{
    private const URL = 'https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent';

    public static function disponivel(): bool
    {
        return filled(config('services.gemini.key'));
    }

    /** Pedidos feitos hoje pelo utilizador (para mostrar e para o limite). */
    public static function usadosHoje(?int $userId): int
    {
        return PedidoIa::where('user_id', $userId)->where('created_at', '>=', now()->startOfDay())->count();
    }

    /**
     * Gera uma resposta em JSON que segue o esquema dado (formato OpenAPI do
     * Gemini: tipos em maiúsculas — OBJECT, STRING, ARRAY, ...).
     *
     * @throws IaIndisponivel
     */
    public static function json(string $funcionalidade, string $instrucoes, string $conteudo, array $esquema, ?int $userId = null): array
    {
        $texto = self::gerar($funcionalidade, $instrucoes, $conteudo, $userId, [
            'responseMimeType' => 'application/json',
            'responseSchema' => $esquema,
        ]);

        $dados = json_decode($texto, true);
        if (! is_array($dados)) {
            throw new IaIndisponivel('A IA devolveu uma resposta num formato inesperado. Tente novamente.');
        }

        return $dados;
    }

    /** Gera texto livre. @throws IaIndisponivel */
    public static function texto(string $funcionalidade, string $instrucoes, string $conteudo, ?int $userId = null): string
    {
        return self::gerar($funcionalidade, $instrucoes, $conteudo, $userId);
    }

    private static function gerar(string $funcionalidade, string $instrucoes, string $conteudo, ?int $userId, array $config = []): string
    {
        if (! self::disponivel()) {
            throw new IaIndisponivel('A IA não está configurada (falta GEMINI_API_KEY).');
        }

        $limite = (int) config('services.gemini.limite_diario');
        if ($userId && $limite > 0 && self::usadosHoje($userId) >= $limite) {
            throw new IaIndisponivel("Atingiu o limite de {$limite} pedidos à IA por hoje.");
        }

        $modelos = array_values(array_unique(array_filter([
            config('services.gemini.model'),
            config('services.gemini.model_reserva'),
        ])));
        $inicio = microtime(true);
        $resposta = null;
        $ultimoErro = null;

        foreach ($modelos as $indice => $modelo) {
            $registo = ['user_id' => $userId, 'funcionalidade' => $funcionalidade, 'modelo' => $modelo];

            try {
                $resposta = Http::withHeaders(['x-goog-api-key' => config('services.gemini.key')])
                    ->timeout(config('services.gemini.timeout'))
                    ->retry(2, 1000, fn ($e) => $e instanceof \Illuminate\Http\Client\ConnectionException
                        || in_array($e->response?->status(), [429, 500, 503], true), throw: false)
                    ->post(sprintf(self::URL, $modelo), array_filter([
                        'systemInstruction' => ['parts' => [['text' => $instrucoes]]],
                        'contents' => [['role' => 'user', 'parts' => [['text' => $conteudo]]]],
                        'generationConfig' => $config ?: null,
                    ]));
            } catch (Throwable $e) {
                $ultimoErro = $e;
                if (isset($modelos[$indice + 1])) {
                    continue;
                }
                self::registar($registo, $inicio, null, false, $e->getMessage());
                throw new IaIndisponivel('Não foi possível contactar a IA. Verifique a ligação e tente novamente.', previous: $e);
            }

            if ($resposta->failed() && in_array($resposta->status(), [404, 429, 500, 503], true) && isset($modelos[$indice + 1])) {
                continue;
            }

            break;
        }

        if ($resposta->failed()) {
            $detalhe = $resposta->json('error.message') ?? $resposta->body();
            self::registar($registo, $inicio, $resposta->json('usageMetadata'), false, "HTTP {$resposta->status()}: {$detalhe}");
            throw new IaIndisponivel(match ($resposta->status()) {
                400 => 'A IA recusou o pedido: '.$detalhe,
                401, 403 => 'A chave do Gemini é inválida ou não tem acesso.',
                404 => "O modelo \"{$modelo}\" não existe. Ajuste GEMINI_MODEL.",
                429 => 'A IA está sobrecarregada ou a quota acabou. Tente daqui a pouco.',
                default => 'A IA respondeu com um erro. Tente novamente.',
            });
        }

        $candidato = $resposta->json('candidates.0');
        $texto = collect($candidato['content']['parts'] ?? [])
            ->reject(fn ($p) => $p['thought'] ?? false)
            ->pluck('text')->filter()->implode('');

        if ($texto === '') {
            $motivo = $candidato['finishReason'] ?? $resposta->json('promptFeedback.blockReason') ?? 'desconhecido';
            self::registar($registo, $inicio, $resposta->json('usageMetadata'), false, "Resposta vazia ({$motivo})");
            throw new IaIndisponivel("A IA não devolveu resposta (motivo: {$motivo}).");
        }

        self::registar($registo, $inicio, $resposta->json('usageMetadata'), true);

        return $texto;
    }

    private static function registar(array $registo, float $inicio, ?array $uso, bool $sucesso, ?string $erro = null): void
    {
        try {
            PedidoIa::create($registo + [
                'tokens_entrada' => (int) ($uso['promptTokenCount'] ?? 0),
                'tokens_saida' => (int) ($uso['candidatesTokenCount'] ?? 0) + (int) ($uso['thoughtsTokenCount'] ?? 0),
                'duracao_ms' => (int) round((microtime(true) - $inicio) * 1000),
                'sucesso' => $sucesso,
                'erro' => $erro ? mb_substr($erro, 0, 2000) : null,
            ]);
        } catch (Throwable) {
            // O registo nunca deve impedir a resposta.
        }
    }
}
