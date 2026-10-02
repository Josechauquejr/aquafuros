<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Support\CodigoEmail;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class VerifyEmailController extends Controller
{
    /** Confirma o código de 6 dígitos e marca o email como verificado. */
    public function __invoke(Request $request): RedirectResponse
    {
        $user = $request->user();

        if (! $user->hasVerifiedEmail()) {
            $request->validate(['code' => ['required']]);

            CodigoEmail::confirmar($user->email, CodigoEmail::VERIFICACAO, (string) $request->input('code'));

            if ($user->markEmailAsVerified()) {
                event(new Verified($user));
            }
        }

        return redirect()->intended(route('dashboard', absolute: false))->with('status', 'Email verificado com sucesso.');
    }
}
