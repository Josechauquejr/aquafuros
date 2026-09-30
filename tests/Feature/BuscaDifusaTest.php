<?php

namespace Tests\Feature;

use App\Models\Cliente;
use App\Models\Factura;
use App\Models\Tarifa;
use App\Models\User;
use App\Support\BuscaDifusa;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class BuscaDifusaTest extends TestCase
{
    use RefreshDatabase;

    private function linhas(array $textos): Collection
    {
        return collect($textos)->map(fn ($t, $i) => (object) ['id' => $i + 1, 'texto' => $t]);
    }

    private function ids(array $textos, string $pesquisa): ?array
    {
        return BuscaDifusa::ids($this->linhas($textos), $pesquisa, fn ($l) => $l->texto);
    }

    public function test_sem_pesquisa_nao_filtra(): void
    {
        $this->assertNull($this->ids(['Ana'], ''));
        $this->assertNull($this->ids(['Ana'], '  - '));
    }

    public function test_ignora_acentos_maiusculas_e_aceita_palavras_parciais(): void
    {
        $this->assertSame([1], $this->ids(['João Nhantumbo', 'Bento Cossa'], 'JOAO'));
        $this->assertSame([1], $this->ids(['Antonio LRM', 'Bento Cossa'], 'anto'));
        $this->assertSame([2], $this->ids(['Ana Chongo', 'Antonio LRM'], 'lrm antonio'));
    }

    public function test_tolera_erros_de_escrita(): void
    {
        $this->assertSame([1], $this->ids(['Antonio Matsinhe', 'Bento Cossa'], 'antonjo'));
        $this->assertSame([1], $this->ids(['Antonio Matsinhe', 'Bento Cossa'], 'matsinhee'));
        $this->assertSame([2], $this->ids(['Carla Nhantumbo', 'Dulce Cossa'], 'dulse'));
    }

    public function test_numeros_nao_toleram_erros_e_todas_as_palavras_tem_de_corresponder(): void
    {
        $this->assertSame([1], $this->ids(['FAT-2026-0003 Ana', 'FAT-2026-0004 Ana'], '0003'));
        $this->assertSame([], $this->ids(['FAT-2026-0003 Ana', 'FAT-2026-0004 Ana'], '0009'));
        $this->assertSame([], $this->ids(['Ana Chongo'], 'ana zzzz'));
    }

    public function test_melhores_correspondencias_primeiro(): void
    {
        $this->assertSame([2, 1], $this->ids(['Antonia Silva', 'Antonio Silva'], 'antonio'));
    }

    public function test_lista_de_facturas_usa_a_pesquisa_difusa(): void
    {
        $this->seed(RoleSeeder::class);
        $admin = User::factory()->create();
        $admin->assignRole('administrador');
        $tarifa = Tarifa::create(['nome' => 'Doméstica']);
        $ana = Cliente::create(['numero_cliente' => 'CLI-1', 'nome' => 'António Matsinhe', 'tarifa_id' => $tarifa->id, 'estado' => 'ativo']);
        $rui = Cliente::create(['numero_cliente' => 'CLI-2', 'nome' => 'Rui Cossa', 'tarifa_id' => $tarifa->id, 'estado' => 'ativo']);
        foreach ([[$ana, 'F-1'], [$rui, 'F-2']] as [$c, $n]) {
            Factura::create(['numero_factura' => $n, 'cliente_id' => $c->id, 'mes' => 9, 'ano' => 2026, 'total_pagar' => 10, 'estado' => 'pendente']);
        }

        $this->actingAs($admin)->get('/facturas?search=antonjo')
            ->assertInertia(fn (Assert $page) => $page->has('facturas.data', 1)->where('facturas.data.0.numero_factura', 'F-1'));

        $this->actingAs($admin)->get('/clientes?search=matsinhe')
            ->assertInertia(fn (Assert $page) => $page->has('clientes.data', 1)->where('clientes.data.0.nome', 'António Matsinhe'));
    }
}
