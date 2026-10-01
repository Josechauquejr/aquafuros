<?php

namespace App\Support;

use App\Models\Cliente;
use App\Models\EmpresaPerfil;
use App\Models\Factura;

/** Textos das mensagens aos clientes (lembretes e avisos) e o link do WhatsApp para as enviar à mão. */
class Mensagens
{
    private static function moeda(float $valor): string
    {
        return number_format($valor, 2, ',', ' ').' MZN';
    }

    private static function empresa(): string
    {
        return EmpresaPerfil::atual()->nome ?: 'Aquafuros';
    }

    public static function lembrete(Cliente $cliente, Factura $factura): string
    {
        return "Olá {$cliente->nome}, a {$factura->numero_factura} no valor de ".self::moeda($factura->emFalta())
            .' vence a '.$factura->data_vencimento->format('d/m/Y').'. Pague a tempo e evite multas. '.self::empresa().'.';
    }

    public static function atraso(Cliente $cliente, Factura $factura): string
    {
        return "Olá {$cliente->nome}, a {$factura->numero_factura} no valor de ".self::moeda($factura->emFalta())
            .' está vencida desde '.$factura->data_vencimento->format('d/m/Y').'. Por favor regularize o pagamento. '.self::empresa().'.';
    }

    public static function atrasoGrave(Cliente $cliente, Factura $factura): string
    {
        return "Aviso: {$cliente->nome}, a {$factura->numero_factura} (".self::moeda($factura->emFalta())
            .') está em atraso há mais de 15 dias. Sem regularização o fornecimento de água poderá ser cortado. '.self::empresa().'.';
    }

    /** Mensagem de cobrança geral, com o total em atraso do cliente. */
    public static function cobranca(Cliente $cliente, float $valor, int $facturas): string
    {
        return "Olá {$cliente->nome}, tem {$facturas} factura(s) vencida(s) no valor total de ".self::moeda($valor)
            .'. Por favor regularize o pagamento. '.self::empresa().'.';
    }

    /** Link que abre o WhatsApp com a mensagem pronta (o número é de Moçambique: +258). */
    public static function whatsappUrl(?string $telefone, string $texto): ?string
    {
        $digitos = Telefone::normalizar($telefone);

        return $digitos ? 'https://wa.me/258'.$digitos.'?text='.rawurlencode($texto) : null;
    }
}
