<?php

namespace App\Mail;

use App\Models\EmpresaPerfil;
use App\Support\CodigoEmail;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/** Email com o código de 6 dígitos (verificar o email ou repor a palavra-passe). */
class CodigoMail extends Mailable
{
    public function __construct(public string $codigo, public string $finalidade, public int $validadeMinutos) {}

    public function envelope(): Envelope
    {
        $assunto = $this->finalidade === CodigoEmail::VERIFICACAO
            ? 'O seu código de verificação'
            : 'O seu código para repor a senha';

        return new Envelope(subject: $assunto.' — '.EmpresaPerfil::atual()->nome);
    }

    public function content(): Content
    {
        return new Content(view: 'emails.codigo', with: [
            'empresa' => EmpresaPerfil::atual(),
            'codigo' => $this->codigo,
            'verificacao' => $this->finalidade === CodigoEmail::VERIFICACAO,
            'validade' => $this->validadeMinutos,
        ]);
    }

    /** @return array<int, never> */
    public function attachments(): array
    {
        return [];
    }
}
