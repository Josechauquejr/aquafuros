<?php

namespace Tests\Feature\Auth;

use App\Mail\CodigoMail;
use App\Models\EnvioEmail;
use App\Models\User;
use App\Support\CodigoEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class EmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    /** Pede um código novo e devolve-o (lido do email enviado). */
    private function codigoEnviado(User $user): string
    {
        Mail::fake();
        $this->actingAs($user)->post('/email/verification-notification')->assertSessionHas('status');

        $codigo = null;
        Mail::assertSent(CodigoMail::class, function (CodigoMail $m) use (&$codigo) {
            $codigo = $m->codigo;

            return true;
        });

        return $codigo;
    }

    public function test_email_verification_screen_can_be_rendered(): void
    {
        $user = User::factory()->unverified()->create();

        $this->actingAs($user)->get('/verify-email')->assertStatus(200);
    }

    public function test_o_registo_envia_o_codigo_de_verificacao(): void
    {
        Mail::fake();

        $this->post('/register', [
            'name' => 'Ana', 'username' => 'ana', 'email' => 'ana@exemplo.co.mz',
            'password' => 'password', 'password_confirmation' => 'password',
        ]);

        Mail::assertSent(CodigoMail::class, fn (CodigoMail $m) => $m->hasTo('ana@exemplo.co.mz') && strlen($m->codigo) === 6);
    }

    public function test_o_codigo_certo_verifica_o_email(): void
    {
        $user = User::factory()->unverified()->create();
        $codigo = $this->codigoEnviado($user);

        $this->actingAs($user)->post('/verify-email', ['code' => $codigo])->assertRedirect(route('dashboard', absolute: false));

        $this->assertTrue($user->fresh()->hasVerifiedEmail());
        $this->assertDatabaseMissing('codigos_email', ['email' => $user->email]);
    }

    public function test_o_codigo_errado_nao_verifica(): void
    {
        $user = User::factory()->unverified()->create();
        $this->codigoEnviado($user);

        $this->actingAs($user)->post('/verify-email', ['code' => '000000'])->assertSessionHasErrors('code');

        $this->assertFalse($user->fresh()->hasVerifiedEmail());
    }

    public function test_depois_de_5_tentativas_falhadas_nem_o_codigo_certo_serve(): void
    {
        $user = User::factory()->unverified()->create();
        $codigo = $this->codigoEnviado($user);

        DB::table('codigos_email')->where('email', $user->email)->update(['tentativas' => CodigoEmail::MAX_TENTATIVAS]);

        $this->actingAs($user)->post('/verify-email', ['code' => $codigo])->assertSessionHasErrors('code');
        $this->assertFalse($user->fresh()->hasVerifiedEmail());
    }

    public function test_um_codigo_expirado_nao_serve(): void
    {
        $user = User::factory()->unverified()->create();
        $codigo = $this->codigoEnviado($user);

        DB::table('codigos_email')->where('email', $user->email)->update(['expira_em' => now()->subMinute()]);

        $this->actingAs($user)->post('/verify-email', ['code' => $codigo])->assertSessionHasErrors('code');
        $this->assertFalse($user->fresh()->hasVerifiedEmail());
    }

    public function test_um_novo_codigo_invalida_o_anterior(): void
    {
        $user = User::factory()->unverified()->create();
        $primeiro = $this->codigoEnviado($user);
        $segundo = $this->codigoEnviado($user);

        $this->assertNotSame($primeiro, $segundo);
        $this->actingAs($user)->post('/verify-email', ['code' => $primeiro])->assertSessionHasErrors('code');
    }

    public function test_o_registo_do_envio_nao_guarda_o_codigo(): void
    {
        $user = User::factory()->unverified()->create();
        $codigo = $this->codigoEnviado($user);

        $envio = EnvioEmail::where('tipo', 'codigo_verificacao')->firstOrFail();

        $this->assertSame('enviado', $envio->estado);
        $this->assertNull($envio->corpo);
        $this->assertNull($envio->cliente_id);
        $this->assertDatabaseMissing('codigos_email', ['codigo_hash' => $codigo]); // só o hash, nunca o código
    }
}
