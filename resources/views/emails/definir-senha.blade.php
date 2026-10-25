<!doctype html>
<html lang="pt">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a">
    <div style="max-width:560px;margin:32px auto;padding:28px;background:#fff;border:1px solid #e2e8f0;border-radius:12px">
        <p style="margin:0 0 8px;color:#0891b2;font-size:12px;font-weight:bold;text-transform:uppercase">{{ $empresa->nome }}</p>
        <h1 style="font-size:22px;margin:0 0 18px">{{ $contaNova ? 'A sua conta está pronta' : 'Reposição de senha' }}</h1>
        <p style="line-height:1.6">Olá {{ $nome }},</p>
        <p style="line-height:1.6">{{ $contaNova ? 'Foi criada uma conta para si no AquaFuros.' : 'Foi solicitada uma reposição da senha da sua conta.' }} Use o botão abaixo para escolher uma senha. Por segurança, não enviamos senhas por email.</p>
        <p style="margin:26px 0"><a href="{{ $url }}" style="display:inline-block;padding:13px 18px;background:#06b6d4;color:#083344;text-decoration:none;font-weight:bold;border-radius:8px">Definir senha</a></p>
        <p style="font-size:13px;line-height:1.6;color:#64748b">O link expira em {{ $validadeMinutos }} minutos e só pode ser usado uma vez. Se não solicitou esta alteração, ignore esta mensagem.</p>
        <p style="font-size:12px;color:#94a3b8;word-break:break-all">Se o botão não funcionar, abra: {{ $url }}</p>
    </div>
</body>
</html>
