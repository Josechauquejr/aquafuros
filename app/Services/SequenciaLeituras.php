<?php

namespace App\Services;

use App\Models\AjusteLeitura;
use App\Models\Cliente;
use App\Models\Factura;
use App\Models\Leitura;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Regras para recalcular a sequência do contador sem alterar facturas pagas. */
class SequenciaLeituras
{
    public function planoInsercao(Cliente $cliente, int $mes, int $ano, float $actual): array
    {
        if (Leitura::withTrashed()->where('cliente_id', $cliente->id)->where('mes', $mes)->where('ano', $ano)->exists()) {
            throw ValidationException::withMessages(['mes' => 'Já existe ou existiu uma leitura deste cliente nesse período. Restaure ou corrija esse registo.']);
        }

        $periodo = $ano * 100 + $mes;
        $leituras = Leitura::with(['factura.pagamentos', 'cliente.tarifa'])
            ->where('cliente_id', $cliente->id)->orderBy('ano')->orderBy('mes')->get();
        $anterior = $leituras->filter(fn ($l) => $l->ano * 100 + $l->mes < $periodo)->last();
        $seguinte = $leituras->first(fn ($l) => $l->ano * 100 + $l->mes > $periodo);
        $valorAnterior = (float) ($anterior?->leitura_actual ?? $cliente->leitura_inicial ?? 0);

        if ($actual < $valorAnterior) {
            throw ValidationException::withMessages(['leitura_actual' => "A leitura deve ser igual ou superior ao contador anterior ({$valorAnterior})."]);
        }
        if ($seguinte && $actual > (float) $seguinte->leitura_actual) {
            throw ValidationException::withMessages(['leitura_actual' => "A leitura deve ser igual ou inferior à leitura seguinte ({$seguinte->leitura_actual})."]);
        }

        $impactos = [];
        if ($seguinte) {
            $consumoAntes = $seguinte->consumo();
            $consumoDepois = max(0, (float) $seguinte->leitura_actual - $actual);
            $impactos[] = $this->impactoFactura($seguinte, $consumoAntes, $consumoDepois);
        }

        return [
            'retroactiva' => (bool) $seguinte,
            'leitura_anterior' => $valorAnterior,
            'consumo_novo' => round($actual - $valorAnterior, 2),
            'periodo' => sprintf('%02d/%04d', $mes, $ano),
            'seguinte' => $seguinte ? [
                'id' => $seguinte->id, 'periodo' => sprintf('%02d/%04d', $seguinte->mes, $seguinte->ano),
                'contador' => (float) $seguinte->leitura_actual,
                'consumo_antes' => $consumoAntes, 'consumo_depois' => $consumoDepois,
            ] : null,
            'facturas' => $impactos,
            'pode_aplicar' => collect($impactos)->every(fn ($i) => $i['pode_aplicar']),
        ];
    }

    public function inserir(Cliente $cliente, array $data, int $userId, string $motivo): Leitura
    {
        return DB::transaction(function () use ($cliente, $data, $userId, $motivo) {
            $cliente = Cliente::whereKey($cliente->id)->lockForUpdate()->firstOrFail();
            Leitura::where('cliente_id', $cliente->id)->lockForUpdate()->get(['id']);
            $plano = $this->planoInsercao($cliente, (int) $data['mes'], (int) $data['ano'], (float) $data['leitura_actual']);
            if ($plano['retroactiva'] && ! $plano['pode_aplicar']) {
                throw ValidationException::withMessages(['leitura_actual' => 'A factura seguinte já tem pagamento ou não está pendente; estorne/regularize os pagamentos antes da correcção.']);
            }

            $antes = ['leitura_inicial' => (float) $cliente->leitura_inicial, 'seguinte' => null, 'facturas' => []];
            $seguinte = $plano['seguinte'] ? Leitura::whereKey($plano['seguinte']['id'])->lockForUpdate()->firstOrFail() : null;
            if ($seguinte) {
                $antes['seguinte'] = $seguinte->only(['id', 'mes', 'ano', 'leitura_anterior', 'leitura_actual']);
                if ($seguinte->factura) $antes['facturas'][] = $this->snapshotFactura($seguinte->factura);
            }

            $leitura = Leitura::create([
                'numero_leitura' => \App\Support\NumeracaoDocumentos::proximoNumero(
                    Leitura::withTrashed()->where('numero_leitura', 'like', sprintf('LEI-%04d%02d-', $data['ano'], $data['mes']).'%'),
                    'numero_leitura', sprintf('LEI-%04d%02d-%%04d', $data['ano'], $data['mes']),
                ),
                'cliente_id' => $cliente->id, 'mes' => $data['mes'], 'ano' => $data['ano'],
                'leitura_anterior' => $plano['leitura_anterior'], 'leitura_actual' => $data['leitura_actual'],
                'confirmado' => false, 'registado_por' => $userId,
            ]);

            if ($seguinte) {
                $seguinte->update(['leitura_anterior' => $leitura->leitura_actual]);
                if ($seguinte->factura) $this->recalcularFactura($seguinte->factura, $seguinte->fresh());
            }

            $depois = [
                'nova_leitura' => $leitura->only(['id', 'mes', 'ano', 'leitura_anterior', 'leitura_actual']),
                'seguinte' => $seguinte?->fresh()->only(['id', 'mes', 'ano', 'leitura_anterior', 'leitura_actual']),
                'facturas' => $seguinte?->factura ? [$this->snapshotFactura($seguinte->factura->fresh())] : [],
            ];
            AjusteLeitura::create([
                'cliente_id' => $cliente->id, 'leitura_id' => $leitura->id, 'user_id' => $userId,
                'tipo' => 'insercao_retroactiva', 'motivo' => $motivo ?: 'Inserção de leitura retroactiva',
                'antes' => $antes, 'depois' => $depois,
            ]);

            return $leitura;
        });
    }

    public function planoActualizacao(Leitura $leitura, int $mes, int $ano, float $actual): array
    {
        $cliente = $leitura->cliente()->with('tarifa')->firstOrFail();
        $leituras = Leitura::with(['factura.pagamentos', 'cliente.tarifa'])
            ->where('cliente_id', $cliente->id)->orderBy('ano')->orderBy('mes')->get();
        if (Leitura::withTrashed()->where('cliente_id', $cliente->id)->where('mes', $mes)->where('ano', $ano)->where('id', '!=', $leitura->id)->exists()) {
            throw ValidationException::withMessages(['mes' => 'Já existe ou existiu outra leitura deste cliente nesse período.']);
        }
        $mudouPeriodo = $mes !== (int) $leitura->mes || $ano !== (int) $leitura->ano;
        if ($mudouPeriodo && $leitura->factura) {
            throw ValidationException::withMessages(['mes' => 'Não é possível mudar o período de uma leitura que já tem factura. Anule-a e registe a leitura no período correcto.']);
        }

        $antes = [];
        $rows = $leituras->map(function (Leitura $item) use ($leitura, $mes, $ano, $actual, &$antes) {
            $antes[$item->id] = [
                'id' => $item->id, 'mes' => (int) $item->mes, 'ano' => (int) $item->ano,
                'leitura_anterior' => (float) $item->leitura_anterior, 'leitura_actual' => (float) $item->leitura_actual,
            ];
            if ($item->id === $leitura->id) {
                $item = clone $item;
                $item->mes = $mes; $item->ano = $ano; $item->leitura_actual = $actual;
            }
            return $item;
        })->sortBy(fn ($item) => $item->ano * 100 + $item->mes)->values();

        $anterioresDepois = [];
        $contadorAnterior = (float) ($cliente->leitura_inicial ?? 0);
        foreach ($rows as $row) {
            if ((float) $row->leitura_actual < $contadorAnterior) {
                throw ValidationException::withMessages(['leitura_actual' => "A sequência não pode descer: a leitura deve ser pelo menos {$contadorAnterior}."]);
            }
            $anterioresDepois[$row->id] = $contadorAnterior;
            $contadorAnterior = (float) $row->leitura_actual;
        }

        $impactos = [];
        $idsAlterados = [];
        foreach ($rows as $row) {
            $id = $row->id;
            $antigo = $antes[$id];
            $novoActual = (float) $row->leitura_actual;
            $novoAnterior = (float) $anterioresDepois[$id];
            $consumoAntes = max(0, $antigo['leitura_actual'] - $antigo['leitura_anterior']);
            $consumoDepois = max(0, $novoActual - $novoAnterior);
            if ($antigo['leitura_anterior'] !== $novoAnterior || $antigo['leitura_actual'] !== $novoActual || ($mudouPeriodo && $id === $leitura->id)) {
                $idsAlterados[] = $id;
            }
            if (abs($consumoAntes - $consumoDepois) > 0.004) {
                $impactos[] = $this->impactoFactura($row, $consumoAntes, $consumoDepois);
            }
        }

        return [
            'mudou_periodo' => $mudouPeriodo,
            'periodo' => sprintf('%02d/%04d', $mes, $ano),
            'leituras' => collect($idsAlterados)->map(fn ($id) => [
                'antes' => $antes[$id],
                'depois' => ['id' => $id, 'mes' => (int) ($id === $leitura->id ? $mes : $antes[$id]['mes']), 'ano' => (int) ($id === $leitura->id ? $ano : $antes[$id]['ano']), 'leitura_anterior' => $anterioresDepois[$id], 'leitura_actual' => (float) ($id === $leitura->id ? $actual : $antes[$id]['leitura_actual'])],
            ])->values(),
            'facturas' => $impactos,
            'pode_aplicar' => collect($impactos)->every(fn ($i) => $i['pode_aplicar']),
            'requer_motivo' => $mudouPeriodo || count($idsAlterados) > 1 || $leitura->confirmado,
            'requer_previsualizacao' => $mudouPeriodo || count($idsAlterados) > 1,
        ];
    }

    public function actualizar(Leitura $leitura, int $mes, int $ano, float $actual, int $userId, string $motivo): void
    {
        DB::transaction(function () use ($leitura, $mes, $ano, $actual, $userId, $motivo) {
            $alvo = Leitura::whereKey($leitura->id)->lockForUpdate()->firstOrFail();
            $cliente = Cliente::whereKey($alvo->cliente_id)->lockForUpdate()->firstOrFail();
            Leitura::where('cliente_id', $cliente->id)->lockForUpdate()->get(['id']);
            $plano = $this->planoActualizacao($alvo, $mes, $ano, $actual);
            if (! $plano['pode_aplicar']) {
                throw ValidationException::withMessages(['leitura_actual' => 'Uma factura afectada tem pagamentos ou não está pendente. Estorne/regularize os pagamentos antes da correcção.']);
            }
            if ($plano['requer_motivo'] && blank($motivo)) {
                throw ValidationException::withMessages(['motivo' => 'Indique o motivo desta correcção.']);
            }

            $antes = ['leituras' => $plano['leituras']->pluck('antes'), 'facturas' => []];
            foreach ($plano['facturas'] as $impacto) {
                if ($impacto['factura']) $antes['facturas'][] = $impacto['factura'];
            }
            $alvo->update(['mes' => $mes, 'ano' => $ano, 'leitura_actual' => $actual]);
            if ($plano['mudou_periodo']) $alvo->update(['numero_leitura' => $this->numeroLeitura($ano, $mes)]);

            foreach ($plano['leituras'] as $par) {
                Leitura::whereKey($par['depois']['id'])->update(['leitura_anterior' => $par['depois']['leitura_anterior']]);
            }
            foreach ($plano['facturas'] as $impacto) {
                if (! $impacto['factura']) continue;
                $afectada = Leitura::with('factura')->findOrFail($impacto['leitura_id']);
                $this->recalcularFactura($afectada->factura, $afectada);
            }

            $depois = ['leituras' => $plano['leituras']->pluck('depois'), 'facturas' => []];
            foreach ($plano['facturas'] as $impacto) {
                if ($impacto['factura']) $depois['facturas'][] = $this->snapshotFactura(Factura::findOrFail($impacto['factura']['id']));
            }
            AjusteLeitura::create([
                'cliente_id' => $cliente->id, 'leitura_id' => $alvo->id, 'user_id' => $userId,
                'tipo' => $plano['mudou_periodo'] ? 'alteracao_periodo' : 'correcao_sequencia',
                'motivo' => $motivo ?: 'Actualização de leitura pendente', 'antes' => $antes, 'depois' => $depois,
            ]);
        });
    }

    public function planoLeituraInicial(Cliente $cliente, float $novoValor): array
    {
        $primeira = Leitura::with(['factura.pagamentos', 'cliente.tarifa'])
            ->where('cliente_id', $cliente->id)->orderBy('ano')->orderBy('mes')->first();
        if ($primeira && $novoValor > (float) $primeira->leitura_actual) {
            throw ValidationException::withMessages(['leitura_inicial' => 'A leitura inicial não pode ser maior que a primeira leitura mensal registada.']);
        }

        $impacto = $primeira ? $this->impactoFactura($primeira, $primeira->consumo(), max(0, (float) $primeira->leitura_actual - $novoValor)) : null;
        return [
            'leitura_inicial_antes' => (float) ($cliente->leitura_inicial ?? 0),
            'leitura_inicial_depois' => $novoValor,
            'primeira' => $primeira ? [
                'id' => $primeira->id, 'periodo' => sprintf('%02d/%04d', $primeira->mes, $primeira->ano),
                'contador' => (float) $primeira->leitura_actual, 'consumo_antes' => $primeira->consumo(),
                'consumo_depois' => max(0, (float) $primeira->leitura_actual - $novoValor),
            ] : null,
            'factura' => $impacto,
            'pode_aplicar' => $impacto['pode_aplicar'] ?? true,
        ];
    }

    public function alterarLeituraInicial(Cliente $cliente, float $novoValor, int $userId, string $motivo): void
    {
        DB::transaction(function () use ($cliente, $novoValor, $userId, $motivo) {
            $cliente = Cliente::whereKey($cliente->id)->lockForUpdate()->firstOrFail();
            Leitura::where('cliente_id', $cliente->id)->lockForUpdate()->get(['id']);
            $plano = $this->planoLeituraInicial($cliente, $novoValor);
            if (! $plano['pode_aplicar']) {
                throw ValidationException::withMessages(['leitura_inicial' => 'A factura da primeira leitura tem pagamentos ou já não está pendente. Estorne/regularize-os antes da correcção.']);
            }
            $primeira = $plano['primeira'] ? Leitura::whereKey($plano['primeira']['id'])->lockForUpdate()->firstOrFail() : null;
            $antes = ['leitura_inicial' => (float) $cliente->leitura_inicial, 'primeira' => $primeira?->only(['id', 'mes', 'ano', 'leitura_anterior', 'leitura_actual'])];
            if ($primeira?->factura) $antes['factura'] = $this->snapshotFactura($primeira->factura);

            $cliente->update(['leitura_inicial' => $novoValor]);
            if ($primeira) {
                $primeira->update(['leitura_anterior' => $novoValor]);
                if ($primeira->factura) $this->recalcularFactura($primeira->factura, $primeira->fresh());
            }

            $depois = ['leitura_inicial' => $novoValor, 'primeira' => $primeira?->fresh()->only(['id', 'mes', 'ano', 'leitura_anterior', 'leitura_actual'])];
            if ($primeira?->factura) $depois['factura'] = $this->snapshotFactura($primeira->factura->fresh());
            AjusteLeitura::create([
                'cliente_id' => $cliente->id, 'leitura_id' => $primeira?->id, 'user_id' => $userId,
                'tipo' => 'leitura_inicial', 'motivo' => $motivo, 'antes' => $antes, 'depois' => $depois,
            ]);
        });
    }

    private function impactoFactura(Leitura $leitura, float $consumoAntes, float $consumoDepois): array
    {
        $factura = $leitura->factura;
        if (! $factura) return ['leitura_id' => $leitura->id, 'factura' => null, 'consumo_antes' => $consumoAntes, 'consumo_depois' => $consumoDepois, 'pode_aplicar' => true];

        $pagamentos = $factura->pagamentos()->exists();
        $pode = ! $pagamentos && $factura->estado === 'pendente' && $factura->deleted_at === null;
        $valorDepois = $leitura->cliente?->tarifa
            ? app(BillingService::class)->valorConsumo((clone $leitura)->setAttribute('leitura_anterior', $leitura->leitura_actual - $consumoDepois), $leitura->cliente)
            : null;

        return [
            'leitura_id' => $leitura->id,
            'factura' => $factura->only(['id', 'numero_factura', 'total_pagar', 'valor_consumo', 'estado']),
            'consumo_antes' => $consumoAntes, 'consumo_depois' => $consumoDepois,
            'total_antes' => (float) $factura->total_pagar,
            'total_depois' => $valorDepois === null ? null : $this->novoTotal($factura, $valorDepois),
            'pode_aplicar' => $pode,
            'bloqueio' => $pode ? null : ($pagamentos ? 'pagamento_registado' : 'estado_nao_pendente'),
        ];
    }

    private function recalcularFactura(Factura $factura, Leitura $leitura): void
    {
        if ($factura->pagamentos()->exists() || $factura->estado !== 'pendente') {
            throw ValidationException::withMessages(['leitura_actual' => 'Não é seguro recalcular uma factura paga, parcial ou anulada.']);
        }
        $cliente = $leitura->cliente()->with('tarifa')->firstOrFail();
        $valor = app(BillingService::class)->valorConsumo($leitura, $cliente);
        $factura->update(['valor_consumo' => $valor, 'total_pagar' => $this->novoTotal($factura, $valor)]);
    }

    private function novoTotal(Factura $factura, float $valor): float
    {
        return round($valor + (float) $factura->saldo_inicial + (float) $factura->multa + (float) $factura->multa_anterior
            + ($factura->divida_anterior_incluida ? (float) $factura->divida_anterior : 0), 2);
    }

    private function snapshotFactura(Factura $factura): array
    {
        return $factura->only(['id', 'numero_factura', 'mes', 'ano', 'valor_consumo', 'total_pagar', 'estado']);
    }

    private function numeroLeitura(int $ano, int $mes): string
    {
        return \\App\\Support\\NumeracaoDocumentos::proximoNumero(
            Leitura::withTrashed()->where('numero_leitura', 'like', sprintf('LEI-%04d%02d-', $ano, $mes).'%'),
            'numero_leitura', sprintf('LEI-%04d%02d-%%04d', $ano, $mes),
        );
    }
}
