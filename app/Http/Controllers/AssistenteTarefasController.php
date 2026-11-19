<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use App\Models\Factura;
use App\Models\Leitura;
use App\Models\Ocorrencia;
use App\Models\Pagamento;
use App\Models\ProducaoAgua;
use App\Models\Zona;
use App\Services\BillingService;
use App\Services\CicloLeiturasEstimadas;
use App\Services\SequenciaLeituras;
use App\Support\Facturacao;
use App\Support\MesReferencia;
use App\Support\NumeracaoDocumentos;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Rule;

/** Operações explícitas iniciadas e confirmadas pelo utilizador no chat da Aqua. */
class AssistenteTarefasController extends Controller
{
    public function listarZonas(): JsonResponse
    {
        return response()->json(['zonas' => Zona::orderBy('nome')->get(['id', 'nome'])]);
    }

    public function criarZona(Request $request): JsonResponse
    {
        $data = $request->validate([
            'confirmacao' => ['required', 'accepted'],
            'nome' => ['required', 'string', 'max:100', Rule::unique('zonas', 'nome')],
        ]);
        $zona = Zona::create(['nome' => trim($data['nome'])]);

        return response()->json(['zona' => ['id' => $zona->id, 'nome' => $zona->nome]]);
    }

    public function criarOcorrencia(Request $request): JsonResponse
    {
        $data = $request->validate([
            'confirmacao' => ['required', 'accepted'],
            'tipo' => ['required', Rule::in(Ocorrencia::TIPOS)],
            'descricao' => ['required', 'string', 'min:5', 'max:2000'],
        ]);
        $ocorrencia = Ocorrencia::create([
            'tipo' => $data['tipo'], 'descricao' => trim($data['descricao']),
            'reportada_em' => now(), 'registado_por' => $request->user()->id,
        ]);

        return response()->json(['ocorrencia' => ['id' => $ocorrencia->id, 'tipo' => $ocorrencia->tipo, 'estado' => $ocorrencia->estado, 'descricao' => $ocorrencia->descricao]]);
    }

    public function listarZonasProducao(): JsonResponse
    {
        return response()->json([
            'zonas' => Zona::orderBy('nome')->get(['id', 'nome']),
            'periodo_actual' => MesReferencia::actual()->format('Y-m'),
        ]);
    }

    public function preverProducao(Request $request): JsonResponse
    {
        $data = $this->validarProducao($request);
        $existente = ProducaoAgua::where('zona_id', $data['zona_id'])->where('mes', $data['mes'])->where('ano', $data['ano'])->first();
        return response()->json([
            'periodo' => sprintf('%02d/%04d', $data['mes'], $data['ano']),
            'zona' => $data['zona_id'] ? Zona::findOrFail($data['zona_id'])->nome : 'Sistema todo',
            'volume_m3' => $data['volume_m3'],
            'valor_anterior' => $existente?->volume_m3,
            'vai_substituir' => $existente !== null,
        ]);
    }

    public function confirmarProducao(Request $request): JsonResponse
    {
        $data = $this->validarProducao($request);
        $request->validate(['confirmacao' => ['required', 'accepted']]);
        $registo = DB::transaction(fn () => ProducaoAgua::updateOrCreate(
            ['zona_id' => $data['zona_id'], 'mes' => $data['mes'], 'ano' => $data['ano']],
            ['volume_m3' => $data['volume_m3'], 'registado_por' => $request->user()->id],
        ));
        return response()->json(['producao' => ['id' => $registo->id, 'zona_id' => $registo->zona_id, 'mes' => $registo->mes, 'ano' => $registo->ano, 'volume_m3' => (float) $registo->volume_m3]]);
    }

    public function pesquisarRegistos(Request $request): JsonResponse
    {
        $data = $request->validate([
            'entidade' => ['required', 'in:clientes,facturas,pagamentos,leituras,ocorrencias,zonas,producao'],
            'pesquisa' => ['nullable', 'string', 'max:100'],
            'accao' => ['nullable', 'in:abrir,editar,listar'],
        ]);
        $entidade = $data['entidade'];
        $accao = $data['accao'] ?? 'abrir';
        $termo = trim((string) ($data['pesquisa'] ?? ''));
        $idsClientes = $termo !== '' && in_array($data['entidade'], ['facturas', 'pagamentos', 'leituras'], true)
            && ! preg_match('/^(FAT|LEI|REC)-/i', $termo)
            ? $this->clientesCorrespondentes($termo, 1000)->pluck('id')
            : collect();
        $papeis = [
            'clientes' => ['administrador', 'gestor'], 'facturas' => ['administrador', 'gestor'],
            'pagamentos' => ['administrador', 'gestor', 'caixa'], 'leituras' => ['administrador', 'gestor', 'tecnico'],
            'ocorrencias' => ['administrador', 'gestor', 'tecnico'], 'zonas' => ['administrador'],
            'producao' => ['administrador', 'gestor', 'tecnico'],
        ];
        abort_unless($request->user()->hasAnyRole($papeis[$entidade]), 403);

        $registos = match ($entidade) {
            'clientes' => $this->clientesCorrespondentes($termo, 10)
                ->map(fn ($c) => ['titulo' => $c->nome, 'detalhe' => "Cliente {$c->numero_cliente} · {$c->estado}", 'url' => '/clientes/'.$c->numero_cliente]),
            'facturas' => Factura::with('cliente:id,nome')->when($termo !== '', fn ($q) => $q->where(fn ($q) => $q->where('numero_factura', 'like', "%{$termo}%")->orWhereIn('cliente_id', $idsClientes)))
                ->latest('id')->limit(10)->get()->map(fn ($f) => ['titulo' => "Factura {$f->numero_factura}", 'detalhe' => ($f->cliente?->nome ?? 'Cliente').' · '.sprintf('%02d/%04d', $f->mes, $f->ano).' · '.$f->estado, 'url' => '/facturas/'.$f->id]),
            'pagamentos' => Pagamento::with(['cliente:id,nome', 'factura:id,numero_factura'])->when($termo !== '', fn ($q) => $q->where(fn ($q) => $q->where('numero_recibo', 'like', "%{$termo}%")->orWhereIn('cliente_id', $idsClientes)))
                ->latest('id')->limit(10)->get()->map(fn ($p) => ['titulo' => "Recibo {$p->numero_recibo}", 'detalhe' => ($p->cliente?->nome ?? 'Cliente').' · factura '.($p->factura?->numero_factura ?? '—').' · '.number_format((float) $p->valor_pago, 2, ',', ' ').' MT', 'url' => '/pagamentos/'.$p->numero_recibo]),
            'leituras' => Leitura::with('cliente:id,nome,numero_cliente')->when($termo !== '', fn ($q) => $q->whereIn('cliente_id', $idsClientes))
                ->latest('id')->limit(10)->get()->map(fn ($l) => ['titulo' => $l->cliente?->nome ?? 'Cliente removido', 'detalhe' => sprintf('%02d/%04d · contador %s · %s', $l->mes, $l->ano, $l->leitura_actual, $l->confirmado ? 'confirmada' : 'pendente'), 'url' => '/leituras/'.$l->id]),
            'ocorrencias' => Ocorrencia::with(['cliente:id,nome', 'zona:id,nome'])->when($termo !== '', fn ($q) => $q->where('descricao', 'like', "%{$termo}%"))
                ->latest('id')->limit(10)->get()->map(fn ($o) => ['titulo' => ucfirst(str_replace('_', ' ', $o->tipo)), 'detalhe' => str($o->descricao)->limit(120).' · '.($o->zona?->nome ?? $o->cliente?->nome ?? 'Sem zona').' · '.$o->estado, 'url' => '/ocorrencias']),
            'zonas' => Zona::query()->when($termo !== '', fn ($q) => $q->where('nome', 'like', "%{$termo}%"))->latest('id')->limit(10)->get()
                ->map(fn ($z) => ['titulo' => $z->nome, 'detalhe' => "Zona {$z->id}", 'url' => '/zonas', 'editar_url' => '/zonas?editar='.$z->id]),
            'producao' => ProducaoAgua::with('zona:id,nome')->when($termo !== '', fn ($q) => $q->whereHas('zona', fn ($z) => $z->where('nome', 'like', "%{$termo}%")))
                ->latest('id')->limit(10)->get()->map(fn ($p) => ['titulo' => $p->zona?->nome ?? 'Sistema todo', 'detalhe' => sprintf('%02d/%04d · %s m³', $p->mes, $p->ano, number_format((float) $p->volume_m3, 2, ',', ' ')), 'url' => '/producao']),
        };

        $registos = $registos->map(function (array $registo) use ($accao) {
            if ($accao === 'editar' && isset($registo['editar_url'])) {
                $registo['url'] = $registo['editar_url'];
            }
            unset($registo['editar_url']);

            return $registo;
        });

        return response()->json(['registos' => $registos->values(), 'accao' => $accao]);
    }

    public function listarDevedores(Request $request): JsonResponse
    {
        $dados = $request->validate(['pagina' => ['nullable', 'integer', 'min:1']]);
        $pagina = (int) ($dados['pagina'] ?? 1);
        $porPagina = 10;
        $facturas = Factura::whereIn('estado', ['pendente', 'parcial'])
            ->whereDate('data_vencimento', '<', today())
            ->withSum('pagamentos', 'valor_pago')
            ->get(['id', 'cliente_id', 'total_pagar', 'data_vencimento']);
        $agrupados = $facturas->groupBy('cliente_id')->map(fn ($itens) => [
            'facturas_vencidas' => $itens->count(),
            'saldo_vencido' => round((float) $itens->sum(fn (Factura $factura) => max(0, (float) $factura->total_pagar - (float) ($factura->pagamentos_sum_valor_pago ?? 0))), 2),
            'dias_em_atraso' => (int) $itens->min('data_vencimento')->diffInDays(today()->startOfDay()),
        ])->sortByDesc('saldo_vencido');
        $ids = $facturas->pluck('cliente_id')->unique();
        $clientes = Cliente::whereIn('id', $ids)->get(['id', 'nome', 'numero_cliente'])->keyBy('id');
        $linhas = $agrupados->map(function (array $dados, int $clienteId) use ($clientes) {
            $cliente = $clientes->get($clienteId);
            return $cliente ? ['cliente' => $cliente->only(['id', 'nome', 'numero_cliente']), ...$dados] : null;
        })->filter()->values();

        return response()->json([
            'totais' => [
                'clientes' => $linhas->count(),
                'facturas' => (int) $facturas->count(),
                'saldo_vencido' => round((float) $linhas->sum('saldo_vencido'), 2),
            ],
            'registos' => $linhas->forPage($pagina, $porPagina)->values(),
            'pagina' => $pagina,
            'por_pagina' => $porPagina,
            'total_paginas' => max(1, (int) ceil($linhas->count() / $porPagina)),
        ]);
    }

    public function paginaConsulta(Request $request): JsonResponse
    {
        $plano = $request->validate([
            'entidade' => ['required', 'in:clientes,facturas,cobranca,pagamentos,leituras,ocorrencias,zonas,producao'],
            'operacao' => ['nullable', 'in:resumo,listar,detalhar'],
            'pesquisa' => ['nullable', 'string', 'max:100'],
            'periodo' => ['nullable', 'string', 'max:20'],
            'pagina' => ['required', 'integer', 'min:1'],
            'limite' => ['required', 'integer', 'min:1', 'max:20'],
        ]);
        $resultado = \App\Support\IA\ConsultaDadosAssistente::executar($request->user(), ['usar' => true, ...$plano]);

        return response()->json(['consulta_card' => $resultado['consulta_card']]);
    }

    public function pesquisarClientes(Request $request): JsonResponse
    {
        $data = $request->validate(['pesquisa' => ['required', 'string', 'min:2', 'max:100']]);
        $termo = trim($data['pesquisa']);
        $clientes = $this->clientesCorrespondentes($termo, 8, true)
            ->map(fn (Cliente $cliente) => $cliente->only(['id', 'nome', 'numero_cliente']));

        return response()->json([
            'clientes' => $clientes,
            'periodo_actual' => MesReferencia::actual()->format('Y-m'),
        ]);
    }

    public function resumoCliente(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasAnyRole(['administrador', 'gestor']), 403);
        $data = $request->validate([
            'pesquisa' => ['required_without:cliente_id', 'nullable', 'string', 'min:2', 'max:100'],
            'cliente_id' => ['required_without:pesquisa', 'nullable', 'integer', 'exists:clientes,id'],
        ]);
        $clientes = isset($data['cliente_id'])
            ? collect([Cliente::findOrFail($data['cliente_id'])])
            : $this->clientesCorrespondentes(trim($data['pesquisa']), 8);

        $resultados = $clientes->map(function (Cliente $cliente) {
            $cliente->loadMissing('tarifa');
            $factura = $cliente->facturas()->latest('ano')->latest('mes')->latest('id')->first();
            $leitura = $cliente->leituras()->latest('ano')->latest('mes')->latest('id')->first();
            $pagamento = $cliente->pagamentos()->latest('pago_em')->latest('id')->first();
            $facturasAbertas = $cliente->facturas()->whereIn('estado', ['pendente', 'parcial'])
                ->with('pagamentos')->orderByDesc('ano')->orderByDesc('mes')->get();
            $facturasAbertas->load('cliente.tarifa');
            $facturasVencidas = $facturasAbertas->filter(fn (Factura $item) => $item->esta_vencida);
            $multasRegistadas = round((float) $facturasAbertas->sum(fn (Factura $item) => $item->multaEmFalta()), 2);
            $multasPrevistas = round((float) $facturasAbertas->sum(fn (Factura $item) => $item->multaAtrasoPrevista()), 2);

            return [
                'id' => $cliente->id,
                'nome' => $cliente->nome,
                'numero_cliente' => $cliente->numero_cliente,
                'estado' => $cliente->estado,
                'url' => '/clientes/'.$cliente->numero_cliente,
                'ultima_factura' => $factura ? [
                    'numero' => $factura->numero_factura,
                    'periodo' => sprintf('%02d/%04d', $factura->mes, $factura->ano),
                    'total' => (float) $factura->total_pagar,
                    'saldo' => $factura->emFalta(),
                    'estado' => $factura->estado,
                    'url' => '/facturas/'.$factura->id,
                ] : null,
                'ultima_leitura' => $leitura ? [
                    'numero' => $leitura->numero_leitura,
                    'periodo' => sprintf('%02d/%04d', $leitura->mes, $leitura->ano),
                    'contador' => (float) $leitura->leitura_actual,
                    'consumo_m3' => $leitura->consumo(),
                    'confirmada' => (bool) $leitura->confirmado,
                    'url' => '/leituras/'.$leitura->id,
                ] : null,
                'ultimo_pagamento' => $pagamento ? [
                    'recibo' => $pagamento->numero_recibo,
                    'data' => $pagamento->pago_em?->toDateString(),
                    'valor' => (float) $pagamento->valor_pago,
                    'metodo' => $pagamento->metodo_pagamento,
                    'url' => '/pagamentos/'.$pagamento->numero_recibo,
                ] : null,
                'calculos' => [
                    'facturas_em_aberto' => $facturasAbertas->count(),
                    'saldo_em_aberto' => round((float) $facturasAbertas->sum(fn (Factura $item) => $item->emFalta()), 2),
                    'facturas_vencidas' => $facturasVencidas->count(),
                    'saldo_vencido' => round((float) $facturasVencidas->sum(fn (Factura $item) => $item->emFalta()), 2),
                    'multas_registadas_em_falta' => $multasRegistadas,
                    'multas_previstas' => $multasPrevistas,
                    'multas_totais_estimadas' => round($multasRegistadas + $multasPrevistas, 2),
                ],
                'facturas_em_aberto' => $facturasAbertas->take(10)->map(fn (Factura $item) => [
                    'numero' => $item->numero_factura,
                    'periodo' => sprintf('%02d/%04d', $item->mes, $item->ano),
                    'total' => (float) $item->total_pagar,
                    'divida_anterior' => $item->divida_anterior_incluida ? (float) $item->divida_anterior : 0,
                    'multa_registada_em_falta' => $item->multaEmFalta(),
                    'multa_prevista' => $item->multaAtrasoPrevista(),
                    'total_pago' => $item->totalPago(),
                    'saldo' => $item->emFalta(),
                    'vencida' => $item->esta_vencida,
                    'url' => '/facturas/'.$item->id,
                ])->values(),
            ];
        })->values();

        return response()->json(['clientes' => $resultados]);
    }

    private function clientesCorrespondentes(string $termo, int $limite, bool $apenasActivos = false)
    {
        $consulta = Cliente::query()->when($apenasActivos, fn ($q) => $q->where('estado', 'ativo'));
        $alvo = \Illuminate\Support\Str::ascii(mb_strtolower($termo));
        if (\Illuminate\Support\Facades\DB::connection()->getDriverName() === 'pgsql') {
            return $consulta->where(function ($q) use ($alvo) {
                $q->whereRaw("translate(lower(nome), 'áàâãäéèêëíìîïóòôöõúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn') LIKE ?", ["%{$alvo}%"])
                    ->orWhereRaw('lower(numero_cliente) LIKE ?', ["%{$alvo}%"]);
            })->orderBy('nome')->limit($limite)->get();
        }

        $directos = (clone $consulta)->where(fn ($q) => $q->where('nome', 'like', "%{$termo}%")
            ->orWhere('numero_cliente', 'like', "%{$termo}%"))->orderBy('nome')->limit($limite)->get();

        if ($directos->isNotEmpty()) {
            return $directos;
        }

        $encontrados = collect();
        (clone $consulta)->select(['id', 'nome', 'numero_cliente', 'estado'])->orderBy('id')->chunkById(500, function ($lote) use ($alvo, $limite, $encontrados) {
            foreach ($lote as $cliente) {
                $nome = \Illuminate\Support\Str::ascii(mb_strtolower($cliente->nome));
                $numero = \Illuminate\Support\Str::ascii(mb_strtolower($cliente->numero_cliente));
                if (str_contains($nome, $alvo) || str_contains($numero, $alvo)) {
                    $encontrados->push($cliente);
                    if ($encontrados->count() >= $limite) return false;
                }
            }
        });

        return $encontrados->sortBy('nome')->values();
    }

    public function facturasDoCliente(Request $request): JsonResponse
    {
        $data = $request->validate(['cliente_id' => ['required', 'integer', 'exists:clientes,id']]);
        $cliente = Cliente::where('estado', 'ativo')->findOrFail($data['cliente_id']);
        $facturas = Factura::with('pagamentos')->where('cliente_id', $cliente->id)
            ->whereIn('estado', ['pendente', 'parcial'])->orderBy('ano')->orderBy('mes')->get()
            ->map(fn (Factura $factura) => [
                'id' => $factura->id,
                'numero' => $factura->numero_factura,
                'mes' => $factura->mes,
                'ano' => $factura->ano,
                'estado' => $factura->estado,
                'em_falta' => $factura->emFalta(),
                'multa_prevista' => $factura->multaAtrasoPrevista(),
            ])->values();

        return response()->json(['facturas' => $facturas]);
    }

    /**
     * Canvas "5 · Pagamento": reparte o valor recebido pelas facturas em aberto
     * do cliente, da mais antiga para a mais recente. Não grava nada.
     */
    public function distribuirPagamento(Request $request): JsonResponse
    {
        $data = $request->validate([
            'cliente_id' => ['required', 'integer', 'exists:clientes,id'],
            'valor' => ['required', 'numeric', 'gt:0'],
        ]);
        $cliente = Cliente::where('estado', 'ativo')->findOrFail($data['cliente_id']);
        $facturas = Factura::with(['pagamentos', 'cliente.tarifa'])->where('cliente_id', $cliente->id)
            ->whereIn('estado', ['pendente', 'parcial'])->orderBy('ano')->orderBy('mes')->orderBy('id')->get();
        if ($facturas->isEmpty()) {
            throw ValidationException::withMessages(['valor' => "{$cliente->nome} não tem facturas por pagar."]);
        }

        $restante = round((float) $data['valor'], 2);
        $linhas = $facturas->map(function (Factura $factura) use (&$restante) {
            $emFalta = round($factura->emFalta() + $factura->multaAtrasoPrevista(), 2);
            $aplicado = round(min($restante, $emFalta), 2);
            $restante = round($restante - $aplicado, 2);

            return [
                'factura_id' => $factura->id,
                'numero' => $factura->numero_factura,
                'mes' => $factura->mes,
                'ano' => $factura->ano,
                'vencida' => (bool) $factura->esta_vencida,
                'em_falta' => $emFalta,
                'aplicado' => $aplicado,
                'fica' => round($emFalta - $aplicado, 2),
            ];
        });
        $totalEmFalta = round((float) $linhas->sum('em_falta'), 2);
        if ($restante > 0.005) {
            throw ValidationException::withMessages(['valor' => 'O valor é maior do que o total em falta ('.number_format($totalEmFalta, 2, ',', ' ').' MT). Registe o excesso como crédito na página Caixa.']);
        }

        return response()->json([
            'cliente' => ['id' => $cliente->id, 'nome' => $cliente->nome, 'numero_cliente' => $cliente->numero_cliente],
            'valor' => round((float) $data['valor'], 2),
            'total_em_falta' => $totalEmFalta,
            'fica_em_aberto' => round($totalEmFalta - (float) $data['valor'], 2),
            'parcelas' => $linhas->filter(fn (array $linha) => $linha['aplicado'] > 0)->values(),
            'restantes' => $linhas->filter(fn (array $linha) => $linha['aplicado'] <= 0)->values(),
        ]);
    }

    public function preverPagamento(Request $request): JsonResponse
    {
        $data = $request->validate([
            'factura_id' => ['required', 'integer', 'exists:facturas,id'],
            'valor_pago' => ['required', 'numeric', 'gt:0'],
            'metodo_pagamento' => ['required', 'in:dinheiro,banco,mpesa,e-mola'],
            'referencia_pagamento' => ['nullable', 'string', 'max:255'],
        ]);
        if ($data['metodo_pagamento'] !== 'dinheiro' && blank($data['referencia_pagamento'] ?? null)) {
            throw ValidationException::withMessages(['referencia_pagamento' => 'Indique a referência da transacção.']);
        }
        $factura = Factura::with('cliente')->findOrFail($data['factura_id']);
        if (! in_array($factura->estado, ['pendente', 'parcial'], true)) {
            throw ValidationException::withMessages(['factura_id' => 'Esta factura já não aceita pagamentos.']);
        }
        $emFalta = round($factura->emFalta() + $factura->multaAtrasoPrevista(), 2);
        if ((float) $data['valor_pago'] > $emFalta + 0.005) {
            throw ValidationException::withMessages(['valor_pago' => 'O valor excede o saldo em falta. Registe o excesso como crédito na página de Pagamentos.']);
        }

        return response()->json([
            'factura' => ['numero' => $factura->numero_factura, 'mes' => $factura->mes, 'ano' => $factura->ano],
            'valor_pago' => round((float) $data['valor_pago'], 2),
            'metodo_pagamento' => $data['metodo_pagamento'],
            'em_falta' => $emFalta,
            'saldo_depois' => round(max(0, $emFalta - (float) $data['valor_pago']), 2),
        ]);
    }

    /**
     * Dados do ecrã "Registar leitura" da Aqua: o cliente, a última leitura
     * (valor e data) e a média de consumo, para mostrar o intervalo esperado.
     */
    public function contextoLeitura(Request $request): JsonResponse
    {
        $data = $request->validate(['cliente_id' => ['required', 'integer', 'exists:clientes,id']]);
        $cliente = Cliente::with('zona:id,nome')->where('estado', 'ativo')->findOrFail($data['cliente_id']);
        $periodo = MesReferencia::actual();
        $recentes = Leitura::where('cliente_id', $cliente->id)->whereNull('anulada_em')
            ->orderByDesc('ano')->orderByDesc('mes')->orderByDesc('id')->limit(6)->get();
        $ultima = $recentes->first();
        // A primeira leitura (desde zero ou desde a leitura inicial) não é um consumo mensal.
        $consumos = $recentes->filter(fn (Leitura $leitura) => (float) $leitura->leitura_anterior > 0)
            ->map(fn (Leitura $leitura) => $leitura->consumo())->filter(fn ($consumo) => $consumo > 0);
        $meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        $dataUltima = $ultima?->confirmado_em ?? $ultima?->created_at;

        return response()->json([
            'cliente' => [
                'id' => $cliente->id,
                'nome' => $cliente->nome,
                'numero_cliente' => $cliente->numero_cliente,
                'zona' => $cliente->zona?->nome,
            ],
            'ultima' => $ultima ? [
                'valor' => (float) $ultima->leitura_actual,
                'periodo' => $meses[$ultima->mes - 1].' '.$ultima->ano,
                'data' => $dataUltima ? $dataUltima->day.' de '.$meses[$dataUltima->month - 1] : null,
                'do_periodo_actual' => $ultima->mes === $periodo->month && $ultima->ano === $periodo->year,
            ] : null,
            'leitura_inicial' => (float) ($cliente->leitura_inicial ?? 0),
            'media_m3' => $consumos->isNotEmpty() ? round((float) $consumos->avg(), 1) : null,
            'periodo_actual' => $periodo->format('Y-m'),
            'mes_actual' => $meses[$periodo->month - 1],
        ]);
    }

    public function preverLeitura(Request $request): JsonResponse
    {
        $data = $this->validarDadosLeitura($request);
        $cliente = Cliente::with('tarifa')->where('estado', 'ativo')->findOrFail($data['cliente_id']);
        $plano = app(SequenciaLeituras::class)->planoInsercao($cliente, $data['mes'], $data['ano'], $data['leitura_actual']);
        $calculo = app(BillingService::class)->calcularParaConsumo($plano['consumo_novo'], $cliente);
        $media = Leitura::where('cliente_id', $cliente->id)->avg(DB::raw(Leitura::expressaoConsumoSql('leitura_actual', 'leitura_anterior')));
        $avisos = [];
        if ($plano['leitura_anterior'] === 0.0) {
            $avisos[] = 'Não existe leitura anterior maior que zero; confirme que o valor inicial do contador está correcto.';
        }
        if ($media && $plano['consumo_novo'] > (float) $media * 1.5) {
            $avisos[] = 'O consumo ultrapassa 150% da média histórica deste cliente.';
        }

        return response()->json([
            'cliente' => ['nome' => $cliente->nome, 'numero_cliente' => $cliente->numero_cliente],
            'plano' => $plano,
            'avisos' => $avisos,
            'previsao_factura' => [
                'consumo_m3' => $calculo['consumo_m3'],
                'valor_consumo' => $calculo['valor_consumo'],
                'divida_anterior' => $calculo['divida_anterior'],
                'valor_factura_estimado' => $calculo['total_pagar'],
                'nota' => 'Estimativa sujeita a acertos e encargos apurados no momento da emissão.',
            ],
        ]);
    }

    public function confirmarLeitura(Request $request): JsonResponse
    {
        $data = $this->validarDadosLeitura($request);
        $request->validate(['confirmacao' => ['required', 'accepted'], 'motivo' => ['nullable', 'string', 'min:5', 'max:1000']]);
        $data['motivo'] = $request->input('motivo');
        $userId = (int) $request->user()->id;

        $resultado = DB::transaction(function () use ($data, $userId) {
            $cliente = Cliente::where('estado', 'ativo')->lockForUpdate()->findOrFail($data['cliente_id']);
            $sequencia = app(SequenciaLeituras::class);
            $plano = $sequencia->planoInsercao($cliente, $data['mes'], $data['ano'], $data['leitura_actual']);
            if ($plano['retroactiva']) {
                if (blank($data['motivo'])) {
                    throw ValidationException::withMessages(['motivo' => 'Uma leitura retroactiva exige um motivo.']);
                }
                if (! $plano['pode_aplicar']) {
                    throw ValidationException::withMessages(['leitura_actual' => 'A leitura afectaria uma factura que não pode ser recalculada. Regularize os pagamentos antes de continuar.']);
                }
                $leitura = $sequencia->inserir($cliente, $data, $userId, $data['motivo']);
            } else {
                $leitura = Leitura::create([
                    'numero_leitura' => NumeracaoDocumentos::proximoNumero(
                        sprintf('LEI-%04d%02d', $data['ano'], $data['mes']),
                        Leitura::withTrashed()->where('numero_leitura', 'like', sprintf('LEI-%04d%02d-', $data['ano'], $data['mes']).'%'),
                        'numero_leitura', sprintf('LEI-%04d%02d-', $data['ano'], $data['mes']).'%04d',
                    ),
                    'cliente_id' => $cliente->id,
                    'mes' => $data['mes'],
                    'ano' => $data['ano'],
                    'leitura_anterior' => $plano['leitura_anterior'],
                    'leitura_actual' => $data['leitura_actual'],
                    'confirmado' => false,
                    'registado_por' => $userId,
                ]);
            }

            $leitura->update(['confirmado' => true, 'confirmado_por' => $userId, 'confirmado_em' => now()]);
            app(CicloLeiturasEstimadas::class)->reconciliarAoConfirmar($leitura->fresh(), $userId);
            $factura = Facturacao::emitir($leitura->fresh(), $userId);

            return compact('leitura', 'factura');
        });

        return response()->json([
            'leitura' => [
                'numero' => $resultado['leitura']->numero_leitura,
                'mes' => $resultado['leitura']->mes,
                'ano' => $resultado['leitura']->ano,
                'leitura_anterior' => (float) $resultado['leitura']->leitura_anterior,
                'leitura_actual' => (float) $resultado['leitura']->leitura_actual,
                'consumo_m3' => $resultado['leitura']->consumo(),
            ],
            'factura' => [
                'numero' => $resultado['factura']->numero_factura,
                'total_pagar' => (float) $resultado['factura']->total_pagar,
                'estado' => $resultado['factura']->estado,
                'data_vencimento' => $resultado['factura']->data_vencimento,
                'url' => '/facturas/'.$resultado['factura']->id,
            ],
        ]);
    }

    private function validarDadosLeitura(Request $request): array
    {
        $data = $request->validate([
            'cliente_id' => ['required', 'integer', 'exists:clientes,id'],
            'mes' => ['required', 'integer', 'min:1', 'max:12'],
            'ano' => ['required', 'integer', 'min:2000', 'max:2100'],
            'leitura_actual' => ['required', 'numeric', 'min:0'],
        ]);
        $periodo = sprintf('%04d-%02d', $data['ano'], $data['mes']);
        $actual = MesReferencia::actual()->format('Y-m');
        if ($periodo > $actual || $periodo < MesReferencia::actual()->copy()->subYears(5)->format('Y-m')) {
            throw ValidationException::withMessages(['mes' => 'Escolha um período entre o ciclo actual e os últimos cinco anos.']);
        }

        return [
            'cliente_id' => (int) $data['cliente_id'],
            'mes' => (int) $data['mes'],
            'ano' => (int) $data['ano'],
            'leitura_actual' => (float) $data['leitura_actual'],
        ];
    }

    private function validarProducao(Request $request): array
    {
        $data = $request->validate([
            'zona_id' => ['nullable', 'integer', 'exists:zonas,id'],
            'mes' => ['required', 'integer', 'min:1', 'max:12'],
            'ano' => ['required', 'integer', 'min:2000', 'max:2100'],
            'volume_m3' => ['required', 'numeric', 'min:0', 'max:999999999'],
        ]);
        $periodo = sprintf('%04d-%02d', $data['ano'], $data['mes']);
        $actual = MesReferencia::actual();
        if ($periodo > $actual->format('Y-m') || $periodo < $actual->copy()->subYears(5)->format('Y-m')) {
            throw ValidationException::withMessages(['mes' => 'Escolha um período entre o ciclo actual e os últimos cinco anos.']);
        }
        return ['zona_id' => $data['zona_id'] ?? null, 'mes' => (int) $data['mes'], 'ano' => (int) $data['ano'], 'volume_m3' => (float) $data['volume_m3']];
    }
}
