<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Display the user's profile form.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('Profile/Edit', [
            'user' => $request->user(),
            'mustVerifyEmail' => $request->user() instanceof \Illuminate\Contracts\Auth\MustVerifyEmail,
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->safe()->except('current_password'));

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return Redirect::route('profile.edit')->with('status', 'profile-updated');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validateWithBag('userDeletion', [
            'password' => ['required', 'current_password'],
            // Confirmação reforçada: escrever a palavra, não só a palavra-passe.
            'confirmacao' => ['required', 'in:ELIMINAR'],
        ], [
            'confirmacao.in' => 'Escreva ELIMINAR (em maiúsculas) para confirmar.',
            'confirmacao.required' => 'Escreva ELIMINAR (em maiúsculas) para confirmar.',
        ]);

        $user = $request->user();

        // Sem administrador ninguém consegue gerir o sistema.
        if ($user->hasRole('administrador') && User::role('administrador')->count() <= 1) {
            return back()->withErrors(
                ['password' => 'Esta é a única conta de administrador — crie outra antes de eliminar esta.'],
                'userDeletion',
            );
        }

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}
