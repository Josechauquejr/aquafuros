# Inventário de código e perfil de performance

Data da análise: 25/10/2026.

## P2-02 — Performance

### Limite desta análise

O `.env` local aponta para `127.0.0.1` e para a cópia restaurada `aquafuros_railway_restore_20261023_122217`; a produção não foi usada como alvo. Os pedidos abaixo foram GET autenticados, executados no kernel Laravel contra essa cópia, sem rede/browser, dentro de uma transacção revertida. A rota da lixeira foi excluída porque pode purgar registos expirados.

`RegistarAcesso` grava duração, tempo total de SQL e, desde 25/10/2026, quantidade de consultas por pedido. `/dev/analise?aba=lentidao` agrupa os últimos sete dias por rota normalizada e apresenta média, p95, máximo, média de BD e média/p95 de consultas. `pg_stat_statements` não está activa nesta cópia. O contador usa o query log existente, limpa-o no início/fim do pedido e não persiste SQL nem bindings.

### Medição local antes/depois

Foram executados cinco GET por rota antes e depois das optimizações, com utilizador administrador e os mesmos dados locais. A mediana e o número de consultas foram:

| Rota | Antes: mediana / consultas | Depois: mediana / consultas | Redução de consultas |
| --- | ---: | ---: | ---: |
| `GET /leituras` | 167 ms / 18 | 172 ms / 16 | sem optimização específica; desempenho semelhante |
| `GET /facturas` | 352 ms / 91 | 177 ms / 18 | 80% |
| `GET /pagamentos` | 816 ms / 136 | 413 ms / 18 | 87% |
| `GET /admin/dashboard` | 344 ms / 92 | 296 ms / 65 | 29% |
| `GET /admin/kpis` | 1 006 ms / 222 | 781 ms / 181 | 18% |

Cada medição é uma amostra pequena; não representa p95 de produção. As durações não incluem rede nem navegador. O histórico de acessos já existente na cópia continha 907 pedidos nos sete dias: p95 registado de 38 032 ms em `/admin/dashboard` e 24 766 ms em `/leituras`, com médias de BD próximas da duração total. Estes valores históricos são anteriores às optimizações e devem ser reavaliados após deployment.

Gargalos confirmados e tratados:

- `GET /pagamentos`: 118 consultas individuais a `pagamentos_aplicados` para facturas em aberto; pagamentos agora são eager-loaded em lote.
- `GET /facturas`: consultas de leitura/factura anterior, existência de leituras, cliente e origens eram repetidas por cada uma das 15 facturas. O histórico é agora calculado em lote e as origens são eager-loaded.
- `GET /admin/kpis`: 40 buscas individuais pelas três leituras anteriores; uma consulta com `ROW_NUMBER()` obtém as três por cliente.
- `GET /admin/dashboard`: os resumos para o mês actual e os seis meses do gráfico foram reduzidos a duas agregações SQL por série.

P2-02 concluído na cópia local: gargalos medidos, optimizados e comparados. A recolha contínua no deployment só mostrará a contagem de consultas depois da migration `2026_10_25_000001_add_consultas_to_acessos_sistema.php` ser aplicada.

### Rotas a medir numa cópia isolada

Começar pelas páginas que combinam paginação, agregações mensais e relações:

- `GET /leituras` — grupos de clientes, ordenação pelo consumo, leituras do período, resumo mensal e lista para registar leituras.
- `GET /facturas` — lista paginada, relações com cliente/leitura/pagamentos, filtros e totais.
- `GET /pagamentos` — lista, imputações, resumo de cobranças e facturas em aberto.
- `GET /admin/dashboard` e `GET /admin/kpis` — vários agregados e séries por período.

Esta lista foi medida na cópia local; os resultados antes/depois estão acima. Voltar a verificar no deployment depois de aplicar a migration e recolher tráfego novo.

### Procedimento para obter evidência

1. Restaurar um backup numa base PostgreSQL isolada ou apontar para um deployment de staging com volume de dados representativo. Confirmar que `DB_HOST`/`DATABASE_URL` não apontam para produção antes de abrir a app.
2. Recolher por rota e perfil de utilizador o tempo total do pedido, quantidade de queries SQL, tempo total em SQL e as queries mais lentas. Repetir depois de aquecer cache; guardar pelo menos mediana e p95 com tamanho da página e volume de dados.
3. Investigar N+1 apenas quando a quantidade de queries crescer com o número de linhas; optimizar somente as relações ou agregações que aparecerem na medição.
4. Repetir exactamente o mesmo cenário após a alteração e comparar latência, contagem de queries e resultado funcional.

O middleware usa `DB::enableQueryLog()` em cada pedido autenticado, soma os tempos e conta as entradas antes de desligar o log. O log é esvaziado no início e no fim de cada pedido para evitar acumulação em workers de longa duração. Não são guardados SQL, bindings ou dados pessoais das consultas.

## P3-01 — Inventário antes de remover código

### Cobertura verificada

- `php artisan route:list --json`: 176 rotas e 48 controllers concretos (49 ficheiros contando a classe base `Controller.php`); todos os controllers concretos têm pelo menos uma acção registada directamente numa rota.
- Inertia resolve páginas com `import.meta.glob("./Pages/**/*.jsx")` em `resources/js/app.js`; o resolvedor é dinâmico. Uma busca estática por imports não é evidência suficiente para remover uma página.
- `php artisan list --raw` confirma que os cinco comandos da aplicação estão registados: `facturas:corrigir-divida-anterior`, `emails:estado`, `notificacoes:gerar`, `leituras:primeira-anterior-zero` e `clientes:preencher-leitura-inicial-zero`.
- Há listeners do scheduler em `AppServiceProvider` e tarefas em `routes/console.php`; eventos/framework e agendamentos foram considerados na busca.
- Foram encontrados 52 ficheiros de migration. Nenhum foi candidato a remoção; o histórico de migrations deve ser preservado.

### Candidatos estáticos, ainda sem remoção

| Candidato | Evidência encontrada | Confiança e cuidado |
| --- | --- | --- |
| `app/Http/Middleware/EnsureRole.php` | Sem referências nem alias de middleware; `handle()` apenas chama `$next`. As rotas usam o middleware de papéis do Spatie. | Forte candidato sem uso; confirmar que não há configuração externa antes de remover. |
| `resources/js/Components/PagamentoMultiplo.jsx` | Só ocorre na própria declaração. O fluxo actual usa `RegistarPagamento` directamente. | Forte candidato sem uso; confirmar que não há consumidor externo. |
| `resources/js/Components/PeriodoFiltro.jsx` | Só ocorre na própria declaração; nenhuma importação encontrada. | Forte candidato sem uso; confirmar que não há consumidor externo. |

### Imports a rever manualmente

O scan textual encontrou possíveis imports não utilizados. A lista é uma pista: comentários, aliases e sintaxe dinâmica podem produzir falsos positivos. Não foram removidos.

**JavaScript/JSX:** `Settings` em `Layouts/AdminLayout.jsx`; `Banknote` em `Pages/Caixa/Dashboard.jsx`; `IconLink` e `formatVolume` em `Pages/Clientes/Index.jsx`; `AlertTriangle` em `Pages/Cobranca/Index.jsx`; `cn` em `Pages/Dev/Dados.jsx`; `XCircle` em `Pages/Dev/Saude.jsx`; `itemVariants` e `listVariants` em `Pages/Gestor/Dashboard.jsx`; `Link` em `Pages/Ocorrencias/Index.jsx`; `cn` em `Pages/Tarifas/Index.jsx`.

**PHP:** `Cliente` e `Carbon` em `CreditoController.php`; `NumeracaoDocumentos` e `Configuracao` em `FacturaController.php`; `Factura` e `Pagamento` em `GestorDashboardController.php`; `Role` em `UserController.php`; `Envelope` em `GmailTransport.php`; `Eventos` em `Funcionalidade.php`; `DB` em `ImputacaoPagamento.php`.

**Variáveis locais (scan heurístico):** `estadoLabels` em `Components/print/FacturaTermica58mm.jsx`; `totalDocumentos` e `seccaoMaisUsada` em `Pages/Dev/Painel.jsx`. Nenhuma variável PHP apareceu como atribuição sem outro uso no scan simples.

### Conclusão

P3-01 concluído como inventário, sem apagar código. Os três candidatos estáticos, os imports e as variáveis devem ser revistos numa tarefa de limpeza separada, com remoção pequena e validação de referências. P2-02 foi concluído em 25/10/2026 na cópia PostgreSQL isolada; a medição em deployment continua como acompanhamento após migration e tráfego novo.
