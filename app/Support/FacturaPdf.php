<?php

namespace App\Support;

use App\Models\EmpresaPerfil;
use App\Models\Factura;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Symfony\Component\Process\Process;

/**
 * A factura em PDF (A4), gerada no servidor — é o ficheiro que segue em anexo
 * e o mesmo que se pode descarregar. Mostra o mesmo que a factura
 * impressa: dados do cliente, leitura, valores e estado.
 */
class FacturaPdf
{
    public static function nomeFicheiro(Factura $factura): string
    {
        return 'Factura-'.$factura->numero_factura.'.pdf';
    }

    public static function gerar(Factura $factura): string
    {
        $factura->loadMissing([
            'cliente' => fn ($q) => $q->withTrashed()->with('tarifa'),
            'leitura' => fn ($q) => $q->withTrashed(),
            'leituraEstimada',
            'geradaPor' => fn ($q) => $q->withTrashed(),
            'pagamentos',
        ]);

        $leitura = $factura->leitura;
        $consumo = $leitura?->consumo() ?? $factura->consumo_m3;
        $anterior = $leitura?->anterior();
        $tarifa = $factura->cliente?->tarifa;
        $factura->multa_prevista = $factura->multaAtrasoPrevista();
        $factura->prepararDocumento();
        $empresa = EmpresaPerfil::atual();
        $urlVerificacao = URL::signedRoute('verificacao.factura', ['factura' => $factura->id]);

        return Pdf::loadView('pdf.factura', [
            'factura' => $factura,
            'empresa' => $empresa,
            'logotipo' => self::logotipoBase64($empresa),
            'leitura' => $leitura,
            'leituraEstimada' => $factura->leituraEstimada,
            'primeiraLeitura' => $leitura?->ehPrimeira() ?? false,
            'consumo' => $consumo,
            'consumoAnterior' => $anterior ? round($anterior->consumo(), 2) : null,
            'tarifaMinima' => $consumo !== null && $tarifa && $consumo <= (float) $tarifa->consumo_minimo_m3,
            'tarifa' => $tarifa,
            'totalPago' => $factura->cobranca['pagamentos_apos_emissao'],
            'emFalta' => $factura->cobranca['saldo_actual'],
            'urlVerificacao' => $urlVerificacao,
            'qrImagem' => self::qrImagem($urlVerificacao),
        ])->setPaper('a4')->output();
    }

    /** Usa o mesmo codificador local do browser; mantém o link se Node não estiver disponível. */
    private static function qrImagem(string $url): ?string
    {
        try {
            $processo = new Process(['node', base_path('scripts/factura-qr.mjs'), $url], base_path());
            $processo->setTimeout(5)->run();

            if ($processo->isSuccessful() && str_starts_with($processo->getOutput(), '<svg')) {
                return 'data:image/svg+xml;base64,'.base64_encode($processo->getOutput());
            }
        } catch (\Throwable $erro) {
            report($erro);
        }

        return null;
    }

    /** O logotipo vai dentro do PDF (data URI) — o dompdf não deve ir buscar nada à rede. */
    private static function logotipoBase64(EmpresaPerfil $empresa): ?string
    {
        $caminho = $empresa->logotipo_path;
        if (! $caminho || ! Storage::disk('public')->exists($caminho)) {
            return null;
        }

        $mime = Storage::disk('public')->mimeType($caminho) ?: 'image/png';

        return 'data:'.$mime.';base64,'.base64_encode(Storage::disk('public')->get($caminho));
    }
}
