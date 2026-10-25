# P0-04 — Matriz de estados e regressao financeira

Esta matriz descreve os resultados esperados dos fluxos financeiros. Os testes
PHPUnit usam SQLite em memoria definido em `phpunit.xml`; nao usam o `.env` local
nem a copia restaurada da producao.

## Matriz de transicoes

| Dominio | Estado inicial / pedido | Resultado permitido | Resultado bloqueado e evidencia |
| --- | --- | --- | --- |
| Factura | `pendente`, pedido de edicao com `estado=paga`, `parcial` ou `anulada` | Editar apenas campos permitidos, mantendo o estado financeiro | Rejeitar a alteracao de estado sem fluxo de pagamento/anulacao; sem pagamento criado. `FacturasOrigemTest::test_edicao_de_factura_nao_permite_alterar_estado_financeiro` |
| Factura | `pendente`/`parcial`, pagamento valido | Registar pagamento e recalcular estado/saldo na mesma transaccao | Recusar excesso, duplicacao, factura liquidada e lote invalido; operacao em lote e tudo-ou-nada. `PagamentoMultiploTest`, `FacturasOrigemTest` |
| Leitura | Leitura sem factura, anulacao com motivo | Soft delete auditado; se existir factura pendente sem pagamento, anular factura na mesma operacao | Exigir motivo; bloquear anulacao se houver pagamento total ou parcial. `CorrigirLeituraTest` |
| Leitura retroactiva | Insercao/correcao elegivel, facturas sem pagamentos | Recalcular sequencia e documento; registar ajuste que pode ser revertido | Bloquear com pagamento ou se os valores da sequencia mudaram. `AjusteLeituraReversaoTest`, `CorrigirLeituraTest` |
| Pagamento | Caixa aberta, pedido valido | Guardar pagamento e actualizacao de factura; incluir movimento no fecho do dia | Tecnico sem permissao, data futura, valor acima do saldo e pedido com estado financeiro incoerente sao recusados. `PagamentoMultiploTest`, `Fase2Test`, `FacturasOrigemTest` |
| Caixa | Caixa aberta, fecho valido | Snapshot de totais por metodo, total, contagem e diferenca; unicidade por caixa/data | Segundo fecho recusado; depois do fecho, pagamento simples, lote e adiantamento nao entram. `Fase2Test::test_fecho_de_caixa_exige_o_dinheiro_contado_e_regista_a_diferenca`, `Fase3Test::test_caixa_fechado_bloqueia_pagamentos_em_lote_e_adiantamentos` |
| Concorrencia caixa/pagamento | Pedido de pagamento e fecho simultaneos pelo mesmo utilizador | Serializacao pela linha do utilizador: ou pagamento precede e entra no snapshot, ou fecho precede e pagamento e rejeitado | Nunca aceitar um pagamento fora do snapshot de caixa ja fechado. Implementacao usa `lockForUpdate` da linha `users` nos dois caminhos e chave unica `(utilizador_id, data)` em `fechos_caixa`. |

## Execucao reproduzivel

Com dependencias instaladas, executar na raiz do projecto:

```powershell
vendor/bin/phpunit tests/Feature/FacturasOrigemTest.php tests/Feature/CorrigirLeituraTest.php tests/Feature/AjusteLeituraReversaoTest.php tests/Feature/PagamentoMultiploTest.php tests/Feature/Fase2Test.php tests/Feature/Fase3Test.php
```

O runner usa a base SQLite `:memory:` do `phpunit.xml`. Nao remover essa
configuracao nem apontar esta suite ao `.env`, Railway ou snapshot restaurado.

Para repetir em PostgreSQL, criar primeiro um banco local vazio com o nome
`aquafuros_p0_regression_test_20261023`; depois usar a configuracao dedicada:

```powershell
vendor/bin/phpunit --configuration phpunit.postgres.xml tests/Feature/FacturasOrigemTest.php tests/Feature/CorrigirLeituraTest.php tests/Feature/AjusteLeituraReversaoTest.php tests/Feature/PagamentoMultiploTest.php tests/Feature/Fase2Test.php tests/Feature/Fase3Test.php tests/Feature/ConcorrenciaCaixaPostgresTest.php
```

`phpunit.postgres.xml` força o driver e o nome exacto da base de teste; host,
porta e credenciais continuam a vir do `.env`. Nao altere o nome para a base
`aquafuros_railway_restore_20261023_122217` nem para outra base com dados reais.

## Verificacao real de concorrencia

`ConcorrenciaCaixaPostgresTest` inicia um processo PHP independente no momento
em que o pedido principal ja bloqueou a linha do caixa (`users ... FOR UPDATE`).
Os processos disputam o mesmo utilizador e usam a conexao PostgreSQL do banco
isolado, com verificacao do nome real da base antes de qualquer operacao.

Foram executadas as duas ordens:

- Fecho adquire o lock primeiro: o pedido de pagamento aguarda, depois e
  recusado; nenhuma linha de pagamento e criada e o fecho fica com contagem 0.
- Pagamento adquire o lock primeiro: o pedido de fecho aguarda, depois grava o
  total e a contagem que incluem o pagamento aceite.
## Observacoes da suite

Execucao final em 23/10/2026: SQLite em memoria passou com 60 testes e 665 assercoes. PostgreSQL isolado passou com 62 testes e 691 assercoes, incluindo as duas disputas concorrentes reais. A primeira execucao PostgreSQL tambem encontrou que a migration de reconciliacao nao alargava o CHECK de estado quando a tabela facturas estava vazia. A migration `2026_10_23_000005_permitir_facturas_transferidas_postgres.php` corrige o schema para bases novas e existentes.
