<?php

namespace Database\Seeders;

use App\Models\Funcionalidade;
use Illuminate\Database\Seeder;

class FuncionalidadeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $seccoes = [
            'clientes' => 'Clientes',
            'facturas' => 'Facturas',
            'pagamentos' => 'Pagamentos',
            'leituras' => 'Leituras',
            'tarifas' => 'Tarifário e Regras',
            'kpis' => 'KPIs',
        ];

        foreach ($seccoes as $chave => $nome) {
            Funcionalidade::firstOrCreate(['chave' => $chave], ['nome' => $nome, 'activa' => true]);
        }
    }
}
