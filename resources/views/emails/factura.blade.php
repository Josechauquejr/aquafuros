<!doctype html>
<html lang="pt">
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    @php $mzn = fn ($v) => 'MZN '.number_format((float) $v, 2, ',', ' '); @endphp
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
        <tr>
            <td align="center">
                <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;">
                    <tr>
                        <td style="background:#0e7490;color:#ffffff;padding:18px 24px;border-radius:8px 8px 0 0;">
                            <div style="font-size:18px;font-weight:bold;">{{ $empresa->nome }}</div>
                            <div style="font-size:13px;opacity:.85;">A sua factura de água</div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:24px;">
                            <p style="margin:0 0 12px;font-size:15px;">Olá <strong>{{ $factura->cliente?->nome }}</strong>,</p>
                            <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">
                                Segue em anexo a sua factura <strong>{{ $factura->numero_factura }}</strong>
                                referente a <strong>{{ $periodo }}</strong>.
                            </p>

                            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:6px;font-size:14px;">
                                @if ($consumo !== null)
                                    <tr><td style="padding:10px 14px;color:#64748b;">Consumo</td><td align="right" style="padding:10px 14px;">{{ number_format($consumo, 2, ',', ' ') }} m³</td></tr>
                                @endif
                                <tr><td style="padding:10px 14px;color:#64748b;border-top:1px solid #e2e8f0;">Total a pagar</td><td align="right" style="padding:10px 14px;border-top:1px solid #e2e8f0;font-weight:bold;font-size:16px;color:#0e7490;">{{ $mzn($factura->total_pagar) }}</td></tr>
                                @if ($factura->data_vencimento)
                                    <tr><td style="padding:10px 14px;color:#64748b;border-top:1px solid #e2e8f0;">Pagar até</td><td align="right" style="padding:10px 14px;border-top:1px solid #e2e8f0;">{{ $factura->data_vencimento->format('d/m/Y') }}</td></tr>
                                @endif
                            </table>

                            <p style="margin:18px 0 6px;font-size:13px;color:#475569;line-height:1.5;">
                                Pode pagar em dinheiro, por transferência bancária, M-Pesa ou e-Mola. Guarde o comprovativo e apresente-o ao pagar.
                            </p>
                            <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;">
                                Para confirmar que esta factura é autêntica:
                                <a href="{{ $urlVerificacao }}" style="color:#0e7490;">verificar factura</a>.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:14px 24px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;">
                            {{ $empresa->nome }}@if ($empresa->localizacao) · {{ $empresa->localizacao }}@endif
                            @if ($empresa->nuit) · NUIT {{ $empresa->nuit }}@endif
                            <br>Este email foi enviado automaticamente. Se não é o titular deste contrato, ignore esta mensagem.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
