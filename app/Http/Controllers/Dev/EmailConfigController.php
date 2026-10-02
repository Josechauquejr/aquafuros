<?php

namespace App\Http\Controllers\Dev;

use App\Http\Controllers\Controller;
use App\Models\Configuracao;
use App\Models\EmpresaPerfil;
use App\Support\Facturacao;
use App\Support\Notificacoes;
use App\Support\GmailOAuth;
use App\Support\RegistoEmail;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

/** Ligação do Gmail para o envio de facturas (só desenvolvedor). */
class EmailConfigController extends Controller
{
    public function index()
    {
        $ligacao = GmailOAuth::ligacao();

        return Inertia::render('Dev/EmailConfig', [
            'configurado' => GmailOAuth::configurado(),
            'ligado' => $ligacao !== null,
            'conta' => $ligacao['email'] ?? null,
            'ligadoEm' => $ligacao['ligado_em'] ?? null,
            'redirect' => GmailOAuth::urlRedirecionamento(),
            'transporte' => config('mail.default'),
            'remetente' => config('mail.from.address'),
            'automatico' => [
                'facturar_ao_confirmar' => Facturacao::facturarAoConfirmar(),
                'enviar_ao_emitir' => Facturacao::enviarAoEmitir(),
                'cobranca_automatica' => Notificacoes::automaticas(),
                'intervalo_cobranca_dias' => (int) Configuracao::valor('email_intervalo_cobranca_dias', config('notificacoes.intervalo_minimo_dias', 7)),
            ],
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
    public function automatico(Request $request)
    {
        $data = $request->validate([
            'facturar_ao_confirmar' => 'required|boolean',
            'enviar_ao_emitir' => 'required|boolean',
            'cobranca_automatica' => 'required|boolean',
            'intervalo_cobranca_dias' => 'sometimes|nullable|integer|min:0|max:365',
        ]);

        Configuracao::definir('email_facturar_ao_confirmar', $data['facturar_ao_confirmar'] ? 1 : 0);
        Configuracao::definir('email_enviar_ao_emitir', $data['enviar_ao_emitir'] ? 1 : 0);
        Configuracao::definir('email_cobranca_automatica', $data['cobranca_automatica'] ? 1 : 0);
        Configuracao::definir('email_intervalo_cobranca_dias', (int) ($data['intervalo_cobranca_dias'] ?? Configuracao::valor('email_intervalo_cobranca_dias', 7)));

        return back()->with('status', 'Envio automático actualizado.');
    }

    public function desligar()
    {
        GmailOAuth::desligar();

        return back()->with('status', 'Gmail desligado.');
    }

    /** Envia um email de teste ao próprio desenvolvedor (ou ao endereço indicado). */
    public function testar(Request $request)
    {
        $data = $request->validate(['para' => 'nullable|email']);
        $destino = $data['para'] ?? $request->user()->email;
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
