<?php

namespace Database\Seeders;

use App\Models\Tarifa;
use Illuminate\Database\Seeder;

class TarifaSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $tarifas = [
            ['nome' => 'Doméstica', 'preco_m3' => 70, 'taxa_minima' => 350, 'consumo_minimo_m3' => 5, 'percentagem_multa' => 0.10, 'limiar_corte' => 700, 'is_active' => true],
            ['nome' => 'Comercial', 'preco_m3' => 95, 'taxa_minima' => 600, 'consumo_minimo_m3' => 8, 'percentagem_multa' => 0.12, 'limiar_corte' => 1500, 'is_active' => true],
            ['nome' => 'Institucional', 'preco_m3' => 60, 'taxa_minima' => 300, 'consumo_minimo_m3' => 10, 'percentagem_multa' => 0.08, 'limiar_corte' => 2000, 'is_active' => true],
            ['nome' => 'Industrial', 'preco_m3' => 130, 'taxa_minima' => 1200, 'consumo_minimo_m3' => 20, 'percentagem_multa' => 0.15, 'limiar_corte' => 3500, 'is_active' => false],
        ];

        foreach ($tarifas as $dados) {
            Tarifa::updateOrCreate(['nome' => $dados['nome']], $dados);
        }
    }
}
