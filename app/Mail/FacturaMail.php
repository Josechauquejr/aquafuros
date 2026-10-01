<?php

namespace App\Mail;

use App\Models\EmpresaPerfil;
use App\Models\Factura;
use App\Support\FacturaPdf;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Support\Facades\URL;

/** Email com a factura em PDF anexada. */
class FacturaMail extends Mailable
{
    private const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    public function __construct(public Factura $factura) {}

    public function envelope(): Envelope
    {
        $empresa = EmpresaPerfil::atual()->nome;

        return new Envelope(subject: "Factura {$this->factura->numero_factura} — {$empresa}");
    }

    public function content(): Content
    {
        $leitura = $this->factura->leitura;

        return new Content(view: 'emails.factura', with: [
            'empresa' => EmpresaPerfil::atual(),
            'logoUrl' => EmpresaPerfil::atual()->logotipo_url,
            'factura' => $this->factura,
            'periodo' => self::MESES[$this->factura->mes - 1].' de '.$this->factura->ano,
            'consumo' => $leitura ? max(0.0, (float) $leitura->leitura_actual - (float) $leitura->leitura_anterior) : null,
            'urlVerificacao' => URL::signedRoute('verificacao.factura', ['factura' => $this->factura->id]),
        ]);
    }

    /** @return array<int, Attachment> */
    public function attachments(): array
    {
        return [
            Attachment::fromData(fn () => FacturaPdf::gerar($this->factura), FacturaPdf::nomeFicheiro($this->factura))
                ->withMime('application/pdf'),
        ];
    }
}
