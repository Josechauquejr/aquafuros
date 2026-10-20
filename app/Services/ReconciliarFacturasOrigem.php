<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use RuntimeException;

/** Reconstitui as parcelas sem alterar números, valores ou referências dos recibos. */
class ReconciliarFacturasOrigem
{
    public function executar(): array
    {
        return DB::transaction(function () {
            $facturas = DB::table('facturas')->orderBy('created_at')->orderBy('id')->lockForUpdate()->get()->keyBy('id');
            $pagamentos = DB::table('pagamentos')->orderBy('created_at')->orderBy('id')->lockForUpdate()->get();
            if ($facturas->contains(fn ($f) => $f->emissao_original !== null)) {
                throw new RuntimeException('A reconciliação já foi executada; não será repetida sobre dados normalizados.');
            }
            $centavos = fn ($v) => (int) round((float) $v * 100);
            $antes = [];
            foreach ($facturas as $f) {
                if ($f->deleted_at === null && in_array($f->estado, ['pendente', 'parcial'], true)) {
                    $pago = $pagamentos->where('factura_id', $f->id)->whereNull('deleted_at')->sum(fn ($p) => $centavos($p->valor_pago));
                    $antes[$f->cliente_id] = ($antes[$f->cliente_id] ?? 0) + max(0, $centavos($f->total_pagar) - $pago);
                }
            }
            $entradas = [];
            foreach ($facturas as $f) {
                if ($f->transferida_para_id) {
                    $destino = $facturas->get($f->transferida_para_id);
                    if (! $destino || $destino->cliente_id !== $f->cliente_id) throw new RuntimeException("Transferência inválida na factura {$f->id}.");
                    $entradas[$destino->id][] = $f->id;
                } elseif ($f->estado === 'transferida') {
                    throw new RuntimeException("A factura {$f->id} não tem destino de transferência.");
                }
            }
            $origens = [];
            $visitar = function ($id, $caminho = []) use (&$visitar, &$origens, $entradas) {
                if (in_array($id, $caminho, true)) throw new RuntimeException('Foi detectado um ciclo de transferências.');
                if (isset($origens[$id])) return $origens[$id];
                $resultado = [];
                foreach ($entradas[$id] ?? [] as $origem) $resultado = [...$resultado, $origem, ...$visitar($origem, [...$caminho, $id])];
                return $origens[$id] = array_values(array_unique($resultado));
            };
            foreach ($facturas as $f) $visitar($f->id);
            $capacidade = [];
            foreach ($facturas as $f) {
                $snapshot = (array) $f;
                unset($snapshot['emissao_original']);
                $temOrigens = count($origens[$f->id]) > 0;
                $herdado = $temOrigens && $f->divida_anterior_incluida
                    ? $centavos($f->divida_anterior) + $centavos($f->multa_anterior) : 0;
                $total = $centavos($f->total_pagar) - $herdado;
                $multa = $centavos($f->multa) + (! $temOrigens ? $centavos($f->multa_anterior) : 0);
                if ($total < $multa || $total < 0) throw new RuntimeException("Parcelas inválidas na factura {$f->id}.");
                $inicial = max(0, $total - $multa - $centavos($f->valor_consumo));
                $capacidade[$f->id] = ['principal' => $total - $multa, 'multa' => $multa, 'pago' => 0];
                DB::table('facturas')->where('id', $f->id)->update([
                    'emissao_original' => json_encode($snapshot), 'total_pagar' => $total / 100,
                    'multa' => $multa / 100, 'multa_anterior' => 0,
                    'saldo_inicial' => $inicial / 100, 'divida_anterior_incluida' => false,
                ]);
                foreach ($origens[$f->id] as $origem) DB::table('factura_saldos')->insert(['factura_id' => $f->id, 'origem_id' => $origem]);
            }
            foreach ($pagamentos as $p) {
                $f = $facturas->get($p->factura_id);
                if (! $f || $f->cliente_id !== $p->cliente_id) throw new RuntimeException("Recibo {$p->id} sem factura válida.");
                $ids = $f->divida_anterior_incluida ? [...$origens[$f->id], $f->id] : [$f->id];
                $ids = $facturas->only($ids)->sortBy(fn ($r) => $r->created_at.sprintf('%020d', $r->id))->keys()->all();
                $restante = $centavos($p->valor_pago);
                $parcelas = [];
                // Mantém a regra histórica: primeiro o principal, depois as multas.
                foreach (['principal', 'multa'] as $tipo) {
                    foreach ($ids as $id) {
                        $parte = min($restante, $capacidade[$id][$tipo]);
                        if ($parte <= 0) continue;
                        $parcelas[$id][$tipo] = ($parcelas[$id][$tipo] ?? 0) + $parte;
                        $restante -= $parte;
                        if ($p->deleted_at === null) {
                            $capacidade[$id][$tipo] -= $parte;
                            $capacidade[$id]['pago'] += $parte;
                        }
                    }
                }
                // Um eventual excesso antigo fica visível no recibo, sem criar dívida nem dinheiro novo.
                if ($restante > 0) $parcelas[$f->id]['principal'] = ($parcelas[$f->id]['principal'] ?? 0) + $restante;
                foreach ($parcelas as $id => $partes) DB::table('pagamento_imputacoes')->insert([
                    'pagamento_id' => $p->id, 'factura_id' => $id,
                    'valor_principal' => ($partes['principal'] ?? 0) / 100,
                    'valor_multa' => ($partes['multa'] ?? 0) / 100,
                    'origem' => 'reconciliacao',
                ]);
            }
            $depois = [];
            foreach ($facturas as $f) {
                if ($f->estado === 'anulada') continue;
                $saldo = $capacidade[$f->id]['principal'] + $capacidade[$f->id]['multa'];
                $estado = $saldo <= 0 ? 'paga' : ($capacidade[$f->id]['pago'] > 0 ? 'parcial' : 'pendente');
                DB::table('facturas')->where('id', $f->id)->update(['estado' => $estado]);
                if ($f->deleted_at === null) $depois[$f->cliente_id] = ($depois[$f->cliente_id] ?? 0) + $saldo;
            }
            foreach (array_unique([...array_keys($antes), ...array_keys($depois)]) as $clienteId) {
                if (($antes[$clienteId] ?? 0) !== ($depois[$clienteId] ?? 0)) {
                    throw new RuntimeException("A reconciliação alteraria o saldo do cliente {$clienteId}; nenhuma alteração foi guardada.");
                }
            }
            return ['facturas' => $facturas->count(), 'recibos' => $pagamentos->count(), 'saldo_centavos' => array_sum($depois)];
        });
    }
}
