<?php

namespace App\Http\Requests;

use App\Models\User;
use App\Rules\TelefoneMocambicano;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProfileUpdateRequest extends FormRequest
{
    private function mudaDeEmail(): bool
    {
        return strtolower((string) $this->input('email')) !== strtolower((string) $this->user()->email);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'lowercase',
                // rfc,dns: rejeita domínios que não existem de verdade (ex.:
                // "@aquafuros.local") — sem isto, a recuperação de senha por
                // email nunca chega a lado nenhum.
                app()->environment('testing') ? 'email:rfc' : 'email:rfc,dns',
                'max:255',
                Rule::unique(User::class)->ignore($this->user()->id),
            ],
            'telefone' => ['nullable', 'string', 'max:20', new TelefoneMocambicano()],
            // Mudar o email muda a forma de recuperar a conta — só com a palavra-passe actual.
            'current_password' => $this->mudaDeEmail() ? ['required', 'current_password'] : ['nullable'],
        ];
    }
}
