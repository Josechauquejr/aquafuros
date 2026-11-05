<?php

namespace Tests\Feature;

use App\Models\Cliente;
use App\Models\Factura;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DatabaseSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_seeder_builds_the_role_and_billing_fixture(): void
    {
        $this->seed();

        $this->assertDatabaseHas('users', ['username' => 'admin']);
        $this->assertDatabaseHas('users', ['username' => 'dev']);
        $this->assertSame(10, Cliente::count());
        $this->assertSame(20, Factura::count());
    }
}
