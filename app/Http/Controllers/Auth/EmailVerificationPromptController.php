<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EmailVerificationPromptController extends Controller
{
    /**
     * Display the email verification prompt.
     */
    public function __invoke(Request $request): RedirectResponse|Response
    {
        if (! config('services.email.enabled', false) && ! $request->user()->hasVerifiedEmail()) {
            $request->user()->forceFill(['email_verified_at' => now()])->save();

            return redirect()->intended(route('dashboard', absolute: false))
                ->with('status', 'A verificação por email está suspensa durante a manutenção. A sua conta foi activada.');
        }

        return $request->user()->hasVerifiedEmail()
                    ? redirect()->intended(route('dashboard', absolute: false))
                    : Inertia::render('Auth/VerifyEmail');
    }
}
