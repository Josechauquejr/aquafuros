<?php

namespace Tests\Feature;

use App\Mail\GmailTransport;
use App\Models\User;
use App\Support\GmailOAuth;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/** Ligação do Gmail por OAuth2 e envio pela API (tudo com a Google simulada). */
class GmailTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $dev;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->admin = User::factory()->create();
        $this->admin->assignRole('administrador');
        $this->dev = User::factory()->create();
        $this->dev->assignRole('desenvolvedor');
        config(['services.google.client_id' => 'id-teste', 'services.google.client_secret' => 'segredo-teste', 'services.google.redirect' => 'http://127.0.0.1:8000/dev/email/google/callback']);
        Storage::fake('local');
        Cache::flush();
    }

    public function test_so_o_desenvolvedor_acede_e_o_pedido_vai_para_a_google_com_o_scope_certo(): void
    {
        $gestor = User::factory()->create();
        $gestor->assignRole('gestor');
        $this->actingAs($gestor)->get('/dev/email')->assertForbidden();
        $this->actingAs($this->admin)->get('/dev/email')->assertForbidden();

        $resposta = $this->actingAs($this->dev)->get('/dev/email/google');
        $resposta->assertRedirectContains('https://accounts.google.com/o/oauth2/v2/auth');

        $url = $resposta->headers->get('Location');
        parse_str(parse_url($url, PHP_URL_QUERY), $q);
        $this->assertSame('id-teste', $q['client_id']);
        $this->assertSame('offline', $q['access_type']);
        $this->assertStringContainsString('gmail.send', $q['scope']);
        $this->assertSame('http://127.0.0.1:8000/dev/email/google/callback', $q['redirect_uri']);
        $this->assertSame(session('gmail_oauth_state'), $q['state']);
    }

    public function test_o_callback_guarda_o_refresh_token_cifrado(): void
    {
        Http::fake([
            'oauth2.googleapis.com/token' => Http::response(['access_token' => 'ac1', 'refresh_token' => 'rf1']),
            'www.googleapis.com/oauth2/v2/userinfo' => Http::response(['email' => 'aquafuros.su.lda@gmail.com']),
        ]);

        $this->actingAs($this->dev)->withSession(['gmail_oauth_state' => 'abc'])
            ->get('/dev/email/google/callback?code=codigo&state=abc')
            ->assertRedirect('/dev/email')->assertSessionHas('status');

        $ligacao = GmailOAuth::ligacao();
        $this->assertSame('rf1', $ligacao['refresh_token']);
        $this->assertSame('aquafuros.su.lda@gmail.com', $ligacao['email']);
        // não fica em claro no disco
        $this->assertStringNotContainsString('rf1', Storage::disk('local')->get('gmail_oauth.json'));

        $this->get('/dev/email')->assertInertia(fn ($p) => $p->where('ligado', true)->where('conta', 'aquafuros.su.lda@gmail.com')->where('configurado', true));
    }

    public function test_callback_com_estado_errado_ou_recusado_nao_liga(): void
    {
        Http::fake();

        $this->actingAs($this->dev)->withSession(['gmail_oauth_state' => 'abc'])
            ->get('/dev/email/google/callback?code=x&state=outro')->assertSessionHas('error');
        $this->get('/dev/email/google/callback?error=access_denied')->assertSessionHas('error');

        Http::assertNothingSent();
        $this->assertNull(GmailOAuth::ligacao());
    }

    public function test_sem_refresh_token_a_ligacao_falha_com_mensagem(): void
    {
        Http::fake(['oauth2.googleapis.com/token' => Http::response(['access_token' => 'ac1'])]);

        $this->actingAs($this->dev)->withSession(['gmail_oauth_state' => 'abc'])
            ->get('/dev/email/google/callback?code=x&state=abc')->assertSessionHas('error');
        $this->assertNull(GmailOAuth::ligacao());
    }

    public function test_o_transporte_envia_pela_api_do_gmail_e_renova_o_token(): void
    {
        Http::fake([
            'oauth2.googleapis.com/token' => Http::response(['access_token' => 'token-novo']),
            'gmail.googleapis.com/*' => Http::response(['id' => 'msg1']),
        ]);
        Storage::disk('local')->put('gmail_oauth.json', \Illuminate\Support\Facades\Crypt::encryptString(json_encode(['refresh_token' => 'rf1', 'email' => 'a@b.c', 'ligado_em' => now()->toIso8601String()])));
        config(['mail.mailers.gmail' => ['transport' => 'gmail'], 'mail.default' => 'gmail']);
        Mail::purge('gmail');

        Mail::raw('Olá', fn ($m) => $m->to('cliente@exemplo.co.mz')->from('a@b.c')->subject('Teste'));

        Http::assertSent(fn ($r) => str_contains($r->url(), 'oauth2.googleapis.com/token') && $r['grant_type'] === 'refresh_token' && $r['refresh_token'] === 'rf1');
        Http::assertSent(function ($r) {
            if (! str_contains($r->url(), 'gmail.googleapis.com/gmail/v1/users/me/messages/send')) {
                return false;
            }
            $mime = base64_decode(strtr($r['raw'], '-_', '+/'));

            return $r->hasHeader('Authorization', 'Bearer token-novo')
                && str_contains($mime, 'To: cliente@exemplo.co.mz') && str_contains($mime, 'Subject: Teste');
        });
    }

    public function test_erro_da_google_vira_excepcao_legivel(): void
    {
        Http::fake([
            'oauth2.googleapis.com/token' => Http::response(['access_token' => 'x']),
            'gmail.googleapis.com/*' => Http::response(['error' => ['message' => 'Daily user sending limit exceeded']], 403),
        ]);
        Storage::disk('local')->put('gmail_oauth.json', \Illuminate\Support\Facades\Crypt::encryptString(json_encode(['refresh_token' => 'rf1', 'email' => 'a@b.c'])));
        config(['mail.mailers.gmail' => ['transport' => 'gmail'], 'mail.default' => 'gmail']);
        Mail::purge('gmail');

        $this->expectExceptionMessage('Daily user sending limit exceeded');
        Mail::raw('Olá', fn ($m) => $m->to('c@exemplo.co.mz')->from('a@b.c')->subject('T'));
    }

    public function test_desligar_apaga_a_ligacao(): void
    {
        Storage::disk('local')->put('gmail_oauth.json', \Illuminate\Support\Facades\Crypt::encryptString(json_encode(['refresh_token' => 'rf1', 'email' => 'a@b.c'])));

        $this->actingAs($this->dev)->withSession(['auth.password_confirmed_at' => time()])->delete('/dev/email/google')->assertSessionHas('status');

        $this->assertNull(GmailOAuth::ligacao());
    }

    public function test_a_transport_regista_se_como_gmail(): void
    {
        $this->assertSame('gmail', (string) new GmailTransport());
    }
}
