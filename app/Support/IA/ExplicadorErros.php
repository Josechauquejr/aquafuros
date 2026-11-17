<?php

namespace App\Support\IA;

use App\Models\ErroSistema;

/**
 * Explica um erro do sistema em linguagem simples: o que aconteceu, a causa
 * provável e como resolver. Envia ao Gemini o erro gravado e o código à volta
 * da linha onde falhou; emails e números longos (telefones, NUITs) são
 * mascarados antes de sair do servidor.
 */
class ExplicadorErros
{
    private const LINHAS_CONTEXTO = 15;

    private const INSTRUCOES = <<<'TXT'
        És um engenheiro sénior de Laravel 13 / PHP 8.3 / Inertia + React a ajudar a equipa do Aquafuros,
        um sistema de gestão de abastecimento de água (clientes, leituras, facturas, pagamentos, cobrança)
        usado em Moçambique. Recebes um erro registado pela aplicação e o código à volta da linha onde falhou.

        Responde em português de Moçambique, claro e directo, para um programador que conhece o projecto.
        - "o_que_aconteceu": 1–2 frases sem jargão desnecessário.
        - "causa_provavel": a causa mais provável, baseada no código mostrado. Se não tiveres certeza, diz.
        - "como_resolver": passos concretos (ficheiro, método, o que mudar). Inclui código curto quando ajudar.
        - "gravidade": "baixa" (cosmético/raro), "media" (afecta uma funcionalidade), "alta" (dados ou dinheiro em risco, ou bloqueia o trabalho).
        - "afecta_dados": true se o erro pode ter deixado dados incompletos ou inconsistentes.
        Não inventes ficheiros nem métodos que não aparecem no material recebido.
        TXT;

    private const ESQUEMA = [
        'type' => 'OBJECT',
        'properties' => [
            'o_que_aconteceu' => ['type' => 'STRING'],
            'causa_provavel' => ['type' => 'STRING'],
            'como_resolver' => ['type' => 'ARRAY', 'items' => ['type' => 'STRING']],
            'gravidade' => ['type' => 'STRING', 'enum' => ['baixa', 'media', 'alta']],
            'afecta_dados' => ['type' => 'BOOLEAN'],
        ],
        'required' => ['o_que_aconteceu', 'causa_provavel', 'como_resolver', 'gravidade', 'afecta_dados'],
        'propertyOrdering' => ['o_que_aconteceu', 'causa_provavel', 'como_resolver', 'gravidade', 'afecta_dados'],
    ];

    /** @throws IaIndisponivel */
    public static function explicar(ErroSistema $erro, ?int $userId = null): array
    {
        $partes = [
            'Excepção: '.$erro->excepcao,
            'Mensagem: '.self::mascarar($erro->mensagem),
            'Ficheiro: '.self::relativo($erro->ficheiro).':'.$erro->linha,
            'Pedido: '.trim(($erro->metodo ?? '').' '.self::mascarar(parse_url($erro->url ?? '', PHP_URL_PATH) ?? '')),
            'Quando: '.$erro->created_at?->format('Y-m-d H:i'),
        ];

        if ($codigo = self::codigoAoRedor($erro->ficheiro, (int) $erro->linha)) {
            $partes[] = "Código à volta da linha {$erro->linha} (a linha do erro está marcada com >>):\n".$codigo;
        }

        if ($erro->trace) {
            $partes[] = "Rasto da pilha:\n".self::mascarar(str_replace(base_path().DIRECTORY_SEPARATOR, '', $erro->trace));
        }

        $explicacao = Gemini::json('explicar_erro', self::INSTRUCOES, implode("\n\n", $partes), self::ESQUEMA, $userId);

        $erro->forceFill(['explicacao_ia' => $explicacao, 'explicacao_ia_em' => now()])->save();

        return $explicacao;
    }

    /** Linhas do ficheiro à volta do erro, só se o ficheiro for do próprio projecto (não de vendor). */
    private static function codigoAoRedor(?string $ficheiro, int $linha): ?string
    {
        if (! $ficheiro || $linha < 1) {
            return null;
        }

        $real = realpath($ficheiro);
        $base = realpath(base_path());
        $vendor = realpath(base_path('vendor'));
        if (! $real || ! str_starts_with($real, $base) || ($vendor && str_starts_with($real, $vendor)) || ! is_readable($real)) {
            return null;
        }

        $linhas = file($real, FILE_IGNORE_NEW_LINES) ?: [];
        $inicio = max(1, $linha - self::LINHAS_CONTEXTO);
        $fim = min(count($linhas), $linha + self::LINHAS_CONTEXTO);

        $saida = [];
        for ($n = $inicio; $n <= $fim; $n++) {
            $saida[] = ($n === $linha ? '>> ' : '   ').str_pad((string) $n, 5, ' ', STR_PAD_LEFT).' | '.$linhas[$n - 1];
        }

        return self::mascarar(implode("\n", $saida));
    }

    private static function relativo(?string $ficheiro): string
    {
        return str_replace(base_path().DIRECTORY_SEPARATOR, '', (string) $ficheiro);
    }

    /** Esconde emails e sequências longas de dígitos (telefones, NUIT, contas). */
    private static function mascarar(?string $texto): string
    {
        $texto = preg_replace('/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/', '[email]', (string) $texto);

        return preg_replace('/(?<![\w.])\+?\d[\d ]{7,}\d(?![\w.])/', '[número]', $texto);
    }
}
