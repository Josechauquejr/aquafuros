<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Preenche a leitura inicial dos clientes antigos que ainda está nula.
 * Por omissão apenas conta os registos; --aplicar grava zero de forma segura
 * e repetível, sem recalcular leituras mensais ou facturas.
 */
class PreencherLeiturasIniciaisNulas extends Command
{
    protected $signature = 'clientes:preencher-leitura-inicial-zero {--aplicar : Grava 0,00 nos clientes com leitura_inicial nula}';

    protected $description = 'Preenche com 0,00 a leitura inicial nula dos clientes';

    public function handle(): int
    {
        $nulos = DB::table('clientes')->whereNull('leitura_inicial')->count();
        $this->info($nulos.' cliente(s) com leitura inicial nula.');

        if (! $this->option('aplicar')) {
            $this->comment('Nada foi alterado. Use --aplicar para preencher os valores com 0,00.');

            return self::SUCCESS;
        }

        $alterados = DB::transaction(fn () => DB::table('clientes')
            ->whereNull('leitura_inicial')
            ->update(['leitura_inicial' => 0]));

        $this->info($alterados.' cliente(s) actualizado(s) para 0,00.');

        return self::SUCCESS;
    }
}
