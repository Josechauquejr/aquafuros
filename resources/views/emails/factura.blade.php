<!doctype html>
<html lang="pt">
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    @php
        $mzn = fn ($valor) => 'MZN '.number_format((float) $valor, 2, ',', ' ');
        $cliente = $factura->cliente;
    @endphp
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:28px 12px;">
        <tr><td align="center">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #dbe4ee;border-radius:8px;overflow:hidden;">
                <tr><td style="background:#0e7490;color:#ffffff;padding:20px 28px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                        @if ($logoUrl)
                            <td style="width:52px;vertical-align:middle;"><img src="{{ $logoUrl }}" alt="{{ $empresa->nome }}" width="42" style="display:block;max-width:42px;max-height:42px;border:0;border-radius:6px;"></td>
                        @endif
                        <td style="vertical-align:middle;"><div style="font-size:18px;font-weight:bold;line-height:1.25;">{{ $empresa->nome }}</div><div style="margin-top:3px;font-size:12px;opacity:.9;">Factura de água</div></td>
                        <td align="right" style="vertical-align:middle;"><div style="font-size:11px;letter-spacing:.5px;text-transform:uppercase;opacity:.8;">Factura</div><div style="margin-top:3px;font-size:14px;font-weight:bold;">{{ $factura->numero_factura }}</div></td>
                    </tr></table>
                </td></tr>
                <tr><td style="padding:28px;">
                    <p style="margin:0 0 8px;font-size:16px;line-height:1.5;">Caro(a) Cliente, <strong>{{ $cliente?->nome ?? 'Cliente' }}</strong>,</p>
                    <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#334155;">Esperamos que se encontre bem. Enviamos a sua factura referente a <strong>{{ $periodo }}</strong>. O documento oficial segue em PDF anexo a este email.</p>

                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;border:1px solid #dbe4ee;border-radius:6px;background:#f8fafc;font-size:13px;"><tr>
                        <td style="padding:12px 14px;border-right:1px solid #dbe4ee;"><div style="font-size:10px;font-weight:bold;letter-spacing:.6px;text-transform:uppercase;color:#64748b;">Cliente</div><div style="margin-top:3px;font-weight:bold;color:#0f172a;">{{ $cliente?->numero_cliente ?? '—' }}</div></td>
                        <td style="padding:12px 14px;"><div style="font-size:10px;font-weight:bold;letter-spacing:.6px;text-transform:uppercase;color:#64748b;">Período de facturação</div><div style="margin-top:3px;font-weight:bold;color:#0f172a;">{{ $periodo }}</div></td>
                    </tr></table>

                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #dbe4ee;border-radius:6px;font-size:14px;">
                        @if ($consumo !== null)<tr><td style="padding:11px 14px;color:#64748b;">Consumo do período</td><td align="right" style="padding:11px 14px;font-weight:bold;">{{ number_format($consumo, 2, ',', ' ') }} m³</td></tr>@endif
                        @if ($factura->data_vencimento)<tr><td style="padding:11px 14px;border-top:1px solid #dbe4ee;color:#64748b;">Data limite de pagamento</td><td align="right" style="padding:11px 14px;border-top:1px solid #dbe4ee;font-weight:bold;">{{ $factura->data_vencimento->format('d/m/Y') }}</td></tr>@endif
                        <tr><td style="padding:14px;border-top:1px solid #dbe4ee;background:#ecfeff;font-weight:bold;color:#155e75;">Total a pagar</td><td align="right" style="padding:14px;border-top:1px solid #dbe4ee;background:#0e7490;font-size:18px;font-weight:bold;color:#ffffff;">{{ $mzn($factura->total_pagar) }}</td></tr>
                    </table>

                    <div style="margin-top:18px;padding:14px;border-left:3px solid #0e7490;background:#f8fafc;font-size:13px;line-height:1.6;color:#334155;">Pode pagar em dinheiro, transferência bancária, M-Pesa ou e-Mola. M-Pesa: <strong>853 754 024</strong> (J. Chauque) · e-Mola: <strong>876 781 920</strong> (José Chauque). Guarde o comprovativo e indique a referência da factura.</div>
                    <p style="margin:18px 0 0;font-size:12px;line-height:1.5;color:#64748b;">Para confirmar a autenticidade do documento, <a href="{{ $urlVerificacao }}" style="color:#0e7490;font-weight:bold;">verifique esta factura</a>.</p>
                </td></tr>
                <tr><td style="padding:16px 28px;border-top:1px solid #dbe4ee;background:#f8fafc;font-size:12px;line-height:1.55;color:#64748b;">Com os melhores cumprimentos,<br><strong style="color:#334155;">{{ $empresa->nome }}</strong>@if ($empresa->localizacao) · {{ $empresa->localizacao }}@endif @if ($empresa->nuit)<br>NUIT: {{ $empresa->nuit }}@endif<br><span style="color:#94a3b8;">Mensagem automática. Se não for o titular deste contrato, ignore este email.</span></td></tr>
            </table>
        </td></tr>
    </table>
</body>
</html>
