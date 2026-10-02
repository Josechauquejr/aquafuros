<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\CodigoEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Recuperar a senha por código de 6 dígitos: pede-se por email, confirma-se o
 * código e só então se define a nova senha (o último passo é o NewPasswordController).
 */
class PasswordResetLinkController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('Auth/ForgotPassword');
    }

    /** Envia o código. A resposta é sempre a mesma, exista ou não a conta (não revela quem está registado). */
    public function store(Request $request): RedirectResponse
    {
        $request->validate(['email' => ['required', 'email']]);

        $email = mb_strtolower(trim($request->string('email')->value()));

        if (User::where('email', $email)->where('is_active', true)->exists()) {
            CodigoEmail::enviar($email, CodigoEmail::RECUPERACAO);
        }

        return redirect()->route('password.code', ['email' => $email])
            ->with('status', 'Se o email estiver registado, enviámos-lhe um código de 6 dígitos.');
    }

    public function code(Request $request): Response
    {
        return Inertia::render('Auth/VerifyResetCode', ['email' => (string) $request->query('email')]);
    }

    /** Código certo → emite o token de reposição e segue para a nova senha. */
    public function verifyCode(Request $request): RedirectResponse
    {
        $data = $request->validate(['email' => ['required', 'email'], 'code' => ['required']]);
        $email = mb_strtolower(trim($data['email']));

        CodigoEmail::confirmar($email, CodigoEmail::RECUPERACAO, (string) $data['code']);

        $user = User::where('email', $email)->where('is_active', true)->firstOrFail();

        return redirect()->route('password.reset', ['token' => Password::createToken($user), 'email' => $email]);
    }
}
