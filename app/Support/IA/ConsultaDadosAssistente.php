<?php

namespace App\Support\IA;

use App\Models\Cliente;
use App\Models\Factura;
use App\Models\Leitura;
use App\Models\Ocorrencia;
use App\Models\Pagamento;
use App\Models\ProducaoAgua;
use App\Models\User;
use App\Models\Zona;
use Illuminate\Support\Str;

/** Executes semantic, read-only query plans against an allowlisted set of business records. */
class ConsultaDadosAssistente
{
    private const PAPEIS = [
        'clientes' => ['administrador', 'gestor'], 'facturas' => ['administrador', 'gestor'],
        'cobranca' => ['administrador', 'gestor'], 'pagamentos' => ['administrador', 'gestor', 'caixa'],
        'leituras' => ['administrador', 'gestor', 'tecnico'], 'ocorrencias' => ['administrador', 'gestor', 'tecnico'],
        'zonas' => ['administrador'], 'producao' => ['administrador', 'gestor', 'tecnico'],
    ];

    public static function executar(User $user, array $plano): array
    {
        $entidade = $plano['entidade'] ?? 'nenhuma';
        if (empty($plano['usar']) || $entidade === 'nenhuma') return [];
        abort_unless(isset(self::PAPEIS[$entidade]) && $user->hasAnyRole(self::PAPEIS[$entidade]), 403);

        $pagina = max(1, (int) ($plano['pagina'] ?? 1));
        $limite = min(20, max(1, (int) ($plano['limite'] ?? 10)));
        $termo = trim((string) ($plano['pesquisa'] ?? ''));
        [$ano, $mes] = self::periodo((string) ($plano['periodo'] ?? ''));

        $consulta = match ($entidade) {
            'clientes' => self::clientes($termo),
            'facturas' => self::facturas($termo, $ano, $mes),
            'cobranca' => self::cobranca($termo),
            'pagamentos' => self::pagamentos($termo, $ano, $mes),
            'leituras' => self::leituras($termo, $ano, $mes),
            'ocorrencias' => self::ocorrencias($termo),
            'zonas' => self::zonas($termo),
            'producao' => self::producao($termo, $ano, $mes),
        };

        $registos = collect($consulta['registos']);
        $total = $registos->count();
        $totalPaginas = max(1, (int) ceil($total / $limite));
        $pagina = min($pagina, $totalPaginas);
        $registosPagina = $registos->forPage($pagina, $limite)->values()->all();
        $resumo = $consulta['resumo'];
        $clienteDetalhado = null;
        if ($entidade === 'clientes' && ($plano['operacao'] ?? '') === 'detalhar' && $total === 1) {
            $numero = basename((string) ($registos->first()['url'] ?? ''));
            $cliente = Cliente::where('numero_cliente', $numero)->first();
            if ($cliente) $clienteDetalhado = ContextoAssistente::clienteConsultado($cliente->id);
        }

        return [
            'contexto_consulta' => [
                'entidade' => $entidade,
                'operacao' => $plano['operacao'] ?? 'listar',
                'pesquisa' => $termo,
                'periodo' => $ano && $mes ? sprintf('%02d/%04d', $mes, $ano) : null,
                'resumo' => $resumo,
                'registos' => $registosPagina,
                'cliente_detalhado' => $clienteDetalhado,
                'pagina' => $pagina,
                'total_paginas' => $totalPaginas,
            ],
            'consulta_card' => [
                'entidade' => $entidade,
                'titulo' => $consulta['titulo'],
                'resumo' => $resumo,
                'registos' => $registosPagina,
                'pagina' => $pagina,
                'total_paginas' => $totalPaginas,
                'limite' => $limite,
                'url' => $consulta['url'],
                'pesquisa' => $termo,
                'periodo' => $ano && $mes ? sprintf('%04d-%02d', $ano, $mes) : '',
            ],
        ];
    }

    private static function clientes(string $termo): array
    {
        $query = Cliente::query()->with('zona');
        if ($termo !== '') {
            $query->where(function ($q) use ($termo) {
                $q->where('nome', 'like', "%{$termo}%")->orWhere('numero_cliente', 'like', "%{$termo}%");
                if (mb_strlen($termo) >= 2) $q->orWhereIn('id', self::idsClientes($termo));
            });
        }
        $clientes = $query->orderBy('nome')->get();
        return self::resultado('Clientes encontrados', '/clientes', $clientes->map(fn (Cliente $c) => [
            'titulo' => $c->nome, 'detalhe' => "{$c->numero_cliente} · {$c->estado} · zona ".($c->zona?->nome ?? 'sem zona'),
            'url' => '/clientes/'.$c->numero_cliente,
        ])->all(), ['clientes' => $clientes->count()]);
    }

    private static function facturas(string $termo, ?int $ano, ?int $mes): array
    {
        $query = Factura::with('cliente:id,nome,numero_cliente')->when($ano, fn ($q) => $q->where('ano', $ano))
            ->when($mes, fn ($q) => $q->where('mes', $mes));
        // "em aberto", "por pagar", "quem não pagou", "pagas", "vencidas" são
        // filtros de estado, não nomes de clientes nem números de factura.
        $estado = mb_strtolower($termo);
        if (preg_match('/venc/u', $estado)) {
            $query->whereIn('estado', ['pendente', 'parcial'])->whereDate('data_vencimento', '<', today());
            $termo = '';
        } elseif (preg_match('/aberto|pendent|parcia|por pagar|n[ãa]o pag|devedor|d[ií]vida|falta pagar/u', $estado)) {
            $query->whereIn('estado', ['pendente', 'parcial']);
            $termo = '';
        } elseif (preg_match('/^(as )?(facturas )?pagas?$|liquidad/u', $estado)) {
            $query->where('estado', 'paga');
            $termo = '';
        }
        $query->where('estado', '!=', 'anulada');
        if ($termo !== '') $query->where(fn ($q) => $q->where('numero_factura', 'like', "%{$termo}%")
            ->orWhereIn('cliente_id', self::idsClientes($termo)));
        $facturas = $query->orderByDesc('ano')->orderByDesc('mes')->orderByDesc('id')->get();
        return self::resultado('Facturas', '/facturas', $facturas->map(fn (Factura $f) => [
            'titulo' => $f->numero_factura, 'detalhe' => ($f->cliente?->nome ?? 'Cliente').' · '.sprintf('%02d/%04d', $f->mes, $f->ano).' · '.self::dinheiro((float) $f->total_pagar).' · saldo '.self::dinheiro($f->emFalta()).' · '.$f->estado,
            'url' => '/facturas/'.$f->id,
        ])->all(), ['facturas' => $facturas->count(), 'total_emitido' => round((float) $facturas->sum('total_pagar'), 2), 'saldo_em_falta' => round((float) $facturas->sum(fn (Factura $f) => $f->emFalta()), 2)]);
    }

    private static function cobranca(string $termo): array
    {
        $facturas = Factura::whereIn('estado', ['pendente', 'parcial'])->whereDate('data_vencimento', '<', today())
            ->withSum('pagamentos', 'valor_pago')->with('cliente:id,nome,numero_cliente')
            ->get(['id', 'cliente_id', 'total_pagar', 'data_vencimento']);
        $linhas = $facturas->groupBy('cliente_id')->map(function ($itens, $clienteId) {
            $cliente = $itens->first()->cliente;
            if (! $cliente) return null;
            return [
                'cliente' => $cliente,
                'facturas' => $itens->count(),
                'saldo' => round((float) $itens->sum(fn (Factura $f) => max(0, (float) $f->total_pagar - (float) ($f->pagamentos_sum_valor_pago ?? 0))), 2),
                'dias' => (int) $itens->min('data_vencimento')->diffInDays(today()->startOfDay()),
            ];
        })->filter();
        if ($termo !== '') {
            $alvo = Str::ascii(mb_strtolower($termo));
            $linhas = $linhas->filter(fn ($l) => str_contains(Str::ascii(mb_strtolower($l['cliente']->nome.' '.$l['cliente']->numero_cliente)), $alvo));
        }
        $linhas = $linhas->sortByDesc('saldo')->values();
        return self::resultado('Devedores', '/cobranca', $linhas->map(fn ($l) => [
            'titulo' => $l['cliente']->nome.' ('.$l['cliente']->numero_cliente.')',
            'detalhe' => $l['facturas'].' facturas vencidas · '.self::dinheiro($l['saldo']).' · '.$l['dias'].' dias em atraso',
            'url' => '/clientes/'.$l['cliente']->numero_cliente,
            'valor' => $l['saldo'],
        ])->all(), ['clientes' => $linhas->count(), 'facturas' => (int) $linhas->sum('facturas'), 'saldo_vencido' => round((float) $linhas->sum('saldo'), 2)]);
    }

    private static function pagamentos(string $termo, ?int $ano, ?int $mes): array
    {
        $query = Pagamento::with(['cliente:id,nome,numero_cliente', 'factura:id,numero_factura'])
            ->when($ano, fn ($q) => $q->whereYear('pago_em', $ano))->when($mes, fn ($q) => $q->whereMonth('pago_em', $mes));
        if ($termo !== '') $query->where(fn ($q) => $q->where('numero_recibo', 'like', "%{$termo}%")->orWhereIn('cliente_id', self::idsClientes($termo)));
        $itens = $query->latest('pago_em')->get();
        return self::resultado('Pagamentos e caixa', '/pagamentos', $itens->map(fn (Pagamento $p) => [
            'titulo' => 'Recibo '.$p->numero_recibo, 'detalhe' => ($p->cliente?->nome ?? 'Cliente').' · '.self::dinheiro((float) $p->valor_pago).' · '.($p->pago_em?->format('d/m/Y') ?? '').' · factura '.($p->factura?->numero_factura ?? '—'),
            'url' => '/pagamentos/'.$p->numero_recibo,
        ])->all(), ['pagamentos' => $itens->count(), 'total_recebido' => round((float) $itens->sum('valor_pago'), 2)]);
    }

    private static function leituras(string $termo, ?int $ano, ?int $mes): array
    {
        $query = Leitura::with('cliente:id,nome,numero_cliente')->when($ano, fn ($q) => $q->where('ano', $ano))->when($mes, fn ($q) => $q->where('mes', $mes));
        if ($termo !== '') $query->whereIn('cliente_id', self::idsClientes($termo));
        $itens = $query->orderByDesc('ano')->orderByDesc('mes')->get();
        return self::resultado('Leituras', '/leituras', $itens->map(fn (Leitura $l) => [
            'titulo' => ($l->cliente?->nome ?? 'Cliente').' · '.sprintf('%02d/%04d', $l->mes, $l->ano),
            'detalhe' => 'Contador '.self::numero((float) $l->leitura_actual).' · consumo '.self::numero($l->consumo()).' m³ · '.($l->confirmado ? 'confirmada' : 'por confirmar'),
            'url' => '/leituras/'.$l->id,
        ])->all(), ['leituras' => $itens->count(), 'consumo_m3' => round((float) $itens->sum(fn (Leitura $l) => $l->consumo()), 2)]);
    }

    private static function ocorrencias(string $termo): array
    {
        $query = Ocorrencia::with(['cliente:id,nome,numero_cliente', 'zona:id,nome']);
        if ($termo !== '') $query->where(fn ($q) => $q->where('descricao', 'like', "%{$termo}%")
            ->orWhereIn('cliente_id', self::idsClientes($termo))->orWhereHas('zona', fn ($z) => $z->where('nome', 'like', "%{$termo}%")));
        $itens = $query->latest('reportada_em')->get();
        return self::resultado('Ocorrências', '/ocorrencias', $itens->map(fn (Ocorrencia $o) => [
            'titulo' => ucfirst(str_replace('_', ' ', $o->tipo)), 'detalhe' => str($o->descricao)->limit(150).' · '.($o->cliente?->nome ?? $o->zona?->nome ?? 'Sem associação').' · '.$o->estado,
            'url' => '/ocorrencias',
        ])->all(), ['ocorrencias' => $itens->count(), 'abertas' => $itens->where('estado', 'aberta')->count()]);
    }

    private static function zonas(string $termo): array
    {
        $itens = Zona::query()->when($termo !== '', fn ($q) => $q->where('nome', 'like', "%{$termo}%"))->orderBy('nome')->get();
        return self::resultado('Zonas', '/zonas', $itens->map(fn (Zona $z) => ['titulo' => $z->nome, 'detalhe' => 'Zona '.$z->id, 'url' => '/zonas'])->all(), ['zonas' => $itens->count()]);
    }

    private static function producao(string $termo, ?int $ano, ?int $mes): array
    {
        $query = ProducaoAgua::with('zona:id,nome')->when($ano, fn ($q) => $q->where('ano', $ano))->when($mes, fn ($q) => $q->where('mes', $mes));
        if ($termo !== '') $query->where(fn ($q) => $q->whereHas('zona', fn ($z) => $z->where('nome', 'like', "%{$termo}%"))->orWhereNull('zona_id'));
        $itens = $query->orderByDesc('ano')->orderByDesc('mes')->get();
        return self::resultado('Produção de água', '/producao', $itens->map(fn (ProducaoAgua $p) => [
            'titulo' => $p->zona?->nome ?? 'Sistema todo', 'detalhe' => sprintf('%02d/%04d · %s m³', $p->mes, $p->ano, self::numero((float) $p->volume_m3)), 'url' => '/producao',
        ])->all(), ['registos' => $itens->count(), 'volume_m3' => round((float) $itens->sum('volume_m3'), 2)]);
    }

    private static function idsClientes(string $termo): array
    {
        $alvo = Str::ascii(mb_strtolower($termo));
        $query = Cliente::query();
        if (\Illuminate\Support\Facades\DB::connection()->getDriverName() === 'pgsql') {
            return $query->whereRaw("translate(lower(nome), 'áàâãäéèêëíìîïóòôöõúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn') LIKE ?", ["%{$alvo}%"])
                ->orWhereRaw('lower(numero_cliente) LIKE ?', ["%{$alvo}%"])->pluck('id')->all();
        }
        return $query->get(['id', 'nome', 'numero_cliente'])->filter(fn (Cliente $c) => str_contains(Str::ascii(mb_strtolower($c->nome.' '.$c->numero_cliente)), $alvo))->pluck('id')->all();
    }

    private static function periodo(string $periodo): array
    {
        if (preg_match('/^(\d{4})-(0?[1-9]|1[0-2])$/', $periodo, $m)) return [(int) $m[1], (int) $m[2]];
        if (preg_match('/^(0?[1-9]|1[0-2])\/(\d{4})$/', $periodo, $m)) return [(int) $m[2], (int) $m[1]];
        return [null, null];
    }

    private static function resultado(string $titulo, string $url, array $registos, array $resumo): array
    {
        return compact('titulo', 'url', 'registos', 'resumo');
    }

    private static function dinheiro(float $valor): string
    {
        return number_format($valor, 2, ',', ' ').' MT';
    }

    private static function numero(float $valor): string
    {
        return number_format($valor, 2, ',', ' ');
    }
}
