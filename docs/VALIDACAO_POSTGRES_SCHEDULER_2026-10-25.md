# Validacao PostgreSQL e scheduler — 25/10/2026

Validacao executada localmente. A base PostgreSQL de auditoria nao recebeu migrations nesta etapa; a base explicitamente dedicada a testes de concorrencia foi recriada pelo `migrate:fresh` definido nos proprios testes.

## Migrations e schema

`php artisan migrate:status` mostra 55/55 migrations como `Ran`; a tabela `migrations` contem 55 linhas. O catalogo local tem 46 tabelas (45 da aplicacao mais `migrations`).

As constraints e colunas verificadas correspondem ao codigo das cinco migrations auditadas:

- `facturas_leitura_id_unique`: UNIQUE em `facturas(leitura_id)`; a verificacao de duplicados retornou zero.
- `ajustes_leitura_ajuste_revertido_id_unique`: UNIQUE; `ajuste_revertido_id` referencia `ajustes_leitura(id)` com `ON DELETE RESTRICT`.
- `numeracoes_documentos`: PK em `chave varchar(40) NOT NULL`, `proximo_numero bigint NOT NULL` e timestamps opcionais.
- `facturas_estado_check`: aceita `pendente`, `paga`, `parcial`, `anulada` e `transferida`.
- `acessos_sistema.consultas`: `integer NULL`.

A contagem de migrations anteriormente reportada como 50 aplicadas e cinco pendentes estava desatualizada; a verificacao atual encontrou todas marcadas como executadas e efeitos de schema presentes. A validacao e local e nao declara equivalencia com outro ambiente. Os testes de concorrencia PostgreSQL foram executados separadamente na base isolada: 2 passaram, 24 assertions.

## Scheduler local

`php artisan schedule:list --json` lista `pulso-agendador` a cada minuto no timezone `Africa/Maputo`. Foi criada a tarefa Windows `Aquafuros Laravel Scheduler`, que chama o PHP local com `artisan schedule:run` na raiz do projeto. O trigger repete a cada minuto, sob a sessao do utilizador atual e permite execucao na bateria.

Durante a revisao actual, a tarefa ausente foi re-registada e ficou habilitada. `schtasks /Query` confirmou repeticao a cada minuto; as execucoes automaticas seguintes registaram `Last Result: 0`. A acao chama `wscript.exe` com `scripts/run-scheduler-hidden.vbs`, que executa o PHP sem janela e propaga o respectivo codigo de saida. As definicoes foram ajustadas para nao impedir inicio nem parar quando estiver na bateria. A consulta detalhada elevada confirmou ultima execucao as 22:23:01 e proxima as 22:24. O acesso WMI sem elevacao e negado, por isso o XML e o pulso no cache nao foram lidos nesta sessao.

## Limites

A auditoria confirma o schema local. A interface foi inventariada e revista estaticamente; nao houve inspeccao visual no browser, teste com leitor de ecran ou utilizadores. Ver [FECHO_AUDITORIA_LOCAL.md](FECHO_AUDITORIA_LOCAL.md) para evidencias, resultados da suite e itens humanos pendentes.
