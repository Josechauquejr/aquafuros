<!doctype html>
<html lang="pt">
<head>
    <meta charset="utf-8">
    <title>Factura {{ $factura->numero_factura }}</title>
    @php
        $meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
        $numero = fn ($v) => number_format((float) $v, 2, ',', '.');
        $mt = fn ($v) => $numero($v).' MT';
        $volume = fn ($v) => $v === null ? '—' : $numero($v).' m³';
        $estados = [
            'paga' => ['Paga', '#047857', '#ecfdf5'],
            'pendente' => ['Pendente', '#92400e', '#fffbeb'],
            'parcial' => ['Parcialmente paga', '#155e75', '#ecfeff'],
            'anulada' => ['Anulada', '#64748b', '#f8fafc'],
            'transferida' => ['Transferida', '#64748b', '#f8fafc'],
        ];
        [$estadoTexto, $estadoCor, $estadoFundo] = $estados[$factura->estado] ?? [$factura->estado, '#64748b', '#f8fafc'];
        if ($factura->esta_vencida) {
            $estadoTexto = $factura->estado === 'parcial' ? 'Vencida · parcialmente paga' : 'Vencida';
            $estadoCor = '#be123c'; $estadoFundo = '#fff1f2';
        }
        $ligacao = $factura->tipo === 'ligacao';
        $estimada = $factura->tipo === 'consumo_estimado';
        $cliente = $factura->cliente;
        $cobranca = $factura->cobranca;
        $anterior = $cobranca['principal_anterior_emitido'] ?? ($factura->divida_anterior_incluida ? (float) $factura->divida_anterior : 0);
        $multaAnteriorEmitida = $cobranca['multas_anteriores_emitidas'] ?? (float) $factura->multa_anterior;
        $multaEmitida = $cobranca['multa_emitida'] ?? (float) $factura->multa;
        $consumoEmitido = $cobranca['consumo_emitido'] ?? (float) $factura->valor_consumo;
        $totalEmitido = $cobranca['total_emitido'] ?? (float) $factura->total_pagar;
        $ajustamentos = $cobranca['ajustamentos_posteriores'] ?? 0;
        $multasPrevistas = $cobranca['multas_previstas'] ?? ($factura->multa_prevista ?? 0);
        $meios = array_filter([
            ['M-Pesa', $empresa->mpesa_numero, $empresa->mpesa_titular],
            ['E-Mola', $empresa->emola_numero, $empresa->emola_titular],
        ], fn ($meio) => filled($meio[1]));
        $telefone = function ($v) {
            $digitos = preg_replace('/\D/', '', $v ?? '');
            if (str_starts_with($digitos, '258') && strlen($digitos) > 9) $digitos = substr($digitos, 3);
            return strlen($digitos) === 9 ? implode(' ', str_split($digitos, 3)) : $v;
        };
    @endphp
    <style>
        @page { size: A4 portrait; margin: 34pt; }
        body { margin: 0; font-family: DejaVu Sans, sans-serif; font-size: 11px; line-height: 1.3; color: #0f172a; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 0; vertical-align: top; }
        .section { margin-top: 10px; page-break-inside: avoid; }
        .muted { color: #475569; }
        .small { font-size: 10px; }
        .heading { font-size: 10px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; color: #155e75; margin-bottom: 3px; }
        .right { text-align: right; }
        .number { white-space: nowrap; }
        .card { border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 5px; padding: 8px; }
        .card-value { font-size: 20px; font-weight: bold; margin-top: 3px; white-space: nowrap; }
        .values td { padding: 4px 0; border-bottom: 1px solid #e2e8f0; }
        .total { border-radius: 6px; background: #155e75; color: #fff; padding: 10px 14px; }
        .badge { border: 1px solid {{ $estadoCor }}; border-radius: 4px; color: {{ $estadoCor }}; background: {{ $estadoFundo }}; padding: 3px 8px; display: inline-block; font-size: 10px; font-weight: bold; }
    </style>
</head>
<body>
    <table style="border-bottom: 1px solid #e2e8f0; padding-bottom: 14px;">
        <tr>
            <td style="width: 61%;">
                <table><tr>
                    @if ($logotipo)<td style="width: 53px;"><img src="{{ $logotipo }}" style="max-width: 43px; max-height: 46px;"></td>@endif
                    <td>
                        <div style="font-size: 13px; font-weight: bold;">{{ $empresa->nome }}</div>
                        @if ($empresa->nuit)<div class="muted small">NUIT: {{ $empresa->nuit }}</div>@endif
                        @if ($empresa->localizacao)<div class="muted small">{{ $empresa->localizacao }}</div>@endif
                    </td>
                </tr></table>
            </td>
            <td class="right">
                <div class="heading muted">Factura</div>
                <div style="font-size: 14px; font-weight: bold; color: #164e63;">{{ $factura->numero_factura }}</div>
                <div style="margin-top: 4px;"><span class="badge">{{ $estadoTexto }}</span></div>
            </td>
        </tr>
    </table>
    <table class="section"><tr>
        <td style="width: 57%; padding-right: 18px;">
            <div class="heading">Dados do cliente</div>
            <div style="font-size: 18px; font-weight: bold;">{{ $cliente?->nome ?? 'Cliente removido' }}</div>
            <div class="muted">N.º de cliente: {{ $cliente?->numero_cliente ?? '—' }}</div>
            <div class="muted">Contacto: {{ $cliente?->telefone ?: '—' }}</div>
            <div class="muted">Endereço: {{ collect([$cliente?->endereco, $cliente?->bairro])->filter()->join(' · ') ?: '—' }}</div>
            <div class="muted">Categoria tarifária: {{ $tarifa?->nome ?? '—' }}</div>
            @if ($cliente?->data_adesao)<div class="muted">Data de adesão: {{ \Illuminate\Support\Carbon::parse($cliente->data_adesao)->format('d/m/Y') }}</div>@endif
        </td>
        <td class="right">
            <div class="heading">Dados da factura</div>
            <div style="font-size: 12px; font-weight: bold;">{{ $meses[$factura->mes - 1] }} de {{ $factura->ano }}</div>
            <div class="muted">Emissão: {{ $factura->created_at->format('d/m/Y') }}</div>
            <div style="font-weight: bold;">Vencimento: {{ $factura->data_vencimento?->format('d/m/Y') ?? '—' }}</div>
            <div class="muted">Factura: {{ $factura->numero_factura }}</div>
            @if ($leitura?->numero_leitura)<div class="muted">Leitura: {{ $leitura->numero_leitura }}</div>@endif
            @if ($cliente?->numero_contador)<div class="muted">Contador: {{ $cliente->numero_contador }}</div>@endif
        </td>
    </tr></table>
    @if ($ligacao)
        <div class="section card muted">Taxa de ligação de água. Encargo único associado ao início do contrato de fornecimento.</div>
    @else
        <div class="section">
            <div class="heading">Registo de consumo de água</div>
            @if ($estimada)
                <div class="card" style="background: #fffbeb; border-color: #fde68a; color: #78350f;"><strong>Consumo estimado:</strong> {{ $volume($consumo) }}. Não foi registada uma leitura do visor neste período.</div>
            @else
                <table><tr>
                    <td style="width: 32%;"><div class="card"><div class="muted small">Leitura anterior</div><div class="card-value">{{ $volume($leitura?->leitura_anterior) }}</div></div></td>
                    <td style="width: 2%;"></td>
                    <td style="width: 32%;"><div class="card"><div class="muted small">Leitura actual</div><div class="card-value">{{ $volume($leitura?->leitura_actual) }}</div></div></td>
                    <td style="width: 2%;"></td>
                    <td style="width: 32%;"><div class="card" style="background: #ecfeff; border-color: #a5f3fc; color: #164e63;"><div class="muted small">Consumo apurado</div><div class="card-value">{{ $volume($consumo) }}</div></div></td>
                </tr></table>
            @endif
            @if (! $estimada && $primeiraLeitura)<div class="muted small" style="margin-top: 5px;">Leitura anterior correspondente à leitura inicial do contrato.</div>
            @elseif (! $estimada && $consumoAnterior !== null)<div class="muted small" style="margin-top: 5px;">Consumo do período anterior: {{ $volume($consumoAnterior) }}.</div>@endif
        </div>
    @endif
    <div class="section">
        <div class="heading">Discriminação da factura</div>
        <table class="values">
            <tr><td class="muted">{{ $ligacao ? 'Taxa de ligação de água' : 'Valor do consumo do período' }}</td><td class="right number">{{ $mt($consumoEmitido) }}</td></tr>
            @if ((float) $factura->valor_acerto_leitura > 0)<tr><td class="muted">Acerto de leituras estimadas</td><td class="right number">{{ $mt($factura->valor_acerto_leitura) }}</td></tr>@endif
            @if ($tarifaMinima && ! $ligacao)<tr><td colspan="2" class="small muted">Tarifa mínima de {{ $mt($tarifa->taxa_minima) }}, aplicável ao consumo até {{ $volume($tarifa->consumo_minimo_m3) }}.</td></tr>@endif
            @if ($anterior > 0)<tr><td class="muted">Saldo anterior em dívida (sem penalizações)</td><td class="right number">{{ $mt($anterior) }}</td></tr>@endif
            @if ($multaAnteriorEmitida > 0)<tr><td class="muted">Penalizações anteriores</td><td class="right number">{{ $mt($multaAnteriorEmitida) }}</td></tr>@endif
            <tr><td class="muted">Penalização na emissão</td><td class="right number">{{ $mt($multaEmitida) }}</td></tr>
            <tr style="font-weight: bold;"><td>Total na emissão</td><td class="right number">{{ $mt($totalEmitido) }}</td></tr>
            @if (($cobranca['multas_anteriores_posteriores'] ?? 0) != 0)<tr><td class="muted">Penalizações anteriores apuradas após emissão</td><td class="right number">{{ $mt($cobranca['multas_anteriores_posteriores']) }}</td></tr>@endif
            @if (($cobranca['multa_periodo_posterior'] ?? 0) != 0)<tr><td class="muted">Penalização do período apurada após emissão</td><td class="right number">{{ $mt($cobranca['multa_periodo_posterior']) }}</td></tr>@endif
            @if (($cobranca['outros_ajustamentos_posteriores'] ?? $ajustamentos) != 0)<tr><td class="muted">Outros encargos ou ajustamentos posteriores</td><td class="right number">{{ $mt($cobranca['outros_ajustamentos_posteriores'] ?? $ajustamentos) }}</td></tr>@endif
            @if ($totalPago > 0)<tr><td class="muted">Pagamentos registados após a emissão</td><td class="right number">{{ $mt(-$totalPago) }}</td></tr>@endif
        </table>
        @if (! $cobranca && ! $factura->divida_anterior_incluida && (float) $factura->divida_anterior > 0)<div class="small muted" style="margin-top: 5px;">Saldo anterior de {{ $mt($factura->divida_anterior) }} apresentado a título informativo. Cobrado nas facturas correspondentes; não incluído nesta factura.</div>@endif
        @if (! empty($cobranca['origens']))<div class="small muted" style="margin-top: 6px;">
            <strong>Facturas anteriores ainda em aberto</strong>
            @foreach ($cobranca['origens'] as $origem)<div>{{ $origem['numero_factura'] }} · {{ isset($origem['mes'], $origem['ano']) && $origem['mes'] >= 1 && $origem['mes'] <= 12 ? $meses[$origem['mes'] - 1].' de '.$origem['ano'] : 'Período não disponível' }}: {{ $mt($origem['principal']) }} de principal + {{ $mt($origem['multa']) }} de multa.</div>@endforeach
        </div>@endif
        @if ($factura->estado === 'transferida')<div class="small muted" style="margin-top: 5px;">Saldo transferido para uma factura posterior. Este documento não deve ser pago separadamente.</div>@endif
    </div>
    <div class="section total"><table><tr>
        <td style="vertical-align: middle;">
            <div class="heading" style="color: #cffafe;">Saldo actual a pagar</div>
            @if ($factura->data_vencimento)<div class="small">Prazo de pagamento: {{ $factura->data_vencimento->format('d') }} de {{ mb_strtolower($meses[$factura->data_vencimento->month - 1]) }} de {{ $factura->data_vencimento->year }}.</div>@endif
        </td>
        <td class="right number" style="font-size: 26px; font-weight: bold; vertical-align: middle;">{{ $numero($emFalta) }} <span style="font-size: 13px;">MT</span></td>
    </tr></table></div>
    <div class="section">
        <div class="heading">Meios de pagamento</div>
        <table><tr>
            @forelse ($meios as [$nome, $conta, $titular])
                <td style="width: 49%;"><div class="card"><div class="muted small">{{ $nome }}</div><div style="font-size: 15px; font-weight: bold;">{{ $telefone($conta) }}</div>@if ($titular)<div class="small muted">{{ $titular }}</div>@endif</div></td>
                @if (! $loop->last)<td style="width: 2%;"></td>@endif
            @empty
                <td class="muted">Contacte a empresa para obter os meios de pagamento.</td>
            @endforelse
        </tr></table>
    </div>
    <div class="section small" style="border: 1px solid #fef3c7; background: #fffbeb; border-radius: 5px; padding: 10px 12px; color: #78350f;">
        A factura deve ser paga até ao dia 10. Após essa data, poderão ser aplicadas multas e o fornecimento de água poderá ser cortado.
        @if ($multasPrevistas > 0)<div>Penalizações por atraso previstas: {{ $mt($multasPrevistas) }}. Valores sujeitos a confirmação no pagamento, ainda não incluídos no saldo actual.</div>@endif
        <div>Ao efectuar o pagamento, indique o número da factura e guarde o comprovativo.</div>
    </div>
    <table class="section" style="border-top: 1px solid #e2e8f0;"><tr>
        <td class="small muted" style="padding-top: 12px; vertical-align: middle;">
            <strong>{{ $empresa->nome }}</strong><br>
            Documento emitido electronicamente. Dispensa assinatura.<br>
            Software desenvolvido por RJM CONSULTORIA LDA.
        </td>
        <td class="right" style="padding-top: 10px; width: 100px;">
            @if ($qrImagem)<a href="{{ $urlVerificacao }}"><img src="{{ $qrImagem }}" style="width: 64px; height: 64px;"></a><br>@endif
            <a href="{{ $urlVerificacao }}" class="small muted">Verificar autenticidade</a>
        </td>
    </tr></table>
</body>
</html>
