<?php

namespace App\Http\Requests\Auth;

use App\Models\User;
use App\Support\Telefone;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }


    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'username' => ['required', 'string'],
            'password' => ['required', 'string'],
        ];
    }

    /**
     * Attempt to authenticate the request's credentials.
     *
     * @throws ValidationException
     */
    /** Tentativas permitidas e tempo de bloqueio (como no design: 5 erradas → 15 minutos). */
    private const TENTATIVAS = 5;

    private const BLOQUEIO_SEGUNDOS = 900;

    public function authenticate(): void
    {
        $this->ensureIsNotRateLimited();

        // Um só campo: nome de utilizador, email ou telefone.
        $entrada = trim((string) $this->input('username'));
        $telefone = Telefone::normalizar($entrada);
        $utilizador = User::where('username', $entrada)
            ->orWhereRaw('LOWER(email) = ?', [mb_strtolower($entrada)])
            ->when($telefone, fn ($q) => $q->orWhere('telefone', $telefone))
            ->first();

        if (! $utilizador || ! Auth::attempt(['username' => $utilizador->username, 'password' => $this->input('password')], $this->boolean('remember'))) {
            RateLimiter::hit($this->throttleKey(), self::BLOQUEIO_SEGUNDOS);
            $restam = max(0, self::TENTATIVAS - RateLimiter::attempts($this->throttleKey()));

            if ($restam === 0) {
                $this->ensureIsNotRateLimited();
            }

            throw ValidationException::withMessages([
                'username' => trans('auth.failed'),
                'tentativas' => $restam === 1
                    ? 'Falta 1 tentativa. Depois a conta fica bloqueada 15 minutos.'
                    : "Faltam {$restam} tentativas. Depois a conta fica bloqueada 15 minutos.",
            ]);
        }

        if (! Auth::user()->is_active) {
            Auth::logout();
            RateLimiter::hit($this->throttleKey(), self::BLOQUEIO_SEGUNDOS);

            throw ValidationException::withMessages([
                'username' => 'Esta conta está desactivada. Contacte um administrador.',
            ]);
        }

        RateLimiter::clear($this->throttleKey());
    }

    /**
     * Ensure the login request is not rate limited.
     *
     * @throws ValidationException
     */
    public function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), self::TENTATIVAS)) {
            return;
        }

        event(new Lockout($this));

        $seconds = RateLimiter::availableIn($this->throttleKey());

        throw ValidationException::withMessages([
            'username' => trans('auth.throttle', ['seconds' => $seconds, 'minutes' => ceil($seconds / 60)]),
            'bloqueado' => now()->addSeconds($seconds)->format('H:i'),
        ]);
    }

    /**
     * Get the rate limiting throttle key for the request.
     */
    public function throttleKey(): string
    {
        return Str::transliterate(Str::lower($this->string('username')).'|'.$this->ip());
    }
}
