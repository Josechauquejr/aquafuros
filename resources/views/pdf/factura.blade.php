<!doctype html>
<html lang="pt">
<head>
    <meta charset="utf-8">
    <title>Factura {{ $factura->numero_factura }}</title>
    @php
        $meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
        $mzn = fn ($v) => 'MZN '.number_format((float) $v, 2, ',', ' ');
        $estados = [
            'paga' => ['PAGA', '#047857'],
            'pendente' => ['PENDENTE', '#b45309'],
            'parcial' => ['PARCIALMENTE PAGA', '#0e7490'],
            'anulada' => ['ANULADA', '#64748b'],
        ];
        [$estadoTexto, $estadoCor] = $estados[$factura->estado] ?? [strtoupper($factura->estado), '#334155'];
        $ligacao = $factura->tipo === 'ligacao';
        $cliente = $factura->cliente;
    @endphp
    <style>
        @page { margin: 28px 34px; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #0f172a; }
        table { width: 100%; border-collapse: collapse; }
        td, th { padding: 5px 0; vertical-align: top; }
        .muted { color: #64748b; }
        .small { font-size: 9px; }
        .titulo { font-size: 20px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; text-align: right; }
        .rotulo { font-size: 8px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; color: #64748b; }
        .linha { border-bottom: 1px solid #cbd5e1; }
        .caixa { border: 1px solid #a5f3fc; background: #ecfeff; text-align: center; padding: 10px; }
        .caixa-total { border: 1px solid #0e7490; background: #0e7490; color: #ffffff; text-align: center; padding: 10px; }
        .direita { text-align: right; }
        .selo { display: inline-block; border: 1px solid {{ $estadoCor }}; color: {{ $estadoCor }}; font-weight: bold; padding: 3px 9px; font-size: 10px; }
    </style>
</head>
<body>
    <table class="linha">
        <tr>
            <td style="width: 60%;">
                <table>
                    <tr>
                        @if ($logotipo)
                            <td style="width: 64px;"><img src="{{ $logotipo }}" style="max-width: 56px; max-height: 56px;"></td>
                        @endif
                        <td>
                            <div style="font-size: 16px; font-weight: bold;">{{ $empresa->nome }}</div>
                            @if ($empresa->nuit)<div class="muted">NUIT: {{ $empresa->nuit }}</div>@endif
                            @if ($empresa->localizacao)<div class="muted">{{ $empresa->localizacao }}</div>@endif
                        </td>
                    </tr>
                </table>
            </td>
            <td class="direita">
                <div class="titulo">Factura</div>
                @if ($ligacao)<div style="color:#b45309; font-weight:bold; font-size:9px;">TAXA DE LIGAÇÃO DE ÁGUA</div>@endif
                <div class="muted">{{ $factura->numero_factura }}</div>
                <div style="margin-top: 5px;"><span class="selo">{{ $estadoTexto }}</span></div>
            </td>
        </tr>
    </table>

    <table style="margin-top: 14px;">
        <tr>
            <td style="width: 55%;">
                <div class="rotulo">Dados do cliente</div>
                <div style="font-size: 13px; font-weight: bold; margin-top: 3px;">{{ $cliente?->nome ?? 'Cliente removido' }}</div>
                <div class="muted">Nº de cliente: {{ $cliente?->numero_cliente }}</div>
                <div class="muted">Telefone: {{ $cliente?->telefone ?: '—' }}</div>
                <div class="muted">Endereço: {{ $cliente?->endereco ?: '—' }}</div>
                <div class="muted">Bairro: {{ $cliente?->bairro ?: '—' }}</div>
                <div class="muted">Tarifa: {{ $tarifa?->nome ?? '—' }}</div>
            </td>
            <td class="direita">
                <div class="rotulo">Período de facturação</div>
                <div style="font-size: 13px; font-weight: bold; margin-top: 3px;">{{ $meses[$factura->mes - 1] }} de {{ $factura->ano }}</div>
                <div class="muted">Emitida em {{ $factura->created_at->format('d/m/Y H:i') }}</div>
                @if ($factura->data_vencimento)
                    <div style="font-weight: bold;">Vence a {{ $factura->data_vencimento->format('d/m/Y') }}</div>
                @endif
            </td>
        </tr>
    </table>

    @if ($ligacao)
        <div style="margin-top: 14px; border: 1px solid #fde68a; background: #fffbeb; padding: 9px; color: #78350f;">
            Taxa única cobrada no início de um novo contrato de fornecimento de água — não está associada a nenhuma leitura de consumo.
        </div>
    @else
        <div style="margin-top: 16px;" class="rotulo">Leitura do contador</div>
        <table style="margin-top: 4px;">
            <thead>
                <tr class="linha" style="text-align: left;">
                    <th class="rotulo">Leitura anterior</th>
                    <th class="rotulo">Leitura actual</th>
                    <th class="rotulo direita">Consumo actual</th>
                    <th class="rotulo direita">Consumo mês anterior</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>{{ $leitura ? number_format((float) $leitura->leitura_anterior, 2, ',', ' ') : '—' }}@if ($primeiraLeitura) <span class="muted small">(leitura inicial)</span>@endif</td>
                    <td>{{ $leitura ? number_format((float) $leitura->leitura_actual, 2, ',', ' ') : '—' }}</td>
                    <td class="direita" style="font-weight: bold; color: #155e75;">{{ $consumo !== null ? number_format($consumo, 2, ',', ' ').' m³' : '—' }}</td>
                    <td class="direita muted">{{ $consumoAnterior !== null ? number_format($consumoAnterior, 2, ',', ' ').' m³' : '— (sem período anterior)' }}</td>
                </tr>
            </tbody>
        </table>
    @endif

    <table style="margin-top: 16px;">
        <tr>
            <td style="width: 48%;">
                <div class="caixa">
                    <div class="rotulo" style="color:#155e75;">Consumo actual</div>
                    <div style="font-size: 20px; font-weight: bold; color:#164e63;">{{ $consumo !== null ? number_format($consumo, 2, ',', ' ').' m³' : '—' }}</div>
                </div>
            </td>
            <td style="width: 4%;"></td>
            <td style="width: 48%;">
                <div class="caixa-total">
                    <div class="rotulo" style="color:#cffafe;">Total a pagar</div>
                    <div style="font-size: 20px; font-weight: bold;">{{ $mzn($factura->total_pagar) }}</div>
                </div>
            </td>
        </tr>
    </table>

    <div class="rotulo" style="margin-top: 16px;">Valores</div>
    <table style="margin-top: 4px;">
        <tr class="linha"><td class="muted">Valor do consumo</td><td class="direita">{{ $mzn($factura->valor_consumo) }}</td></tr>
        @if ($tarifaMinima)
            <tr class="linha"><td colspan="2" class="muted small">Tarifa mínima aplicada — consumo até {{ number_format((float) $tarifa->consumo_minimo_m3, 0) }} m³ cobra sempre {{ $mzn($tarifa->taxa_minima) }}.</td></tr>
        @endif
        @if ($factura->divida_anterior_incluida)
            <tr class="linha"><td class="muted">Dívida anterior</td><td class="direita">{{ $mzn($factura->divida_anterior) }}</td></tr>
        @endif
        <tr class="linha"><td class="muted">Multa</td><td class="direita">{{ $mzn($factura->multa) }}</td></tr>
        <tr><td style="font-size: 13px; font-weight: bold; padding-top: 8px;">Total a pagar</td><td class="direita" style="font-size: 13px; font-weight: bold; padding-top: 8px;">{{ $mzn($factura->total_pagar) }}</td></tr>
        @if (! $factura->divida_anterior_incluida && (float) $factura->divida_anterior > 0)
            <tr><td class="muted small" colspan="2" style="padding-top: 8px;">
                Dívida de facturas anteriores em aberto: {{ $mzn($factura->divida_anterior) }} (já consta nessas facturas; não se soma a esta).
                Total em dívida: {{ $mzn((float) $factura->total_pagar + (float) $factura->divida_anterior) }}.
            </td></tr>
        @endif
        @if ($totalPago > 0)
            <tr class="linha"><td class="muted" style="padding-top: 8px;">Já pago</td><td class="direita" style="padding-top: 8px;">{{ $mzn($totalPago) }}</td></tr>
            <tr><td style="font-weight: bold;">Em falta</td><td class="direita" style="font-weight: bold;">{{ $mzn($emFalta) }}</td></tr>
        @endif
    </table>

    <div style="margin-top: 22px; border-top: 1px solid #cbd5e1; padding-top: 8px;" class="small muted">
        Para verificar a autenticidade desta factura: <a href="{{ $urlVerificacao }}">{{ $urlVerificacao }}</a><br>
        Documento gerado electronicamente pelo sistema Aquafuros — sem necessidade de assinatura.
    </div>
</body>
</html>
