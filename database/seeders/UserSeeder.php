<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $utilizadores = [
            ['name' => 'Admin', 'username' => 'admin', 'email' => 'admin@aquafuros.local', 'role' => 'administrador'],
            ['name' => 'Graça Simbine', 'username' => 'graca.simbine', 'email' => 'graca.simbine@aquafuros.local', 'role' => 'gestor'],
            ['name' => 'Rui Matsimbe', 'username' => 'rui.matsimbe', 'email' => 'rui.matsimbe@aquafuros.local', 'role' => 'gestor'],
            ['name' => 'Célia Machel', 'username' => 'celia.machel', 'email' => 'celia.machel@aquafuros.local', 'role' => 'caixa'],
            ['name' => 'Ivan Mondlane', 'username' => 'ivan.mondlane', 'email' => 'ivan.mondlane@aquafuros.local', 'role' => 'caixa'],
            ['name' => 'Sérgio Nhaca', 'username' => 'sergio.nhaca', 'email' => 'sergio.nhaca@aquafuros.local', 'role' => 'tecnico'],
            ['name' => 'Belinda Chauque', 'username' => 'belinda.chauque', 'email' => 'belinda.chauque@aquafuros.local', 'role' => 'tecnico', 'is_active' => false],
        ];

        foreach ($utilizadores as $dados) {
            $user = User::updateOrCreate(
                ['username' => $dados['username']],
                [
                    'name' => $dados['name'],
                    'email' => $dados['email'],
                    'password' => Hash::make('password'),
                    'is_active' => $dados['is_active'] ?? true,
                    'email_verified_at' => now(),
                ],
            );

            $user->syncRoles([$dados['role']]);
        }
    }
}
