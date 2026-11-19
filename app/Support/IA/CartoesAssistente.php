<?php

namespace App\Support\IA;

use App\Models\Cliente;
use App\Models\Factura;
use App\Models\Pagamento;
use App\Models\User;
use App\Support\CicloMes;
use App\Support\MesReferencia;
use Illuminate\Support\Carbon;

/**
 * Cartões de resposta da Aqua, desenhados como no canvas "Aqua — Mascote e
 * Chat". A IA só escolhe o cartão e o período; os números vêm sempre da base
 * de dados, e quando não há dados devolve-se o cartão "vazio" com a mascote.
 */
class CartoesAssistente
{
    public const TIPOS = ['facturacao_mes', 'facturacao_zona', 'cobranca_prioridades', 'saldo_vencido', 'leituras_ciclo', 'recebido_hoje'];

    private const PAPEIS = [
        'facturacao_mes' => ['administrador', 'gestor'],
        'facturacao_zona' => ['administrador', 'gestor'],
        'cobranca_prioridades' => ['administrador', 'gestor'],
        'saldo_vencido' => ['administrador', 'gestor'],
        'leituras_ciclo' => ['administrador', 'gestor', 'tecnico'],
        'recebido_hoje' => ['administrador', 'gestor', 'caixa'],
    ];

    private const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    private const ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    public static function construir(?string $tipo, ?string $periodo, User $user): ?array
    {
        if (! in_array($tipo, self::TIPOS, true) || ! $user->hasAnyRole(self::PAPEIS[$tipo])) {
            return null;
        }
        $mes = self::mes($periodo);

        return match ($tipo) {
            'facturacao_mes' => self::facturacaoMes($mes),
            'facturacao_zona' => self::facturacaoZona($mes),
            'cobranca_prioridades' => self::cobrancaPrioridades(),
            'saldo_vencido' => self::saldoVencido(),
            'leituras_ciclo' => self::leiturasCiclo(),
            'recebido_hoje' => self::recebidoHoje(),
        };
    }

    /**
     * Perguntas com intenção clara vão directas ao cartão, sem passar pela IA
     * (mais rápido e sempre no formato do canvas). Devolve [tipo, periodo] ou null.
     */
    public static function detectar(string $pergunta, array $historico = []): ?array
    {
        $texto = \Illuminate\Support\Str::of($pergunta)->lower()->ascii()->replaceMatches('/\s+/', ' ')->trim()->value();
        if ($texto === '' || preg_match('/\bcomo (faco|fazer|se|posso|devo|registo|registar|emitir|anular)\b|\b(porque|porqu|explica|o que e)\b|\b(regist|cria|anula)\w*/', $texto)) {
            return null;
        }
        $periodo = self::periodoNaFrase($texto);
        $lista = preg_match('/\b(quem|quais|lista|listar|clientes que|nao pag|por pagar|devedor)/', $texto);

        if (preg_match('/factur|emitid/', $texto) && ! $lista) {
            return [preg_match('/\bzonas?\b/', $texto) ? 'facturacao_zona' : 'facturacao_mes', $periodo];
        }
        if (preg_match('/hoje/', $texto) && preg_match('/receb|cobr|entrou|caixa|pagament/', $texto)) {
            return ['recebido_hoje', null];
        }
        if (preg_match('/por onde come|prioridad|a quem cobrar|quem cobrar primeiro|maiores (devedores|saldos|dividas)/', $texto)) {
            return ['cobranca_prioridades', null];
        }
        if (preg_match('/(divida|saldo)s? (em atraso|vencid)|quanto (esta|ha) (vencido|em atraso)|total (vencido|em atraso)/', $texto) && ! $lista && ! preg_match('/\d+ dias/', $texto)) {
            return ['saldo_vencido', null];
        }
        if (preg_match('/leituras?/', $texto) && preg_match('/falt|por fazer|por ler|progresso|quantas|como (vao|estao)/', $texto) && ! $lista) {
            return ['leituras_ciclo', null];
        }
        // Seguimento curto ("E em Agosto?") depois de um cartão de facturação.
        $anterior = (string) (collect($historico)->where('papel', 'assistant')->last()['mensagem'] ?? '');
        if ($periodo && preg_match('/^e (em|no|de|para|e)?\b/', $texto) && mb_strlen($texto) <= 40 && str_starts_with($anterior, 'Facturação')) {
            return [str_contains($anterior, 'por zona') ? 'facturacao_zona' : 'facturacao_mes', $periodo];
        }

        return null;
    }

    /** Seguimentos prontos de cada cartão (chips por cima do compositor). */
    public static function seguimentos(string $tipo, ?string $periodo): array
    {
        $mes = self::mes($periodo);
        $anterior = self::MESES[$mes->copy()->subMonthNoOverflow()->month - 1];

        return match ($tipo) {
            'facturacao_mes' => ['Quem ainda não pagou?', "E em {$anterior}?"],
            'facturacao_zona' => ["E em {$anterior}?"],
            'cobranca_prioridades' => ['Qual é o saldo vencido total?'],
            'saldo_vencido' => ['Por onde começo a cobrança?'],
            'recebido_hoje' => ['Quanto está vencido?'],
            default => [],
        };
    }

    private static function periodoNaFrase(string $texto): ?string
    {
        $referencia = MesReferencia::actual()->copy()->startOfMonth();
        // O nome do mês ganha a "este mês" ("este mês de Setembro" = Setembro).
        $nomes = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        foreach ($nomes as $indice => $nome) {
            if (preg_match('/\b'.$nome.'\b(?: (?:de )?(20\d{2}))?/', $texto, $m)) {
                $ano = isset($m[1]) ? (int) $m[1] : ($indice + 1 > $referencia->month ? $referencia->year - 1 : $referencia->year);

                return sprintf('%04d-%02d', $ano, $indice + 1);
            }
        }
        if (preg_match('/\b(este|neste|deste) mes\b|\bmes actual\b|\bmes atual\b/', $texto)) {
            return $referencia->format('Y-m');
        }
        if (preg_match('/\bmes passado\b|\bultimo mes\b|\bmes anterior\b/', $texto)) {
            return $referencia->copy()->subMonthNoOverflow()->format('Y-m');
        }

        return null;
    }

    /** Resumo em texto do cartão, para o histórico da conversa. */
    public static function resumo(array $cartao): string
    {
        return match ($cartao['tipo']) {
            'numero' => trim($cartao['titulo'].': '.$cartao['valor'].' '.($cartao['unidade'] ?? '').' '.collect($cartao['linhas'] ?? [])->map(fn ($l) => "{$l[0]}: {$l[1]}")->implode('; ')),
            'lista' => trim(($cartao['intro'] ?? $cartao['titulo']).' '.collect($cartao['itens'] ?? [])->map(fn ($i) => "{$i['titulo']}: {$i['valor']}")->implode('; ')),
            default => $cartao['titulo'],
        };
    }

    private static function mes(?string $periodo): Carbon
    {
        if ($periodo && preg_match('/^(\d{4})-(0?[1-9]|1[0-2])$/', $periodo, $m)) {
            return Carbon::create((int) $m[1], (int) $m[2], 1)->startOfDay();
        }

        return MesReferencia::actual()->copy()->startOfMonth();
    }

    private static function nomeMes(Carbon $mes): string
    {
        return self::MESES[$mes->month - 1].' '.$mes->year;
    }

    private static function dinheiro(float $valor): string
    {
        return number_format(round($valor), 0, ',', ' ');
    }

    private static function inteiro(int|float $valor): string
    {
        return number_format($valor, 0, ',', ' ');
    }

    private static function contagem(int $total, string $singular, string $plural): string
    {
        return self::inteiro($total).' '.($total === 1 ? $singular : $plural);
    }

    private static function vazio(string $humor, string $titulo, string $texto, array $acoes = []): array
    {
        return ['tipo' => 'vazio', 'humor' => $humor, 'titulo' => $titulo, 'texto' => $texto, 'acoes' => $acoes];
    }

    private static function facturasDoMes(Carbon $mes)
    {
        return Factura::where('mes', $mes->month)->where('ano', $mes->year)->where('estado', '!=', 'anulada')
            ->withSum('pagamentos', 'valor_pago')->get(['id', 'cliente_id', 'total_pagar', 'estado']);
    }

    private static function pago($facturas): float
    {
        return (float) $facturas->sum(fn (Factura $f) => min((float) $f->total_pagar, (float) ($f->pagamentos_sum_valor_pago ?? 0)));
    }

    /** Canvas "2 · Consulta": número grande, variação, mini-gráfico de 6 meses e três linhas. */
    private static function facturacaoMes(Carbon $mes): array
    {
        $facturas = self::facturasDoMes($mes);
        $nome = self::nomeMes($mes);
        if ($facturas->isEmpty()) {
            $actual = $mes->isSameMonth(MesReferencia::actual());

            return self::vazio('ola', 'Ainda não há facturas de '.self::MESES[$mes->month - 1],
                $actual ? 'As facturas do ciclo saem depois de as leituras serem confirmadas.' : "Não foram emitidas facturas em {$nome}.",
                [['rotulo' => 'Abrir facturas', 'tipo' => 'pagina', 'url' => '/facturas']]);
        }

        $emitido = (float) $facturas->sum('total_pagar');
        $pago = self::pago($facturas);
        $serie = collect(range(5, 0))->map(function (int $recuo) use ($mes) {
            $m = $mes->copy()->subMonthsNoOverflow($recuo);

            return [
                'rotulo' => self::ABREV[$m->month - 1],
                'valor' => round((float) Factura::where('mes', $m->month)->where('ano', $m->year)->where('estado', '!=', 'anulada')->sum('total_pagar'), 2),
                'actual' => $recuo === 0,
            ];
        })->values()->all();
        $anterior = $serie[4]['valor'] ?? 0;
        $variacao = null;
        if ($anterior > 0) {
            $percentagem = ($emitido - $anterior) / $anterior * 100;
            $variacao = [
                'texto' => ($percentagem >= 0 ? '+' : '−').number_format(abs($percentagem), 1, ',', ' ').'% face a '.self::MESES[$mes->copy()->subMonthNoOverflow()->month - 1],
                'tom' => $percentagem >= 0 ? 'bom' : 'mau',
            ];
        }

        return [
            'tipo' => 'numero',
            'icone' => 'factura',
            'titulo' => "Facturação · {$nome}",
            'valor' => self::dinheiro($emitido),
            'unidade' => 'MT',
            'variacao' => $variacao,
            'serie' => $serie,
            'linhas' => [
                ['Já pago', self::dinheiro($pago).' MT'],
                ['Em aberto', self::dinheiro(max(0, $emitido - $pago)).' MT'],
                ['Facturas emitidas', self::inteiro($facturas->count())],
            ],
            'rasto' => 'Consultei '.self::contagem($facturas->count(), 'factura', 'facturas').' de '.self::MESES[$mes->month - 1],
            'acoes' => [
                ['rotulo' => 'Abrir facturas', 'tipo' => 'pagina', 'url' => '/facturas'],
                ['rotulo' => 'Ver por zona', 'tipo' => 'pergunta', 'pergunta' => 'Facturação de '.self::MESES[$mes->month - 1].' '.$mes->year.' por zona'],
            ],
        ];
    }

    private static function facturacaoZona(Carbon $mes): array
    {
        $facturas = self::facturasDoMes($mes)->load('cliente.zona:id,nome');
        $nome = self::nomeMes($mes);
        if ($facturas->isEmpty()) {
            return self::vazio('ola', 'Ainda não há facturas de '.self::MESES[$mes->month - 1], "Sem facturas emitidas em {$nome}, não há valores por zona.");
        }
        $porZona = $facturas->groupBy(fn (Factura $f) => $f->cliente?->zona?->nome ?? 'Sem zona')
            ->map(fn ($itens, $zona) => ['zona' => $zona, 'emitido' => (float) $itens->sum('total_pagar'), 'pago' => self::pago($itens), 'facturas' => $itens->count()])
            ->sortByDesc('emitido')->values();
        $maior = max(1, $porZona->max('emitido'));

        return [
            'tipo' => 'lista',
            'icone' => 'grafico',
            'titulo' => "Facturação por zona · {$nome}",
            'rasto' => 'Consultei '.self::contagem($facturas->count(), 'factura', 'facturas').' de '.self::MESES[$mes->month - 1],
            'itens' => $porZona->take(6)->map(fn ($z) => [
                'titulo' => $z['zona'],
                'detalhe' => self::inteiro($z['facturas']).' facturas · '.($z['emitido'] > 0 ? round($z['pago'] / $z['emitido'] * 100) : 0).'% pago',
                'valor' => self::dinheiro($z['emitido']).' MT',
                'proporcao' => round($z['emitido'] / $maior, 3),
            ])->all(),
            'acoes' => [['rotulo' => 'Abrir facturas', 'tipo' => 'pagina', 'url' => '/facturas']],
        ];
    }

    private static function vencidas()
    {
        return Factura::whereIn('estado', ['pendente', 'parcial'])->whereDate('data_vencimento', '<', today())
            ->withSum('pagamentos', 'valor_pago')->get(['id', 'cliente_id', 'total_pagar', 'data_vencimento']);
    }

    private static function emFalta(Factura $f): float
    {
        return max(0, (float) $f->total_pagar - (float) ($f->pagamentos_sum_valor_pago ?? 0));
    }

    /** Canvas "Desktop · Cobrança": "Comece pelos 3 maiores — juntos são X%". */
    private static function cobrancaPrioridades(): array
    {
        $vencidas = self::vencidas();
        if ($vencidas->isEmpty()) {
            return self::vazio('feliz', 'Não há saldos vencidos', 'Todas as facturas vencidas estão pagas. A cobrança está em dia.');
        }
        $total = (float) $vencidas->sum(fn (Factura $f) => self::emFalta($f));
        $porCliente = $vencidas->groupBy('cliente_id')->map(fn ($itens, $id) => [
            'cliente_id' => $id,
            'saldo' => (float) $itens->sum(fn (Factura $f) => self::emFalta($f)),
            'dias' => (int) Carbon::parse($itens->min('data_vencimento'))->startOfDay()->diffInDays(today()),
        ])->sortByDesc('saldo')->take(3)->values();
        $nomes = Cliente::withTrashed()->whereIn('id', $porCliente->pluck('cliente_id'))->get(['id', 'nome', 'numero_cliente'])->keyBy('id');
        $soma = (float) $porCliente->sum('saldo');
        $percentagem = $total > 0 ? round($soma / $total * 100) : 0;

        return [
            'tipo' => 'lista',
            'tom' => 'atencao',
            'icone' => 'ocorrencia',
            'titulo' => 'Cobrança · saldos vencidos',
            'intro' => 'Comece pelos 3 maiores — juntos são '.$percentagem.'% do saldo vencido.',
            'numerada' => true,
            'rasto' => 'Consultei '.self::contagem($vencidas->count(), 'factura vencida', 'facturas vencidas'),
            'itens' => $porCliente->map(fn ($c) => [
                'titulo' => $nomes[$c['cliente_id']]->nome ?? 'Cliente',
                'detalhe' => ($nomes[$c['cliente_id']]->numero_cliente ?? '').' · '.$c['dias'].' dias de atraso',
                'valor' => self::dinheiro($c['saldo']).' MT',
                'url' => isset($nomes[$c['cliente_id']]) ? '/clientes/'.$nomes[$c['cliente_id']]->numero_cliente : null,
            ])->all(),
            'acoes' => [
                ['rotulo' => 'Abrir cobrança', 'tipo' => 'pagina', 'url' => '/cobranca'],
                ['rotulo' => 'Ver saldo total', 'tipo' => 'pergunta', 'pergunta' => 'Qual é o saldo vencido total?'],
            ],
        ];
    }

    private static function saldoVencido(): array
    {
        $vencidas = self::vencidas();
        if ($vencidas->isEmpty()) {
            return self::vazio('feliz', 'Não há saldos vencidos', 'Todas as facturas vencidas estão pagas. A cobrança está em dia.');
        }
        $total = (float) $vencidas->sum(fn (Factura $f) => self::emFalta($f));
        $maisAntiga = Carbon::parse($vencidas->min('data_vencimento'))->startOfDay()->diffInDays(today());

        return [
            'tipo' => 'numero',
            'tom' => 'atencao',
            'icone' => 'ocorrencia',
            'titulo' => 'Saldo vencido · todos os meses',
            'valor' => self::dinheiro($total),
            'unidade' => 'MT',
            'variacao' => null,
            'serie' => null,
            'linhas' => [
                ['Facturas vencidas', self::inteiro($vencidas->count())],
                ['Clientes', self::inteiro($vencidas->unique('cliente_id')->count())],
                ['Atraso máximo', (int) $maisAntiga.' dias'],
            ],
            'rasto' => 'Consultei '.self::contagem($vencidas->count(), 'factura vencida', 'facturas vencidas'),
            'acoes' => [
                ['rotulo' => 'Abrir cobrança', 'tipo' => 'pagina', 'url' => '/cobranca'],
                ['rotulo' => 'Por onde começo?', 'tipo' => 'pergunta', 'pergunta' => 'Por onde começo a cobrança?'],
            ],
        ];
    }

    private static function leiturasCiclo(): array
    {
        $ciclo = CicloMes::resumo();
        if ($ciclo['clientes'] === 0) {
            return self::vazio('ola', 'Ainda não há clientes activos', 'Quando houver clientes activos, mostro aqui o progresso das leituras.');
        }
        $falta = max(0, $ciclo['clientes'] - $ciclo['lidas']);
        $prazo = $ciclo['diasParaLimite'] > 1 ? "faltam {$ciclo['diasParaLimite']} dias" : ($ciclo['diasParaLimite'] === 1 ? 'falta 1 dia' : ($ciclo['diasParaLimite'] === 0 ? 'termina hoje' : 'prazo passou'));
        if ($falta === 0) {
            return self::vazio('feliz', "Leituras de {$ciclo['mes']} completas", 'Todos os clientes activos já têm leitura neste ciclo.', [['rotulo' => 'Abrir leituras', 'tipo' => 'pagina', 'url' => '/leituras']]);
        }

        return [
            'tipo' => 'numero',
            'tom' => $ciclo['diasParaLimite'] < 0 ? 'atencao' : 'normal',
            'icone' => 'contador',
            'titulo' => "Leituras · {$ciclo['mes']}",
            'valor' => self::inteiro($falta),
            'unidade' => 'por ler',
            'variacao' => ['texto' => $prazo, 'tom' => $ciclo['diasParaLimite'] < 0 ? 'mau' : 'neutro'],
            'progresso' => round($ciclo['lidas'] / $ciclo['clientes'] * 100, 1),
            'serie' => null,
            'linhas' => [
                ['Lidas', self::inteiro($ciclo['lidas']).' de '.self::inteiro($ciclo['clientes'])],
                ['Prazo das leituras', $ciclo['leiturasAte']],
                ['Facturas vencem', $ciclo['vence']],
            ],
            'rasto' => 'Consultei o ciclo de '.$ciclo['mes'],
            'acoes' => [
                ['rotulo' => 'Registar leitura', 'tipo' => 'workflow', 'tarefa' => 'nova_leitura'],
                ['rotulo' => 'Abrir leituras', 'tipo' => 'pagina', 'url' => '/leituras'],
            ],
        ];
    }

    private static function recebidoHoje(): array
    {
        $pagamentos = Pagamento::whereDate('pago_em', today())->get(['id', 'valor_pago', 'metodo_pagamento']);
        if ($pagamentos->isEmpty()) {
            return self::vazio('ola', 'Ainda não houve pagamentos hoje', 'Quando o primeiro pagamento for registado, mostro aqui o total do dia.',
                [['rotulo' => 'Registar pagamento', 'tipo' => 'workflow', 'tarefa' => 'registar_pagamento']]);
        }
        $metodos = ['dinheiro' => 'Numerário', 'mpesa' => 'M-Pesa', 'e-mola' => 'E-Mola', 'banco' => 'Banco'];
        $linhas = $pagamentos->groupBy('metodo_pagamento')->sortByDesc(fn ($itens) => $itens->sum('valor_pago'))->take(2)
            ->map(fn ($itens, $metodo) => [$metodos[$metodo] ?? ucfirst((string) $metodo), self::dinheiro((float) $itens->sum('valor_pago')).' MT'])->values()->all();

        return [
            'tipo' => 'numero',
            'icone' => 'carteira',
            'titulo' => 'Recebido hoje · '.now()->format('d/m'),
            'valor' => self::dinheiro((float) $pagamentos->sum('valor_pago')),
            'unidade' => 'MT',
            'variacao' => null,
            'serie' => null,
            'linhas' => [['Pagamentos', self::inteiro($pagamentos->count())], ...$linhas],
            'rasto' => 'Consultei '.self::contagem($pagamentos->count(), 'pagamento', 'pagamentos').' de hoje',
            'acoes' => [
                ['rotulo' => 'Abrir caixa', 'tipo' => 'pagina', 'url' => '/pagamentos'],
                ['rotulo' => 'Registar', 'tipo' => 'workflow', 'tarefa' => 'registar_pagamento'],
            ],
        ];
    }
}
