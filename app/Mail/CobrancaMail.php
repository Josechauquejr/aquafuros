<?php

namespace App\Mail;

use App\Models\Cliente;
use App\Models\EmpresaPerfil;
use App\Models\Factura;
use App\Support\FacturaPdf;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Support\Collection;

/**
 * Email de cobrança com a(s) factura(s) em PDF anexada(s). Serve os três avisos
 * automáticos (lembrete de vencimento, atraso, atraso grave) e o email de
 * cobrança manual (várias facturas em atraso de um cliente).
 *
 * Os dias de atraso são sempre os REAIS no momento do envio (contados desde a
 * data de vencimento de cada factura), nunca os do dia em que o aviso foi
 * criado nem um número fixo.
 */
class CobrancaMail extends Mailable
{
    private const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    private const TITULOS = [
        'lembrete_vencimento' => ['Lembrete de pagamento', false],
        'atraso' => ['Pagamento em atraso', false],
        'atraso_grave' => ['Aviso importante — atraso prolongado', true],
        'cobranca' => ['Facturas em atraso', false],
    ];

    /**
     * @param  Collection<int, Factura>  $facturas
     */
    public function __construct(public string $tipo, public Cliente $cliente, public Collection $facturas) {}

    private static function dias(int $n): string
    {
        return $n.' '.($n === 1 ? 'dia' : 'dias');
    }

    /** Dias que a factura está em atraso hoje (0 se ainda não venceu). */
    public static function diasDeAtraso(Factura $factura): int
    {
        $venc = $factura->data_vencimento?->copy()->startOfDay();

        return $venc && $venc->lt(now()->startOfDay()) ? (int) $venc->diffInDays(now()->startOfDay()) : 0;
    }

    /** Dias que faltam para vencer (0 se já venceu ou vence hoje). */
    public static function diasParaVencer(Factura $factura): int
    {
        $venc = $factura->data_vencimento?->copy()->startOfDay();

        return $venc && $venc->gt(now()->startOfDay()) ? (int) now()->startOfDay()->diffInDays($venc) : 0;
    }

    private function maisAntiga(): ?Factura
    {
        return $this->facturas->sortBy('data_vencimento')->first();
    }

    public function envelope(): Envelope
    {
        $nome = EmpresaPerfil::atual()->nome;
        $unica = $this->facturas->count() === 1 ? $this->facturas->first() : null;
        $ref = $unica ? ' '.$unica->numero_factura : '';

        $assunto = match ($this->tipo) {
            'lembrete_vencimento' => 'Lembrete: factura'.$ref.' vence em breve',
            'atraso', 'atraso_grave' => 'Factura'.$ref.' em atraso'.($unica ? ' há '.self::dias(self::diasDeAtraso($unica)) : ''),
            default => 'Facturas em atraso',
        };

        return new Envelope(subject: "{$assunto} — {$nome}");
    }

    public function content(): Content
    {
        [$titulo, $grave] = self::TITULOS[$this->tipo] ?? self::TITULOS['cobranca'];
        $lembrete = $this->tipo === 'lembrete_vencimento';

        $linhas = $this->facturas->map(fn (Factura $f) => [
            'numero' => $f->numero_factura,
            'periodo' => self::MESES[$f->mes - 1].'/'.$f->ano,
            'vencimento' => $f->data_vencimento?->format('d/m/Y') ?? '—',
            'falta' => $f->emFalta(),
            'situacao' => $lembrete
                ? 'vence em '.self::dias(self::diasParaVencer($f))
                : self::dias(self::diasDeAtraso($f)).' de atraso',
        ])->all();

        $unica = $this->facturas->count() === 1 ? $this->facturas->first() : null;
        $antiga = $this->maisAntiga();

        if ($lembrete) {
            $introducao = $unica
                ? 'A sua factura <strong>'.$unica->numero_factura.'</strong> vence em <strong>'.self::dias(self::diasParaVencer($unica)).'</strong> ('.$unica->data_vencimento->format('d/m/Y').'). Pague a tempo e evite multas e o corte do fornecimento.'
                : 'Tem facturas que vencem em breve. Pague a tempo e evite multas e o corte do fornecimento.';
            $fecho = 'Obrigado por manter a sua conta em dia.';
        } elseif ($unica) {
            $introducao = 'A sua factura <strong>'.$unica->numero_factura.'</strong> venceu em '.$unica->data_vencimento->format('d/m/Y')
                .' e está em atraso há <strong>'.self::dias(self::diasDeAtraso($unica)).'</strong>.'
                .($grave ? ' <strong>Sem regularização, o fornecimento de água poderá ser cortado.</strong>' : ' Pedimos que a regularize o quanto antes.');
            $fecho = $grave ? 'Contacte-nos se precisa de combinar o pagamento.' : 'Regularize o quanto antes para evitar multas.';
        } else {
            $introducao = 'Tem <strong>'.$this->facturas->count().' facturas vencidas</strong> por pagar; a mais antiga está em atraso há <strong>'
                .self::dias($antiga ? self::diasDeAtraso($antiga) : 0).'</strong>. Pedimos que as regularize.';
            $fecho = 'Se precisa de combinar o pagamento, contacte-nos.';
        }

        return new Content(view: 'emails.cobranca', with: [
            'empresa' => EmpresaPerfil::atual(),
            'cliente' => $this->cliente,
            'titulo' => $titulo,
            'introducao' => $introducao,
            'fecho' => $fecho,
            'grave' => $grave,
            'lembrete' => $lembrete,
            'linhas' => $linhas,
            'total' => array_sum(array_column($linhas, 'falta')),
            'nAnexos' => min($this->facturas->count(), 5),
        ]);
    }

    /** @return array<int, Attachment> */
    public function attachments(): array
    {
        // No máximo 5 PDFs por email (um cliente com muitas facturas em atraso não deve rebentar o anexo).
        return $this->facturas->take(5)->map(
            fn (Factura $f) => Attachment::fromData(fn () => FacturaPdf::gerar($f), FacturaPdf::nomeFicheiro($f))->withMime('application/pdf'),
        )->all();
    }
}
