# Backup e ensaio de restauro do PostgreSQL no Railway

## Estado

Em 23/10/2026 foi criado e restaurado um dump lógico do Railway numa base local isolada. A configuração de backups automáticos de volume/PITR e a retenção da conta Railway ainda **não foram verificadas**.

## 1. Confirmar a protecção no Railway

No serviço PostgreSQL de produção, abrir **Backups** e registar:

- data/hora do backup mais recente;
- se existe agenda de backups e qual a retenção apresentada;
- se o PITR está activo e qual a janela de recuperação apresentada;
- nome do projecto, ambiente e serviço, sem copiar URLs, tokens ou passwords.

Se não houver backup recente, criar um backup manual nessa página e aguardar que o Railway o indique como concluído. Não clicar em **Restore** no serviço de produção durante este ensaio: o restauro de backup de volume substitui o volume activo após o deploy.

O backup de volume e PITR são protecções do serviço/projecto. Manter também um dump lógico fora do repositório e, idealmente, fora do projecto Railway.

## 2. Criar um dump lógico sem expor a base publicamente

Pré-requisitos locais: Railway CLI autenticada e ferramentas PostgreSQL 18 (`pg_dump`, `pg_restore` e `psql`). Usar uma pasta privada fora do repositório, com acesso restrito e espaço suficiente. Dumps contêm dados pessoais e financeiros.

1. No directório ligado ao projecto Railway, abrir um terminal e iniciar o túnel para o serviço PostgreSQL:

   ```powershell
   railway connect Postgres --tunnel-only
   ```

   Deixar este terminal aberto. O nome `Postgres` deve corresponder ao nome do serviço no projecto.

2. Noutro terminal, usar os dados locais do túnel indicados pela CLI. Criar um dump em formato customizado. Substituir `<PORTA_LOCAL>` pela porta do túnel; o cliente pedirá a password se necessário:

   ```powershell
   pg_dump --host 127.0.0.1 --port <PORTA_LOCAL> --username <UTILIZADOR_DO_TUNEL> --dbname <BASE_DO_TUNEL> --format=custom --no-owner --file "<PASTA_PRIVADA>\aquafuros-20261023-HHmmss.dump"
   ```

   Não gravar a password no comando, no histórico do terminal, num ficheiro do projecto ou neste documento. Não usar `postgres.railway.internal` a partir do computador local; esse hostname só resolve dentro da rede Railway. O túnel evita habilitar acesso público para este procedimento.

3. Calcular e guardar o checksum junto do registo do backup:

   ```powershell
   Get-FileHash "<PASTA_PRIVADA>\aquafuros-20261023-HHmmss.dump" -Algorithm SHA256
   ```

Confirmar que o comando terminou com código zero e que o ficheiro tem tamanho maior que zero. Proteger e reter o dump segundo a política da empresa; não o adicionar ao Git.

## 3. Restaurar numa base realmente isolada

Criar um **novo serviço PostgreSQL de ensaio**, preferencialmente noutro projecto/ambiente Railway, sem volume partilhado e sem apontar a aplicação pública para ele. Não restaurar o dump na base de produção nem criar uma base scratch no servidor de produção. Usar PostgreSQL 18, compatível com a imagem de produção.

1. Abrir um túnel separado para o serviço de ensaio e confirmar cuidadosamente que o terminal/serviço seleccionado é o de ensaio.
2. Restaurar o dump na base vazia desse serviço:

   ```powershell
   pg_restore --host 127.0.0.1 --port <PORTA_LOCAL_DE_ENSAIO> --username <UTILIZADOR_DE_ENSAIO> --dbname <BASE_DE_ENSAIO> --no-owner --exit-on-error "<PASTA_PRIVADA>\aquafuros-20261023-HHmmss.dump"
   ```

3. Executar verificações somente de leitura na base restaurada e comparar com a origem no momento do dump. Pelo menos, comparar contagens exactas de `clientes`, `leituras`, `facturas`, `pagamentos`, `creditos`, `fechos_caixa`, `ajustes_leitura` e `leitura_correccoes`, incluindo registos anulados/eliminados logicamente. Por exemplo, ligar `psql` ao serviço de ensaio e executar:

   ```sql
   SELECT 'clientes' AS tabela, count(*) FROM clientes
   UNION ALL SELECT 'leituras', count(*) FROM leituras
   UNION ALL SELECT 'facturas', count(*) FROM facturas
   UNION ALL SELECT 'pagamentos', count(*) FROM pagamentos
   UNION ALL SELECT 'creditos', count(*) FROM creditos
   UNION ALL SELECT 'fechos_caixa', count(*) FROM fechos_caixa
   UNION ALL SELECT 'ajustes_leitura', count(*) FROM ajustes_leitura
   UNION ALL SELECT 'leitura_correccoes', count(*) FROM leitura_correccoes
   ORDER BY tabela;
   ```

4. Fazer amostragem de registos recentes e relacionados: cliente, leitura, factura e pagamento. Não incluir valores pessoais no relatório; registar apenas se a amostra foi consistente. Confirmar também que a aplicação consegue ligar à base restaurada usando uma configuração local isolada, sem substituir o `.env` de produção nem executar migrations/seeds.
5. Registar duração do restauro e diferenças encontradas. Depois da validação, eliminar o serviço de ensaio e o dump temporário apenas quando já existir uma cópia segura retida conforme a política definida.

## Registo do ensaio

Preencher sem credenciais, connection strings, nomes de clientes ou dados financeiros individuais:

| Campo | Resultado |
|---|---|
| Data/hora UTC do dump | Pendente |
| Backup Railway recente visível (data/hora UTC) | Pendente |
| Agenda e retenção configuradas | Pendente |
| PITR activo/janela apresentada | Pendente |
| SHA-256 guardado em local privado | Pendente |
| Serviço de ensaio isolado (identificador não secreto) | Pendente |
| Versão PostgreSQL origem/ensaio | Pendente |
| Restauro terminou sem erros | Pendente |
| Contagens e amostras coerentes | Pendente |
| Ligação da aplicação local ao ensaio confirmada | Pendente |
| Duração do restauro | Pendente |
| Responsável pelo ensaio | Pendente |
| Decisão | **Não verificado** |

## Ensaio local realizado

Em 23/10/2026 foi feito um ensaio **somente** contra a base local `aquafuros_database`, em `127.0.0.1:5432`, PostgreSQL 18.2. O dump customizado foi restaurado numa base local separada chamada `aquafuros_restore_20261023_120732`; a base original não foi alvo de comandos de escrita directos. A conexão Laravel à base restaurada foi confirmada.

- Dump: `%TEMP%\aquafuros-p0-00\aquafuros_local_20261023_120732.dump` (178.214 bytes).
- SHA-256: `f34829b0c34c742a71084ee0117ca1b94286ce3a282f37e2a2657eff410b206d`.
- As listas das tabelas `public` coincidiram entre origem e restauro.
- Contagens exactas iguais: clientes 13, leituras 26, facturas 27, pagamentos 25, créditos 0, fechos de caixa 0 e correcções de leitura 0.
- `erros_sistema` tinha mais um registo na origem do que no snapshot restaurado; a tabela foi preservada, sem apagar o log.
- Esta base local ainda não tem a tabela `ajustes_leitura`; o schema local não é igual ao schema esperado pelas migrations actuais. O restauro reproduziu correctamente o schema existente na origem.

Este ensaio comprova o dump/restauro da **base local**. Não confirma que a conta Railway tem backups configurados nem substitui um ensaio do backup de produção. O dump e a cópia restaurada ficaram em ambiente local para desenvolvimento; manter ambos protegidos como dados sensíveis.

## Exportação da produção Railway e restauro local

Em 23/10/2026, após autenticar e ligar a Railway CLI ao projecto/ambiente correctos, foi exportado o serviço PostgreSQL 18 `Postgres` usando a URL de acesso TCP público que já estava configurada. A URL e a password foram usadas apenas em memória e não foram registadas neste repositório. O tráfego de saída pelo proxy público pode ser cobrado pelo Railway.

- Dump em `%USERPROFILE%\Documents\AquaFurosBackups\aquafuros-railway-20261023-122217.dump` (262.302 bytes).
- SHA-256: `00C379B7395AAB1F8C5538D9092440E36BE52B5DA8050BAE17874ADB54A464B0`.
- `pg_restore --list` conseguiu ler o arquivo (367 entradas de catálogo).
- O restauro terminou sem erros em PostgreSQL local 18.2, base `aquafuros_railway_restore_20261023_122217`.
- Laravel conectou-se à cópia. Foram restauradas 43 tabelas públicas; contagens de negócio: clientes 320, leituras 196, facturas 184, pagamentos 3, créditos 0, fechos de caixa 0, ajustes de leitura 0 e correcções de leitura 2.
- A base local original `aquafuros_database` não foi sobrescrita. Depois do ensaio, o `.env` local foi apontado para `aquafuros_railway_restore_20261023_122217` e `APP_URL` para `http://aquafuros.test`, para a aplicação local usar a cópia restaurada. `php artisan db:show --counts` confirmou PostgreSQL 18.2, 43 tabelas e 184 facturas nessa cópia.

Este resultado verifica o dump lógico e o seu restauro. Falta confirmar no painel Railway se existem backups automáticos de volume/PITR e qual é a retenção configurada.

### Limitação do plano e alternativa

O utilizador confirmou que o plano actual não disponibiliza backups geridos pelo Railway. Assim, não se deve contar com snapshots de volume/PITR neste projecto. A alternativa disponível e já ensaiada é criar dumps lógicos periódicos com `pg_dump` e guardar cópias numa localização privada fora do Railway. A frequência e o destino adicional fora deste computador ainda precisam de ser definidos; o dump acima, sozinho, não constitui uma rotina automática.

## Critério para concluir P0-00

Só marcar como concluído quando houver backup recente identificável, política de retenção conhecida, dump lógico protegido e restauro completo numa base isolada com contagens/amostras coerentes e ligação da aplicação confirmada. Se algum passo falhar, documentar o erro sem expor credenciais e corrigir antes de alterações financeiras ou deploy.

## Referências Railway

- [Back Up and Restore Postgres](https://docs.railway.com/guides/postgres-backups-restores)
- [Volume Backups](https://docs.railway.com/volumes/backups)
- [Point-in-Time Recovery](https://docs.railway.com/volumes/point-in-time-recovery)
