<?php

namespace Database\Seeders;

use App\Models\Cliente;
use App\Models\Divida;
use App\Models\Tarifa;
use Illuminate\Database\Seeder;

class ClienteSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $clientes = [
            ['numero_cliente' => 'CLI-0001', 'nome' => 'Armando Cossa', 'bairro' => 'Polana Caniço', 'endereco' => 'Av. Julius Nyerere, 145', 'telefone' => '84 123 4567', 'tarifa' => 'Doméstica', 'estado' => 'ativo', 'data_adesao' => '2024-02-10'],
            ['numero_cliente' => 'CLI-0002', 'nome' => 'Esperança Macuácua', 'bairro' => 'Zimpeto', 'endereco' => 'Rua 3, Quarteirão 12', 'telefone' => '82 456 7891', 'tarifa' => 'Doméstica', 'estado' => 'ativo', 'data_adesao' => '2024-03-22'],
            ['numero_cliente' => 'CLI-0003', 'nome' => 'Padaria Bom Pão, Lda', 'bairro' => 'Bairro Central', 'endereco' => 'Av. 25 de Setembro, 88', 'telefone' => '21 300 812', 'tarifa' => 'Comercial', 'estado' => 'ativo', 'data_adesao' => '2024-01-15'],
            ['numero_cliente' => 'CLI-0004', 'nome' => 'Fátima Nhantumbo', 'bairro' => 'Costa do Sol', 'endereco' => 'Rua da Praia, 21', 'telefone' => '87 654 3210', 'tarifa' => 'Doméstica', 'estado' => 'cortado', 'data_adesao' => '2023-11-02'],
            ['numero_cliente' => 'CLI-0005', 'nome' => 'Escola Primária 25 de Junho', 'bairro' => 'Matola-Rio', 'endereco' => 'Rua da Escola, s/n', 'telefone' => '21 745 220', 'tarifa' => 'Institucional', 'estado' => 'ativo', 'data_adesao' => '2023-09-05'],
            ['numero_cliente' => 'CLI-0006', 'nome' => 'João Sitoe', 'bairro' => 'Magoanine', 'endereco' => 'Rua 7, Casa 34', 'telefone' => '84 998 1123', 'tarifa' => 'Doméstica', 'estado' => 'inativo', 'data_adesao' => '2024-05-18'],
            ['numero_cliente' => 'CLI-0007', 'nome' => 'Lavandaria Águas Claras', 'bairro' => 'Malhangalene', 'endereco' => 'Av. Vladimir Lenine, 302', 'telefone' => '82 220 9911', 'tarifa' => 'Comercial', 'estado' => 'ativo', 'data_adesao' => '2024-04-09'],
            ['numero_cliente' => 'CLI-0008', 'nome' => 'Cremilde Bila', 'bairro' => 'Zimpeto', 'endereco' => 'Rua 5, Quarteirão 8', 'telefone' => '86 331 7742', 'tarifa' => 'Doméstica', 'estado' => 'ativo', 'data_adesao' => '2024-06-30'],
            ['numero_cliente' => 'CLI-0009', 'nome' => 'Hortelino Chissano', 'bairro' => 'Costa do Sol', 'endereco' => 'Rua da Praia, 47', 'telefone' => '84 776 2231', 'tarifa' => 'Doméstica', 'estado' => 'cortado', 'data_adesao' => '2023-12-11'],
            ['numero_cliente' => 'CLI-0010', 'nome' => 'Mercado Popular do Bairro', 'bairro' => 'Bairro Central', 'endereco' => 'Praça do Mercado, 1', 'telefone' => '21 301 654', 'tarifa' => 'Comercial', 'estado' => 'ativo', 'data_adesao' => '2024-02-27'],
        ];

        foreach ($clientes as $dados) {
            $tarifa = Tarifa::where('nome', $dados['tarifa'])->firstOrFail();

            $cliente = Cliente::updateOrCreate(
                ['numero_cliente' => $dados['numero_cliente']],
                [
                    'nome' => $dados['nome'],
                    'endereco' => $dados['endereco'],
                    'telefone' => $dados['telefone'],
                    'bairro' => $dados['bairro'],
                    'tarifa_id' => $tarifa->id,
                    'estado' => $dados['estado'],
                    'data_adesao' => $dados['data_adesao'],
                ],
            );

            Divida::firstOrCreate(
                ['cliente_id' => $cliente->id],
                ['valor_divida' => 0, 'meses_atraso' => 0, 'em_corte' => $dados['estado'] === 'cortado'],
            );
        }
    }
}
