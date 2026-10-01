<!doctype html>
<html lang="pt">
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    @php $mzn = fn ($v) => 'MZN '.number_format((float) $v, 2, ',', ' '); @endphp
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
        <tr><td align="center">
            <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;">
                <tr><td style="background:#0e7490;color:#fff;padding:18px 24px;border-radius:8px 8px 0 0;">
                    <div style="font-size:18px;font-weight:bold;">{{ $empresa->nome }}</div>
                    <div style="font-size:13px;opacity:.9;">Recibo de pagamento</div>
                </td></tr>
                <tr><td style="padding:24px;">
                    <p style="margin:0 0 12px;font-size:15px;">Olá <strong>{{ $cliente?->nome }}</strong>,</p>
                    <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">Confirmamos o recebimento do pagamento abaixo.</p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;font-size:13px;">
                        <tr style="background:#f8fafc;color:#64748b;text-align:left;">
                            <th style="padding:8px 12px;">Recibo</th><th style="padding:8px 12px;">Factura</th><th style="padding:8px 12px;">Método</th><th style="padding:8px 12px;" align="right">Valor</th>
                        </tr>
                        @foreach ($pagamentos as $pagamento)
                            <tr>
                                <td style="padding:8px 12px;border-top:1px solid #e2e8f0;">{{ $pagamento->numero_recibo }}</td>
                                <td style="padding:8px 12px;border-top:1px solid #e2e8f0;">{{ $pagamento->factura?->numero_factura ?? '—' }}</td>
                                <td style="padding:8px 12px;border-top:1px solid #e2e8f0;">{{ strtoupper($pagamento->metodo_pagamento) }}</td>
                                <td style="padding:8px 12px;border-top:1px solid #e2e8f0;" align="right">{{ $mzn($pagamento->valor_pago) }}</td>
                            </tr>
                        @endforeach
                        <tr><td colspan="3" style="padding:10px 12px;border-top:1px solid #e2e8f0;font-weight:bold;">Total recebido</td><td style="padding:10px 12px;border-top:1px solid #e2e8f0;font-weight:bold;" align="right">{{ $mzn($total) }}</td></tr>
                    </table>
                    <p style="margin:18px 0 0;font-size:13px;color:#475569;line-height:1.5;">Guarde este email como comprovativo do pagamento.</p>
                </td></tr>
                <tr><td style="padding:14px 24px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;">{{ $empresa->nome }}@if ($empresa->localizacao) · {{ $empresa->localizacao }}@endif</td></tr>
            </table>
        </td></tr>
    </table>
</body>
</html>
