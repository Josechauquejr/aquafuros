<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::factory()->create([
            'name' => 'Test User',
            'username' => 'test',
            'email' => 'test@example.com',
        ]);

        $this->call([
            RoleSeeder::class,
            UserSeeder::class,
            TarifaSeeder::class,
            ClienteSeeder::class,
            FacturacaoSeeder::class,
            FuncionalidadeSeeder::class,
        ]);
    }
}
