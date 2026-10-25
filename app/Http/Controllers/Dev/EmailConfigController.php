<?php

namespace App\Http\Controllers\Dev;

use App\Http\Controllers\Controller;
use App\Models\Configuracao;
use App\Models\EmpresaPerfil;
use App\Support\Facturacao;
use App\Support\GmailOAuth;
use App\Support\RegistoEmail;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

/** Ligação do Gmail para emails de autenticação (só developer). */
class EmailConfigController extends Controller
{
    public function index()
    {
        $ligacao = GmailOAuth::ligacao();

        return Inertia::render('Dev/EmailConfig', [
            'emailAtivo' => (bool) config('services.email.enabled', false),
            'configurado' => GmailOAuth::configurado(),
            'ligado' => $ligacao !== null,
            'conta' => $ligacao['email'] ?? null,
            'ligadoEm' => $ligacao['ligado_em'] ?? null,
            'redirect' => GmailOAuth::urlRedirecionamento(),
            'transporte' => config('mail.default'),
            'remetente' => config('mail.from.address'),
            'automatico' => ['facturar_ao_confirmar' => Facturacao::facturarAoConfirmar()],
        ]);
    }

    public function ligar(Request $request)
    {
        if (! config('services.email.enabled', false)) {
            return back()->with('error', 'O serviço de email está em manutenção.');
        }

        if (! GmailOAuth::configurado()) {
            return back()->with('error', 'Faltam GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no ficheiro .env.');
        }

        $estado = Str::random(40);
        $request->session()->put('gmail_oauth_state', $estado);

        return redirect()->away(GmailOAuth::urlAutorizacao($estado));
    }

    public function callback(Request $request)
    {
        if (! config('services.email.enabled', false)) {
            return redirect()->route('dev.email')->with('error', 'O serviço de email está em manutenção.');
        }

        if ($request->filled('error')) {
            return redirect()->route('dev.email')->with('error', 'A autorização foi recusada na Google ('.$request->query('error').').');
        }

        if (! hash_equals((string) $request->session()->pull('gmail_oauth_state'), (string) $request->query('state'))) {
            return redirect()->route('dev.email')->with('error', 'O pedido de autorização expirou — tente ligar de novo.');
        }

        try {
            $email = GmailOAuth::ligar((string) $request->query('code'));
        } catch (\Throwable $e) {
            return redirect()->route('dev.email')->with('error', $e->getMessage());
        }

        return redirect()->route('dev.email')->with('status', "Gmail ligado: {$email}.");
    }

    /** Interruptores do envio automático (facturas e cobranças). */
    /** Ajusta apenas a emissão automática de facturas; não envia emails a clientes. */
    public function automatico(Request $request)
    {
        $data = $request->validate(['facturar_ao_confirmar' => 'required|boolean']);
        Configuracao::definir('email_facturar_ao_confirmar', $data['facturar_ao_confirmar'] ? 1 : 0);

        return back()->with('status', 'Emissão automática de facturas actualizada.');
    }
    public function desligar()
    {
        GmailOAuth::desligar();

        return back()->with('status', 'Gmail desligado.');
    }

    /** Envia um email de teste ao próprio desenvolvedor (ou ao endereço indicado). */
    public function testar(Request $request)
    {
        if (! config('services.email.enabled', false)) {
            return back()->with('error', 'O envio de emails está suspenso durante a manutenção.');
        }

        $destino = $request->user()->email;
        $empresa = EmpresaPerfil::atual()->nome;

        $mail = new class($empresa) extends \Illuminate\Mail\Mailable {
            public function __construct(private string $empresa) {}

            public function envelope(): \Illuminate\Mail\Mailables\Envelope
            {
                return new \Illuminate\Mail\Mailables\Envelope(subject: "Teste de email — {$this->empresa}");
            }

            public function content(): \Illuminate\Mail\Mailables\Content
            {
                return new \Illuminate\Mail\Mailables\Content(htmlString: "Este é um email de teste do sistema {$this->empresa}. Se o está a ler, o envio de emails está a funcionar.");
            }
        };

        $envio = RegistoEmail::enviar($mail, $destino, [
            'tipo' => 'teste',
            'origem' => 'manual',
            'enviado_por' => $request->user()->id,
        ]);

        if ($envio->estado !== 'enviado') {
            return back()->with('error', 'Falhou: '.mb_substr((string) $envio->erro, 0, 200));
        }

        return back()->with('status', "Email de teste enviado para {$destino}.");
    }
}
