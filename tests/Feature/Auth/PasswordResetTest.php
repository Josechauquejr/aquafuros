<?php

namespace Tests\Feature\Auth;

use App\Mail\CodigoMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    /** Pede o código de recuperação e devolve-o (lido do email enviado). */
    private function codigoEnviado(User $user): string
    {
        Mail::fake();
        $this->post('/forgot-password', ['email' => $user->email]);

        $codigo = null;
        Mail::assertSent(CodigoMail::class, function (CodigoMail $m) use (&$codigo) {
            $codigo = $m->codigo;

            return true;
        });

        return $codigo;
    }

    public function test_reset_password_link_screen_can_be_rendered(): void
    {
        $this->get('/forgot-password')->assertStatus(200);
    }

    public function test_o_codigo_e_enviado_e_leva_ao_ecra_do_codigo(): void
    {
        Mail::fake();
        $user = User::factory()->create();

        $this->post('/forgot-password', ['email' => $user->email])
            ->assertRedirect(route('password.code', ['email' => $user->email]));

        Mail::assertSent(CodigoMail::class, fn (CodigoMail $m) => $m->hasTo($user->email));
        $this->get('/forgot-password/code?email='.$user->email)->assertStatus(200);
    }

    public function test_um_email_desconhecido_recebe_a_mesma_resposta_e_nenhum_email(): void
    {
        Mail::fake();

        $this->post('/forgot-password', ['email' => 'ninguem@exemplo.co.mz'])
            ->assertRedirect(route('password.code', ['email' => 'ninguem@exemplo.co.mz']))
            ->assertSessionHasNoErrors();

        Mail::assertNothingSent();
    }

    public function test_uma_conta_desactivada_nao_recebe_codigo(): void
    {
        Mail::fake();
        $user = User::factory()->create(['is_active' => false]);

        $this->post('/forgot-password', ['email' => $user->email]);

        Mail::assertNothingSent();
    }

    public function test_a_senha_repoe_se_com_o_codigo(): void
    {
        $user = User::factory()->create();
        $codigo = $this->codigoEnviado($user);

        $resposta = $this->post('/forgot-password/code', ['email' => $user->email, 'code' => $codigo]);
        $resposta->assertSessionHasNoErrors()->assertRedirectContains('/reset-password/');

        $token = basename(parse_url($resposta->headers->get('Location'), PHP_URL_PATH));

        $this->post('/reset-password', [
            'token' => $token, 'email' => $user->email, 'password' => 'nova-senha-123', 'password_confirmation' => 'nova-senha-123',
        ])->assertSessionHasNoErrors()->assertRedirect(route('login'));

        $this->assertTrue(Hash::check('nova-senha-123', $user->fresh()->password));
    }

    public function test_o_codigo_errado_nao_da_acesso_a_reposicao(): void
    {
        $user = User::factory()->create();
        $this->codigoEnviado($user);

        $this->post('/forgot-password/code', ['email' => $user->email, 'code' => '000000'])
            ->assertSessionHasErrors('code');
    }

    public function test_o_codigo_so_serve_uma_vez(): void
    {
        $user = User::factory()->create();
        $codigo = $this->codigoEnviado($user);

        $this->post('/forgot-password/code', ['email' => $user->email, 'code' => $codigo])->assertSessionHasNoErrors();
        $this->post('/forgot-password/code', ['email' => $user->email, 'code' => $codigo])->assertSessionHasErrors('code');
    }

    public function test_o_codigo_de_verificacao_nao_serve_para_recuperar_a_senha(): void
    {
        $user = User::factory()->unverified()->create();
        Mail::fake();
        $this->actingAs($user)->post('/email/verification-notification');

        $codigo = null;
        Mail::assertSent(CodigoMail::class, function (CodigoMail $m) use (&$codigo) {
            $codigo = $m->codigo;

            return true;
        });
        auth()->logout();

        $this->post('/forgot-password/code', ['email' => $user->email, 'code' => $codigo])->assertSessionHasErrors('code');
    }
}
