# Plano de melhorias do AquaFuros

## Estado e âmbito

Este documento acompanha os riscos e melhorias do AquaFuros. As Fases 0, 1, 2 e 3 estão concluídas. A medição e optimização local P2-02 da Fase 4 foram concluídas em 25/10/2026; rotina externa de backups e verificação do scheduler Railway continuam pendentes.

Foram executados testes focados para as tarefas implementadas. Em 23/10/2026, uma cópia PostgreSQL de produção do Railway foi restaurada numa base local isolada. Em 25/10/2026, cinco rotas foram medidas antes/depois e os gargalos confirmados foram optimizados; as métricas e limitações estão em `docs/INVENTARIO_E_PERFORMANCE.md`. Segundo o utilizador, o plano actual não disponibiliza backups geridos; falta estabelecer a rotina externa e confirmar o scheduler no Railway. A CLI Railway não conseguiu renovar a sessão nesta execução devido a erro de rede. As referências de ficheiros e linhas podem deslocar-se quando houver alterações.

### Resumo executivo

As Fases 0–3 estão concluídas. Na Fase 4, a contagem de consultas foi acrescentada à instrumentação e quatro rotas foram optimizadas a partir de medições na cópia PostgreSQL local: Facturas (91→18 consultas), Pagamentos (136→18), Dashboard (92→65) e KPIs (222→181). As suites focadas passaram; `ListasTest` foi alinhado com a separação actual entre totais de Facturas e Pagamentos. A rotina recorrente de backups e a verificação do scheduler Railway continuam pendentes porque a sessão da CLI expirou sem acesso de rede.
## Inventário priorizado

| ID          | Problema                                                                                                                             | Área                   | Prioridade        | Estado                                                                   | Impacto                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- | ----------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| P0-01 | Edicao e anulacao de factura sem transicao controlada ou proteccao concorrente. | Integridade financeira | P0 | Concluido em 23/10/2026; 62 testes e 691 verificacoes aprovados em PostgreSQL isolado | Evita estados financeiros invalidos e corridas entre pagamento, edicao e anulacao. |
| P0-02 | Anulacao de leitura deve validar motivo/pagamentos sem ler campos ausentes. | Leituras | P0 | Concluido em 23/10/2026; testes PostgreSQL aprovados | Evita bloqueios indevidos e garante anulacao correlacionada. |
| P0-03 | Fecho, pagamento e estorno devem partilhar serializacao transaccional. | Caixa/concorrencia | P0 | Concluido em 23/10/2026; 62 testes e 691 verificacoes aprovados em PostgreSQL isolado | Preserva o total do fecho e ordena movimentos concorrentes. |
| P1-01 | Recalculo historico usa snapshot da tarifa da emissao. | Facturacao | P1 | Concluido em 23/10/2026; teste PostgreSQL aprovado | Evita alterar facturas antigas apos mudanca tarifaria. |
| P1-02 | Emissao em lote precisa de bloqueio e unicidade por leitura. | Concorrencia | P1 | Concluido; locks, constraint unica e suites aprovadas | Evita facturas duplicadas sob concorrencia. |
| P1-03 | Ajustes de leitura precisam de reversao auditada e segura. | Auditoria | P1 | Concluido; reversoes e bloqueios testados | Permite restaurar sequencia sem apagar historico nem afectar pagamentos. |
| P1-04 | Numeracao de documentos deve ser serializada. | Numeracao | P1 | Concluido; suite PostgreSQL aprovada | Evita colisoes e reutilizacao de numeros. |
| P1-05 | Registos financeiros estornados devem permanecer preservados. | Retencao | P1 | Concluido; dois testes de retencao aprovados | Evita perda de historico e eliminacao em cascata. |
| P2-01       | Fórmula de consumo estava repetida no cálculo de facturação, relatórios, documentos e interface.                                     | Manutenção             | P2                | Corrigido                                                                | O cálculo partilhado agora cobre PHP, SQL e JavaScript; cenários abaixo/igual/acima e SQL são comparados num teste unitário. |
| P2-02       | Faltavam contagem de queries e revisão das medições por rota para os fluxos principais.                                             | Performance            | P2                | Concluído em 25/10/2026 na cópia isolada; contagem e optimizações implementadas e medidas antes/depois | Evita optimizações sem evidência e reduz consultas repetidas nos fluxos mais pesados. |
| P4-05       | Modelos actuais não expressam eventos estruturados de troca de contador, leitura estimada/foto, titular múltiplo ou plano parcelado. | Operação             | P4                | Confirmado como ausente nos modelos examinados                           | Limita casos de uso reais; requisitos devem ser especificados antes de construir.                            |
| Pendente-01 | Rotina externa de backups e configuração de scheduler no Railway.                                                               | Operação               | P0 de verificação | Dump/restauro local verificados; rotina e scheduler pendentes; CLI bloqueada por falha de rede/OAuth | Sem rotina externa recorrente não há cópia recuperável actualizada; scheduler precisa de execução persistente. |
| Pendente-02 | NUIT do cliente, IVA e requisitos fiscais aplicáveis.                                                                                | Fiscal                 | P1 de verificação | Não verificado                                                           | Código examinado contém NUIT da empresa, mas não foi confirmada conformidade legal.                          |

## Evidências e decisões técnicas confirmadas

- A edicao de factura rejeita `estado` e bloqueia a linha/revalida pagamentos dentro da transaccao; a anulacao mantem leitura, factura, motivo e auditoria atomicos (`FacturaController.php`).
- `LeituraController::destroy` nao consulta `leitura_actual`; valida motivo, bloqueia leitura/factura, impede anulacao com pagamentos e actualiza registos relacionados dentro de transaccao.
- Pagamento, adiantamento e fecho bloqueiam a linha do utilizador dentro da transaccao; pagamento tambem bloqueia cliente/factura. Estorno individual/em lote segue a mesma ordem, para que o fecho registe um snapshot consistente (`PagamentoController.php`).
- Tarifas antigas: a emissao guarda `emissao_original.tarifa`, usada pelo preview e pelo recálculo em `SequenciaLeituras::recalcularFactura` e `BillingService::valorConsumo`.
- Emissao em lote recolhe candidatas e depois bloqueia/revalida cada leitura dentro da transaccao; a constraint unica em `facturas.leitura_id` e a ultima proteccao. A emissao individual tambem bloqueia cliente/leitura em `Facturacao::emitir`.
- Numeracao usa `NumeracaoDocumentos::proximoNumero`, com lock numa chave por tipo/período e constraints unicas; números já utilizados, incluindo anulados, não são reutilizados.
- Retencao: a lixeira protege pagamentos estornados e clientes com historico financeiro contra eliminacao definitiva; os testes de retencao dedicados passaram.
- Consumo está implementado em `app/Services/BillingService.php:37�?"40` e `app/Models/Leitura.php:111�?"114`.
- As suites funcionais P1 e os testes dedicados de retencao foram executados em PostgreSQL isolado em 23/10/2026. Uma assercao legada de metricas em `ListasTest` permanece pendente de actualizacao.

## FASE 0 �?" Protecção e preparação

### P0-00 �?" Confirmar recuperação antes de alterações financeiras

- **Categoria:** segurança operacional / continuidade.
- **Prioridade:** P0.
- **Estado da descoberta:** concluído em 23/10/2026 para dump lógico e restauro isolado; rotina recorrente fica como acompanhamento operacional.
- **Problema:** este repositório não confirmava que a base do Railway tinha backup recuperável nem procedimento de restauro ensaiado.
- **Evidência:** dump lógico PostgreSQL 18 exportado do serviço `Postgres`, restaurado em `aquafuros_railway_restore_20261023_122217` numa instância local PostgreSQL 18.2; 43 tabelas restauradas e conexão Laravel confirmada. O utilizador confirmou que o plano actual não permite backups geridos pelo Railway.
- **Impacto:** uma regressão ou operação incorrecta pode não ter recuperação conhecida.
- **Causa:** configuração externa ao código.
- **Solução aplicada:** criar dump lógico recente, guardá-lo fora do repositório e restaurá-lo numa base isolada antes das alterações financeiras.
- **Tarefas concluídas:** exportação com `pg_dump`; validação do arquivo; restauro isolado; ligação da aplicação à cópia; registo sem credenciais em `docs/RECUPERACAO_POSTGRES_RAILWAY.md`.
- **Acompanhamento operacional:** definir responsável, frequência e retenção da cópia externa recorrente. Backups geridos de volume/PITR não estão disponíveis no plano actual, segundo o utilizador.
- **Dependências:** nenhuma. Deve anteceder deploy de alterações financeiras.
- **Riscos da alteração:** não alterar produção durante a verificação; proteger dumps e credenciais.
- **Testes necessários:** prova documentada de que a cópia pode ser restaurada e aplicação consegue ligar à cópia.
- **Critérios de aceitação:** dump recente identificável e restauro de ensaio aprovado �?" cumpridos em 23/10/2026. A rotina recorrente é acompanhamento operacional e não invalida o ensaio de recuperação concluído.
- **Complexidade estimada:** média.
- **Ficheiros afectados:** nenhum previsto; operação externa Railway.

### P0-04 �?" Fixar casos de regressão e regras de transição

- **Categoria:** qualidade / integridade financeira.
- **Prioridade:** P0.
- **Estado:** concluido em 23/10/2026; matriz, regressao financeira e concorrencia real aprovadas em PostgreSQL isolado.
- **Problema:** os fluxos P0 carecem de testes de regressão demonstrados nesta auditoria.
- **Evidência:** existem suites em `tests/Feature`, mas não foram executadas; pontos de entrada constam em `routes/web.php:123`, `:150`, `:156`, `:165`.
- **Impacto:** uma correcção de estados ou locks pode quebrar emissão, pagamento, estorno ou permissões.
- **Causa:** cobertura destes cenários ainda não foi confirmada.
- **Solução proposta:** antes/depois de cada correcção, cobrir estados válidos/inválidos, papéis autorizados, efeitos relacionados e concorrência.
- **Tarefas de implementação:** documentar matriz de transições; criar testes HTTP para factura e leitura; testes de integração de caixa/pagamento; preparar teste concorrente na mesma base de dados suportada.
- **Dependências:** P0-00 antes de usar qualquer cópia semelhante à produção.
- **Riscos da alteração:** testes que partilhem dados de produção são proibidos; usar base isolada.
- **Testes necessários:** feature, integração e concorrência; suite de regressão já existente.
- **Critérios de aceitação:** todos os cenários abaixo reproduzíveis e executáveis de forma isolada.
- **Complexidade estimada:** média.
- **Ficheiros afectados:** novos/actualizados testes em `tests/Feature`; possivelmente `tests/TestCase.php`.

## FASE 1 - Correccoes P0

### P0-01 - Restringir transicoes manuais do estado da factura

- **Estado:** concluido em 23/10/2026; testes PostgreSQL aprovados.
- A edicao continua a rejeitar o campo `estado` e so permite editar valores de facturas pendentes sem pagamentos.
- A edicao agora bloqueia a factura, revalida estado e pagamentos dentro de uma transaccao e grava os valores apenas se continuar elegivel.
- A anulacao bloqueia leitura e factura na mesma ordem do fluxo de anulacao iniciado pela leitura. Verifica pagamentos sob lock e grava estado, motivo, autor, data e anulacao da leitura numa unica transaccao.
- **Ficheiro alterado nesta fase:** `app/Http/Controllers/FacturaController.php`.
- **Validacao automatizada:** suite PostgreSQL aprovada (62 testes, 691 verificacoes).

### P0-02 - Corrigir a anulacao de leitura

- **Estado:** concluido em 23/10/2026; implementacao existente confirmada e testes PostgreSQL aprovados.
- `LeituraController::destroy` nao consulta `leitura_actual`; valida motivo, bloqueia leitura/factura, impede anulacao com pagamentos e actualiza registos relacionados dentro de transaccao.
- **Ficheiro:** `app/Http/Controllers/LeituraController.php` (sem alteracao nesta fase).

### P0-03 - Serializar fecho, pagamentos e estornos

- **Estado:** concluido em 23/10/2026; testes PostgreSQL aprovados.
- Registo individual, lote, adiantamento e fecho usam o lock da linha do utilizador e revalidam o fecho dentro da transaccao. A tabela `fechos_caixa` tem unicidade por utilizador/data.
- Estornos individual e em lote agora bloqueiam o utilizador que recebeu o dinheiro, cliente, factura e movimentos relacionados, na mesma ordem de locks. Os saldos e facturas sao recalculados dentro da transaccao.
- Um estorno apos o fecho continua permitido apenas a administradores. O fecho conserva os totais apurados no momento da confirmacao; o estorno posterior fica registado no historico de actividade e nao altera a fotografia fechada.
- **Ficheiro alterado nesta fase:** `app/Http/Controllers/PagamentoController.php`.
- **Migracao:** nao necessaria.
- **Validacao automatizada:** suite PostgreSQL aprovada (62 testes, 691 verificacoes).
## Backlog após P0

### P1 - Consistencia funcional (concluida em 23/10/2026)

- **P1-01 Tarifas historicas - concluida:** a emissao guarda os valores da tarifa em `emissao_original.tarifa`; previsao e recalculo de consumo usam esse snapshot, mesmo se a tarifa do cliente mudar. Validado em `CorrigirLeituraTest` e suites de facturacao.
- **P1-02 Emissao concorrente em lote - concluida:** leituras sao revalidadas sob lock dentro da transaccao e `facturas.leitura_id` tem restricao unica; emissao e reexecucao cobertas em `EmailFacturasTest` e `FacturasOrigemTest`.
- **P1-03 Reversao dos ajustes - concluida:** insercao retroactiva e alteracao da leitura inicial podem ser revertidas com motivo/auditoria; a reversao bloqueia se houve pagamento, alteracao posterior ou ajuste mais recente activo. Validado em `AjusteLeituraReversaoTest`.
- **P1-04 Numeracao transaccional - concluida:** sequencias por tipo/periodo usam lock e preservam numeros historicos, inclusive documentos anulados. Validado em `NumeracaoDocumentosTest`.
- **P1-05 Retencao financeira - concluida:** pagamentos estornados e clientes com historico financeiro nao podem ser apagados definitivamente pela lixeira. Os dois testes de retencao passaram isoladamente.
- **Validacao PostgreSQL:** 71 testes/732 verificacoes nas suites funcionais e 2 testes/20 verificacoes de retencao passaram na base isolada `aquafuros_p0_regression_test_20261023`.
- **Nota de suite:** a execucao completa de `ListasTest` tem uma expectativa antiga para `totais.recebidoNoMes`, propriedade que ja nao e fornecida pela pagina de Facturas. Misturada com `ConcorrenciaCaixaPostgresTest`, a classe ainda mostra contaminacao de estado entre suites; os testes especificos de retencao passaram separadamente.

- **Pendente-02 Requisitos fiscais:** confirmar com contabilista/regulador quais campos e formato documental aplicam-se, antes de acrescentar NUIT do cliente, IVA ou sequencia fiscal. Esta verificacao e operacional/fiscal e permanece fora da conclusao dos cinco itens funcionais P1.

### P2 �?" Manutenção e performance

- Consolidar consumo em uma regra partilhada: `BillingService.php:37�?"40` e `Leitura.php:111�?"114`.
- Medir consultas N+1 e tempo real antes de optimizar; o painel `/dev/analise?aba=lentidao` já apresenta p95 por rota e consultas do PostgreSQL quando `pg_stat_statements` está activa. O plano de profiling e as limitações estão em `docs/INVENTARIO_E_PERFORMANCE.md`.
- Rever fronteiras entre controllers, `Support` e `Services` apenas quando um fluxo concreto beneficiar; evitar refactor amplo durante P0.
- Confirmar o scheduler do Railway: `routes/console.php:12-18` agenda notificações às 08:00 e pulso por minuto; deployment activo não verificado. Não foram encontrados jobs `ShouldQueue`; as tarefas assíncronas identificadas usam `afterResponse`, portanto não há evidência de que seja necessário um worker persistente actualmente.

### P3 �?" Higiene

- Procurar imports, variáveis ou componentes sem uso com análise de referências, incluindo rotas dinâmicas, Inertia, eventos, testes e configuração. Inventário em `docs/INVENTARIO_E_PERFORMANCE.md`; nenhum código foi removido e migrations históricas permanecem intactas.
- Documentar regras de tarifa, estados de factura, retenção e procedimento de restauro.

### P4 �?" Evolução

- Histórico de contador e troca/avaria; estimativa com acerto; alertas de consumo fora do padrão.
- Corte/religação com historial e taxas; titularidade e múltiplos contadores; encerramento/acerto final.
- Caução, notas de crédito e planos faseados.
- Integração/reconciliação M-Pesa, e-Mola e banco; SMS/WhatsApp.
- Leituras offline com evidência fotográfica; balanço entre produção e volume facturado.
- Estruturar troca/avaria de contador, leitura estimada com fotografia, titularidade múltipla e parcelamento após definir regras operacionais.

## Redundâncias e candidatos a remoção

| Elemento                               | Evidência                                         | Risco                                    | Proposta                                                                                                               |
| -------------------------------------- | ------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Fórmula de consumo repetida            | `BillingService.php:37�?"40`; `Leitura.php:111�?"114` | Divergência futura                       | P2: centralizar e adicionar teste de equivalência antes de remover qualquer implementação.                             |
| Código potencialmente não referenciado | Nenhum candidato foi comprovado nesta análise     | Remoção pode quebrar chamadas dinâmicas  | P3: analisar referências em rotas, Inertia, container, eventos, comandos, testes e configuração. Não apagar sem prova. |
| Migrations históricas                  | `database/migrations/` reconstrói schema/evolução | Remoção pode impedir instalação/restauro | Não remover; corrigir estado com nova migration reversível sempre que apropriado.                                      |

## Matriz de dependências

| Tarefa                  | Depende de                                    | Pode decorrer em paralelo?                                                                              |
| ----------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| P0-00                   | �?"                                             | Sim, com P0-04. Deve terminar antes de deploy.                                                          |
| P0-04                   | P0-00 para ambiente próximo da produção       | Sim, testes unitários e leitura de código podem avançar enquanto backup é verificado.                   |
| P0-01 | P0-00 e P0-04 | Anulacao da factura deve manter o mesmo fluxo e ordem de locks da anulacao da leitura. |
| P0-02 | P0-04 e P0-01 | Ja esta implementado; manter os bloqueios de pagamentos e auditoria. |
| P0-03 | P0-00 e P0-04 | Locks de pagamento, estorno e fecho devem usar a mesma chave do caixa. |
| P1-01/P1-02/P1-03/P1-04 | P0 aprovado e migrado em ambiente de ensaio   | Podem ser planeadas em paralelo, implementação deve ter migrations e testes independentes.              |

## Checklist executável

### Fase 0 �?" Protecção e preparação

- [x] P0-00 Exportar backup lógico e confirmar restauro isolado (concluído em 23/10/2026).
- [x] P0-04 Definir matriz de estados e preparar testes de regressao (60 testes de regressao e 2 cenarios concorrentes aprovados em PostgreSQL isolado; ver `docs/P0-04-MATRIZ-TESTES.md`).

### Fase 1 �?" Correcções críticas

- [x] P0-01 Restringir edicao e anular factura em transaccao; validado em PostgreSQL.
- [x] P0-02 Confirmar anulacao de leitura e bloqueio quando ha pagamentos; validado em PostgreSQL.
- [x] P0-03 Serializar pagamento, estorno e fecho; validado em PostgreSQL, incluindo concorrencia real.

### Fase 2 �?" Consistência funcional

- [x] P1-01 Usar snapshot da tarifa original na facturacao e recálculo; tests PostgreSQL aprovados.
- [x] P1-02 Tornar emissão em lote concorrente/idempotente.
- [x] P1-03 Reverter ajustes de sequencia com auditoria e bloqueios; tests PostgreSQL aprovados.
- [x] P1-04 Tornar numeração segura sob concorrência.
- [x] P1-05 Preservar pagamentos anulados e impedir eliminação em cascata.
#### Verificacao fiscal pendente (fora da Fase 2 funcional)

- [ ] Pendente-02 Confirmar requisitos fiscais.

### Fase 3 �?" Refactorização

- [x] P2-01 Centralizar fórmula de consumo com testes de equivalência.
- [x] P3-01 Fazer inventário de código sem referências antes de qualquer remoção.

### Fase 4 �?" Performance e operação

- [ ] Pendente-01 Definir rotina externa de backups e confirmar scheduler no Railway.
- [x] P2-02 Medir consultas/tempos reais, optimizar gargalos demonstrados e comparar na cópia isolada (25/10/2026).

### Fases 5 e 6 �?" Funcionalidades

- [x] P4-01 Estimativas e reconciliação financeira implementadas localmente em 25/10/2026; migration aplicada na cópia PostgreSQL local. A gestão do ciclo físico/troca de contador ainda está pendente; não houve deploy nem testes automatizados nesta etapa.
- [ ] P4-02 Especificar corte, religação, titularidade e múltiplos contadores.
- [ ] P4-03 Especificar caução, nota de crédito e parcelamento.
- [ ] P4-04 Avaliar integrações de pagamento, comunicação e trabalho offline.

## Critérios de conclusão do P0

- Os três cenários críticos têm testes reproduzíveis: estados inválidos de factura, anulação de leitura e corrida de caixa/pagamento.
- Factura só fica paga quando há pagamento/imputação correspondente; anulação só ocorre pelo fluxo auditado e mantém a leitura associada anulada.
- Caixa fechado não aceita pagamentos posteriores e o total congelado reconcilia com os movimentos aceites.
- O backup pode ser restaurado num ambiente isolado antes de publicação.
- Suite de testes relevante passa em ambiente não produtivo; nenhuma validação é declarada aprovada sem execução.
- Deploy acompanhado de confirmação de migrations, healthcheck e reconciliação de totais financeiros antes/depois.

## Estratégia segura de execução

1. Guardar backup e validar restauro; nunca testar com escrita na base de produção.
2. Implementar cada P0 em alterações pequenas, acompanhadas dos testes listados.
3. Executar suite e testes de concorrência numa cópia isolada com PostgreSQL compatível com Railway.
4. Comparar contagens e totais de facturas, pagamentos, créditos e fechos antes/depois.
5. Fazer deploy com plano de rollback da aplicação e sem migrations destrutivas; acompanhar logs, healthcheck e integrações.
6. Só iniciar P1 depois de confirmar os critérios de aceitação P0.
