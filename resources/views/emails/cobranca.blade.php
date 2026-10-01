<!doctype html>
<html lang="pt">
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    @php $mzn = fn ($v) => 'MZN '.number_format((float) $v, 2, ',', ' '); @endphp
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
        <tr>
            <td align="center">
                <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;">
                    <tr>
                        <td style="background:{{ $grave ? '#be123c' : '#0e7490' }};color:#ffffff;padding:18px 24px;border-radius:8px 8px 0 0;">
                            <div style="font-size:18px;font-weight:bold;">{{ $empresa->nome }}</div>
                            <div style="font-size:13px;opacity:.9;">{{ $titulo }}</div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:24px;">
                            <p style="margin:0 0 12px;font-size:15px;">Olá <strong>{{ $cliente->nome }}</strong>,</p>
                            <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">{!! $introducao !!}</p>

                            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;font-size:13px;">
                                <tr style="background:#f8fafc;color:#64748b;text-align:left;">
                                    <th style="padding:8px 12px;">Factura</th>
                                    <th style="padding:8px 12px;">Período</th>
                                    <th style="padding:8px 12px;">Vencimento</th>
                                    <th style="padding:8px 12px;">Situação</th>
                                    <th style="padding:8px 12px;" align="right">Em falta</th>
                                </tr>
                                @foreach ($linhas as $f)
                                    <tr>
                                        <td style="padding:8px 12px;border-top:1px solid #e2e8f0;">{{ $f['numero'] }}</td>
                                        <td style="padding:8px 12px;border-top:1px solid #e2e8f0;">{{ $f['periodo'] }}</td>
                                        <td style="padding:8px 12px;border-top:1px solid #e2e8f0;">{{ $f['vencimento'] }}</td>
                                        <td style="padding:8px 12px;border-top:1px solid #e2e8f0;font-weight:bold;color:{{ $lembrete ? '#0e7490' : ($grave ? '#be123c' : '#b45309') }};">{{ $f['situacao'] }}</td>
                                        <td style="padding:8px 12px;border-top:1px solid #e2e8f0;" align="right">{{ $mzn($f['falta']) }}</td>
                                    </tr>
                                @endforeach
                                @if (count($linhas) > 1)
                                    <tr>
                                        <td colspan="4" style="padding:10px 12px;border-top:1px solid #e2e8f0;font-weight:bold;">Total em falta</td>
                                        <td align="right" style="padding:10px 12px;border-top:1px solid #e2e8f0;font-weight:bold;color:{{ $grave ? '#be123c' : '#0e7490' }};">{{ $mzn($total) }}</td>
                                    </tr>
                                @endif
                            </table>

                            <p style="margin:18px 0 6px;font-size:13px;color:#475569;line-height:1.5;">
                                {{ $fecho }} Pode pagar em dinheiro, por transferência bancária, M-Pesa ou e-Mola.
                                {{ $nAnexos > 1 ? 'Seguem em anexo as facturas em PDF.' : 'Segue em anexo a factura em PDF.' }} Se já pagou, ignore esta mensagem e aceite as nossas desculpas.
                            </p>
                            <p style="margin:0;font-size:13px;color:#475569;line-height:1.5;">Pagamentos móveis: M-Pesa 853 754 024 (J. Chauque) · e-Mola 876 781 920 (José Chauque). Envie o comprovativo com a referência da factura.</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:14px 24px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;">
                            {{ $empresa->nome }}@if ($empresa->localizacao) · {{ $empresa->localizacao }}@endif
                            @if ($empresa->nuit) · NUIT {{ $empresa->nuit }}@endif
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
