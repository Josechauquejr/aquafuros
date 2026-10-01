<?php

namespace App\Mail;

use App\Models\EmpresaPerfil;
use App\Models\Pagamento;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Support\Collection;

class ReciboMail extends Mailable
{
    /** @param Collection<int, Pagamento> $pagamentos */
    public function __construct(public Collection $pagamentos) {}

    public function envelope(): Envelope
    {
        $empresa = EmpresaPerfil::atual()->nome;
        $primeiro = $this->pagamentos->first();
        $referencia = $this->pagamentos->count() === 1 ? ' '.$primeiro?->numero_recibo : '';

        return new Envelope(subject: "Recibo de pagamento{$referencia} — {$empresa}");
    }

    public function content(): Content
    {
        return new Content(view: 'emails.recibo', with: [
            'empresa' => EmpresaPerfil::atual(),
            'cliente' => $this->pagamentos->first()?->cliente,
            'pagamentos' => $this->pagamentos,
            'total' => $this->pagamentos->sum('valor_pago'),
        ]);
    }
}
