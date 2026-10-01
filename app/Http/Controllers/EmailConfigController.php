<?php

namespace App\Http\Controllers;

use App\Models\EmpresaPerfil;
use App\Support\GmailOAuth;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Inertia\Inertia;

/** Ligação do Gmail para o envio de facturas (só administrador). */
class EmailConfigController extends Controller
{
    public function index()
    {
        $ligacao = GmailOAuth::ligacao();

        return Inertia::render('Email/Index', [
            'configurado' => GmailOAuth::configurado(),
            'ligado' => $ligacao !== null,
            'conta' => $ligacao['email'] ?? null,
            'ligadoEm' => $ligacao['ligado_em'] ?? null,
            'redirect' => GmailOAuth::urlRedirecionamento(),
            'transporte' => config('mail.default'),
            'remetente' => config('mail.from.address'),
        ]);
    }

    public function ligar(Request $request)
    {
        if (! GmailOAuth::configurado()) {
            return back()->with('error', 'Faltam GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no ficheiro .env.');
        }

        $estado = Str::random(40);
        $request->session()->put('gmail_oauth_state', $estado);

        return redirect()->away(GmailOAuth::urlAutorizacao($estado));
    }

    public function callback(Request $request)
    {
        if ($request->filled('error')) {
            return redirect()->route('email.index')->with('error', 'A autorização foi recusada na Google ('.$request->query('error').').');
        }

        if (! hash_equals((string) $request->session()->pull('gmail_oauth_state'), (string) $request->query('state'))) {
            return redirect()->route('email.index')->with('error', 'O pedido de autorização expirou — tente ligar de novo.');
        }

        try {
            $email = GmailOAuth::ligar((string) $request->query('code'));
        } catch (\Throwable $e) {
            return redirect()->route('email.index')->with('error', $e->getMessage());
        }

        return redirect()->route('email.index')->with('status', "Gmail ligado: {$email}.");
    }

    public function desligar()
    {
        GmailOAuth::desligar();

        return back()->with('status', 'Gmail desligado.');
    }

    /** Envia um email de teste ao próprio administrador (ou ao endereço indicado). */
    public function testar(Request $request)
    {
        $data = $request->validate(['para' => 'nullable|email']);
        $destino = $data['para'] ?? $request->user()->email;
        $empresa = EmpresaPerfil::atual()->nome;

        try {
            Mail::raw("Este é um email de teste do sistema {$empresa}. Se o está a ler, o envio de facturas por email está a funcionar.", function ($m) use ($destino, $empresa) {
                $m->to($destino)->subject("Teste de email — {$empresa}");
            });
        } catch (\Throwable $e) {
            return back()->with('error', 'Falhou: '.mb_substr($e->getMessage(), 0, 200));
        }

        return back()->with('status', "Email de teste enviado para {$destino}.");
    }
}
