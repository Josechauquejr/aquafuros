<!doctype html>
<html lang="pt">
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
        <tr>
            <td align="center">
                <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;">
                    <tr>
                        <td style="background:#0e7490;color:#ffffff;padding:18px 24px;border-radius:8px 8px 0 0;">
                            <div style="font-size:18px;font-weight:bold;">{{ $empresa->nome }}</div>
                            <div style="font-size:13px;opacity:.9;">{{ $verificacao ? 'Verificação do email' : 'Repor a senha' }}</div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:24px;">
                            <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">
                                {{ $verificacao ? 'Use este código para confirmar o seu email:' : 'Use este código para repor a sua senha:' }}
                            </p>
                            <div style="text-align:center;margin:0 0 16px;">
                                <span style="display:inline-block;font-size:32px;font-weight:bold;letter-spacing:8px;color:#0e7490;background:#ecfeff;border:1px solid #a5f3fc;border-radius:8px;padding:12px 20px;">{{ $codigo }}</span>
                            </div>
                            <p style="margin:0 0 8px;font-size:13px;color:#475569;line-height:1.5;">O código é válido durante {{ $validade }} minutos.</p>
                            <p style="margin:0;font-size:13px;color:#475569;line-height:1.5;">Se não foi você a pedi-lo, ignore esta mensagem — nada será alterado. Não partilhe este código com ninguém.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
