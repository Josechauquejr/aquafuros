<?php

namespace App\Support;

use App\Models\Factura;
use App\Models\Notificacao;
use Illuminate\Support\Facades\Http;

/**
 * Fila de mensagens aos clientes: gera os lembretes e avisos devidos (uma só
 * vez por factura e tipo) e envia os pendentes pelo canal configurado.
 */
class Notificacoes
{
    /** @return int quantas mensagens novas foram criadas */
    public static function gerar(): int
    {
        $criadas = 0;
        $hoje = now()->startOfDay();

        $regras = [
            ['lembrete_vencimento', $hoje->copy()->addDays((int) config('notificacoes.lembrete_antecedencia_dias')), fn ($c, $f) => Mensagens::lembrete($c, $f)],
            ['atraso', $hoje->copy()->subDays((int) config('notificacoes.atraso_dias')), fn ($c, $f) => Mensagens::atraso($c, $f)],
            ['atraso_grave', $hoje->copy()->subDays((int) config('notificacoes.atraso_grave_dias')), fn ($c, $f) => Mensagens::atrasoGrave($c, $f)],
        ];

        foreach ($regras as [$tipo, $dataAlvo, $mensagem]) {
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
                if (! $cliente || ! Telefone::normalizar($cliente->telefone) || $factura->emFalta() <= 0) {
                    continue;
                }
                // O atraso grave substitui o atraso simples: não manda os dois à mesma factura.
                if ($tipo === 'atraso' && $factura->data_vencimento->lte($hoje->copy()->subDays((int) config('notificacoes.atraso_grave_dias')))) {
                    continue;
                }

                $nova = Notificacao::firstOrCreate(
                    ['cliente_id' => $cliente->id, 'factura_id' => $factura->id, 'tipo' => $tipo],
                    ['canal' => 'whatsapp', 'telefone' => Telefone::normalizar($cliente->telefone), 'mensagem' => $mensagem($cliente, $factura)],
                );
                $criadas += $nova->wasRecentlyCreated ? 1 : 0;
            }
        }

        return $criadas;
    }

    /**
     * Envia pelo canal configurado. No modo manual nada se envia (fica à espera
     * de quem abre o WhatsApp). Devolve quantas ficaram enviadas.
     */
    public static function enviarPendentes(): int
    {
        if (config('notificacoes.driver') !== 'webhook' || ! config('notificacoes.webhook_url')) {
            return 0;
        }

        $enviadas = 0;

        Notificacao::where('estado', 'pendente')->orderBy('id')->limit(200)->get()->each(function (Notificacao $n) use (&$enviadas) {
            try {
                $resposta = Http::timeout(15)
                    ->withToken((string) config('notificacoes.webhook_token'))
                    ->post(config('notificacoes.webhook_url'), [
                        'canal' => $n->canal, 'telefone' => '258'.$n->telefone, 'mensagem' => $n->mensagem, 'referencia' => $n->id,
                    ]);

                if ($resposta->successful()) {
                    $n->update(['estado' => 'enviada', 'enviada_em' => now(), 'erro' => null]);
                    $enviadas++;
                } else {
                    $n->update(['estado' => 'falhou', 'erro' => 'HTTP '.$resposta->status()]);
                }
            } catch (\Throwable $e) {
                $n->update(['estado' => 'falhou', 'erro' => mb_substr($e->getMessage(), 0, 250)]);
            }
        });

        return $enviadas;
    }
}
