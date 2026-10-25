<?php

namespace App\Mail;

use App\Models\EmpresaPerfil;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class DefinirSenhaMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $nome,
        public string $url,
        public bool $contaNova,
        public int $validadeMinutos,
    ) {}

    public function envelope(): Envelope
    {
        $assunto = $this->contaNova ? 'Defina a senha da sua conta' : 'Defina uma nova senha';

        return new Envelope(subject: $assunto.' — '.EmpresaPerfil::atual()->nome);
    }

    public function content(): Content
    {
        return new Content(view: 'emails.definir-senha', with: [
            'empresa' => EmpresaPerfil::atual(),
            'nome' => $this->nome,
            'url' => $this->url,
            'contaNova' => $this->contaNova,
            'validadeMinutos' => $this->validadeMinutos,
        ]);
    }
}
