<?php

namespace App\Support;

use App\Mail\CobrancaMail;
use App\Models\Configuracao;
use App\Models\Factura;
use App\Models\Notificacao;

/**
 * Cobrança por email: gera os lembretes de vencimento e avisos de atraso devidos
 * (uma só vez por factura e tipo) e envia-os, com a factura em PDF anexada.
 * Só se escreve a clientes que têm email — quem não tem fica de fora.
 */
class Notificacoes
{
    /** Interruptor geral dos emails automáticos de cobrança (Administração > Email). */
    public static function automaticas(): bool
    {
        return Configuracao::ligado('email_cobranca_automatica', true);
    }

    /** @return int quantos emails novos ficaram na fila */
    public static function gerar(): int
    {
        $criadas = 0;
        $hoje = now()->startOfDay();

        $regras = [
            ['lembrete_vencimento', $hoje->copy()->addDays((int) config('notificacoes.lembrete_antecedencia_dias'))],
            ['atraso', $hoje->copy()->subDays((int) config('notificacoes.atraso_dias'))],
            ['atraso_grave', $hoje->copy()->subDays((int) config('notificacoes.atraso_grave_dias'))],
        ];

        foreach ($regras as [$tipo, $dataAlvo]) {
            // Lembrete: vence exactamente nessa data. Atrasos: vencida até essa data (apanha as que escaparam).
            $facturas = Factura::whereIn('estado', ['pendente', 'parcial'])
                ->when($tipo === 'lembrete_vencimento',
                    fn ($q) => $q->whereDate('data_vencimento', $dataAlvo->toDateString()),
                    fn ($q) => $q->whereDate('data_vencimento', '<=', $dataAlvo->toDateString()))
                ->with(['cliente' => fn ($q) => $q->where('estado', '!=', 'inativo')])
                ->withSum('pagamentos', 'valor_pago')
                ->get();

            foreach ($facturas as $factura) {
                $cliente = $factura->cliente;
                if (! $cliente || ! filled($cliente->email) || $factura->emFalta() <= 0) {
                    continue;
                }
                $intervalo = (int) Configuracao::valor('email_intervalo_cobranca_dias', config('notificacoes.intervalo_minimo_dias', 7));
                if ($intervalo > 0 && Notificacao::where('cliente_id', $cliente->id)
                    ->where('estado', 'enviada')
                    ->where('enviada_em', '>=', now()->subDays($intervalo))
                    ->exists()) {
                    continue;
                }
                // O atraso grave substitui o atraso simples: não manda os dois à mesma factura.
                if ($tipo === 'atraso' && $factura->data_vencimento->lte($hoje->copy()->subDays((int) config('notificacoes.atraso_grave_dias')))) {
                    continue;
                }

                $nova = Notificacao::firstOrCreate(
                    ['cliente_id' => $cliente->id, 'factura_id' => $factura->id, 'tipo' => $tipo],
                    ['canal' => 'email', 'email' => trim($cliente->email), 'mensagem' => self::resumo($tipo, $factura)],
                );
                $criadas += $nova->wasRecentlyCreated ? 1 : 0;
            }
        }

        return $criadas;
    }

    /** Texto curto para a lista (o email tem o seu próprio modelo). */
    private static function resumo(string $tipo, Factura $factura): string
    {
        $valor = number_format($factura->emFalta(), 2, ',', ' ').' MZN';

        return match ($tipo) {
            'lembrete_vencimento' => "Factura {$factura->numero_factura} ({$valor}) vence a ".$factura->data_vencimento->format('d/m/Y').'.',
            'atraso' => "Factura {$factura->numero_factura} ({$valor}) vencida desde ".$factura->data_vencimento->format('d/m/Y').' ('.CobrancaMail::diasDeAtraso($factura).' dia(s) de atraso).',
            default => "Factura {$factura->numero_factura} ({$valor}) em atraso há ".CobrancaMail::diasDeAtraso($factura).' dias — aviso de corte.',
        };
    }

    /** Envia um email da fila. Devolve true se saiu. */
    public static function enviar(Notificacao $n, string $origem = 'automatico', ?int $enviadoPor = null): bool
    {
        $n->loadMissing(['cliente', 'factura.leitura']);
        $factura = $n->factura;

        // Entretanto pagou (ou a factura desapareceu): já não faz sentido avisar.
        if (! $factura || $factura->emFalta() <= 0 || ! $n->cliente) {
            $n->delete();

            return false;
        }

        $envio = RegistoEmail::enviar(new CobrancaMail($n->tipo, $n->cliente, collect([$factura])), $n->email, [
            'tipo' => $n->tipo, 'origem' => $origem, 'cliente_id' => $n->cliente_id, 'factura_id' => $factura->id, 'enviado_por' => $enviadoPor,
        ]);

        if ($envio->estado === 'enviado') {
            $n->update(['estado' => 'enviada', 'enviada_em' => now(), 'erro' => null]);

            return true;
        }

        $n->update(['estado' => 'falhou', 'erro' => $envio->erro]);

        return false;
    }

    /** Envia os que estão por enviar (até 200 de cada vez). @return int quantos saíram */
    public static function enviarPendentes(string $origem = 'automatico', ?int $enviadoPor = null): int
    {
        $enviadas = 0;

        Notificacao::where('estado', 'pendente')->orderBy('id')->limit(200)->get()
            ->each(function (Notificacao $n) use (&$enviadas, $origem, $enviadoPor) {
                $enviadas += self::enviar($n, $origem, $enviadoPor) ? 1 : 0;
            });

        return $enviadas;
    }
}
