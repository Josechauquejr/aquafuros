<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Support\CodigoEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class EmailVerificationNotificationController extends Controller
{
    /** Envia um código novo (o anterior deixa de valer). */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return redirect()->intended(route('dashboard', absolute: false));
        }

        return CodigoEmail::enviar($user->email, CodigoEmail::VERIFICACAO)
            ? back()->with('status', 'Enviámos um novo código para o seu email.')
            : back()->with('error', 'Não foi possível enviar o email. Tente novamente dentro de instantes.');
    }
}
