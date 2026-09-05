<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Cliente;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

/**
 * Lixeira de clientes — exclusiva do administrador. Um cliente eliminado
 * (com as suas facturas/leituras/pagamentos) fica aqui 30 dias, podendo ser
 * recuperado ou apagado definitivamente antes disso. Não há tarefa
 * agendada (cron) configurada no alojamento actual, por isso a purga de
 * quem já passou os 30 dias corre aqui mesmo, sempre que esta página é
 * aberta — suficiente para o volume desta app, sem depender de infra extra.
 */
class LixeiraController extends Controller
{
    private const DIAS_RETENCAO = 30;

    public function index()
    {
        $this->purgarExpirados();

        $clientes = Cliente::onlyTrashed()
            ->with('tarifa')
            ->withCount(['facturas' => fn ($q) => $q->withTrashed(), 'leituras' => fn ($q) => $q->withTrashed(), 'pagamentos' => fn ($q) => $q->withTrashed()])
            ->orderByDesc('deleted_at')
            ->get()
            ->map(fn (Cliente $cliente) => [
                'id' => $cliente->id,
                'numero_cliente' => $cliente->numero_cliente,
                'nome' => $cliente->nome,
                'bairro' => $cliente->bairro,
                'tarifa' => $cliente->tarifa?->nome,
                'eliminado_em' => $cliente->deleted_at,
                'dias_restantes' => $this->diasRestantes($cliente->deleted_at),
                'facturas_count' => $cliente->facturas_count,
                'leituras_count' => $cliente->leituras_count,
                'pagamentos_count' => $cliente->pagamentos_count,
            ]);

        return Inertia::render('Clientes/Lixeira', [
            'clientes' => $clientes,
            'diasRetencao' => self::DIAS_RETENCAO,
        ]);
    }

    public function restaurar(int $id)
    {
        $cliente = Cliente::onlyTrashed()->findOrFail($id);

        DB::transaction(function () use ($cliente) {
            $cliente->pagamentos()->onlyTrashed()->restore();
            $cliente->facturas()->onlyTrashed()->restore();
            $cliente->leituras()->onlyTrashed()->restore();
            $cliente->restore();
        });

        return redirect()->route('clientes.lixeira')->with('status', "Cliente {$cliente->nome} recuperado com sucesso.");
    }

    public function destroyDefinitivo(int $id)
    {
        $cliente = Cliente::onlyTrashed()->findOrFail($id);
        $nome = $cliente->nome;

        $this->purgarCliente($cliente);

        return redirect()->route('clientes.lixeira')->with('status', "Cliente {$nome} eliminado definitivamente.");
    }

    private function purgarExpirados(): void
    {
        $limite = Carbon::now()->subDays(self::DIAS_RETENCAO);

        Cliente::onlyTrashed()
            ->where('deleted_at', '<=', $limite)
            ->get()
            ->each(fn (Cliente $cliente) => $this->purgarCliente($cliente));
    }

    private function purgarCliente(Cliente $cliente): void
    {
        DB::transaction(function () use ($cliente) {
            $cliente->pagamentos()->withTrashed()->forceDelete();
            $cliente->facturas()->withTrashed()->forceDelete();
            $cliente->leituras()->withTrashed()->forceDelete();
            $cliente->divida()->delete();
            $cliente->forceDelete();
        });
    }

    private function diasRestantes(?string $deletedAt): int
    {
        if (! $deletedAt) {
            return 0;
        }

        $limite = Carbon::parse($deletedAt)->addDays(self::DIAS_RETENCAO);

        return max(0, (int) Carbon::now()->diffInDays($limite, false));
    }
}
