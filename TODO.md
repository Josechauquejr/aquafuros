# TODO — Aquafuros

Lista de tudo o que falta implementar para o sistema funcionar a 100%.

---

## Correcções Urgentes (o sistema não funciona sem estas)

- [x] Criar migration `add_username_to_users_table` e correr `php artisan migrate`
- [x] Corrigir chave `total_a_pagar` → `total_pagar` no `BillingService` (não corresponde ao fillable do model)
- [x] Correr `php artisan db:seed --class=RoleSeeder` para criar os roles na BD
- [x] Atribuir role `administrador` ao utilizador admin via Tinker

---

## BillingService — Melhorias

- [x] Adicionar tipo de retorno `: float` no método `calcularMulta()`
- [x] Calcular consumo uma vez e reutilizar em `calcularValorConsumo()` (evitar dupla chamada)
- [x] Proteger contra consumo negativo: `max(0, leitura_actual - leitura_anterior)`
- [x] Arredondar todos os valores a 2 casas decimais antes de devolver (`round($valor, 2)`)

---

## Controllers — Implementar lógica

### ClienteController

- [ ] `index()` — listar com paginação + filtros (estado, bairro, nome)
- [ ] `create()` — buscar tarifas activas e passar à view
- [ ] `store()` — validar, criar cliente, criar registo de dívida inicial vazio
- [ ] `show()` — carregar tarifa, dívida, facturas, leituras recentes
- [ ] `edit()` — carregar cliente e tarifas
- [ ] `update()` — validar e actualizar
- [ ] `destroy()` — soft delete

### LeituraController

- [ ] `index()` — listar leituras do mês actual com paginação + filtros
- [ ] `create()` — buscar clientes activos, pré-seleccionar mês/ano actual
- [ ] `store()` — preencher `leitura_anterior` automaticamente, validar que actual >= anterior, registar `registado_por`
- [ ] `show()` — detalhe com factura associada
- [ ] `edit()` — bloquear se `confirmado = true`
- [ ] `update()` — bloquear se confirmado, recalcular factura se existir
- [ ] `destroy()` — bloquear se tiver factura associada ou estiver confirmada

### FacturaController

- [ ] Completar `store()` — validar, calcular via BillingService, gerar número sequencial (FAT-2026-0001), definir `gerada_por`, criar factura
- [ ] `index()` — listar com paginação + filtros (estado, mês, ano, cliente)
- [ ] `create()` — buscar clientes activos e leituras confirmadas sem factura no mês
- [ ] `show()` — carregar cliente, leitura, pagamentos (para impressão)
- [ ] `edit()` — bloquear se estado != 'pendente'
- [ ] `update()` — apenas estado pode ser alterado manualmente
- [ ] `destroy()` — mudar estado para 'anulada', nunca apagar

### PagamentoController

- [ ] `index()` — listar com paginação + filtros
- [ ] `create()` — buscar facturas pendente/parcial, pré-preencher valor
- [ ] `store()` — gerar número recibo (REC-2026-0001), actualizar estado da factura, recalcular dívida do cliente
- [ ] `show()` — vista do recibo imprimível
- [ ] `edit()` / `update()` — restringir a administradores, apenas campos não financeiros
- [ ] `destroy()` — estorno: reverter estado da factura, recalcular dívida (apenas admin)

### TarifaController

- [ ] `index()` — listar todas as tarifas
- [ ] `create()` / `store()` — criar nova tarifa
- [ ] `edit()` / `update()` — editar tarifa (não permitir editar se tiver clientes activos)
- [ ] `destroy()` — bloquear se tiver clientes associados

### UserController

- [ ] `index()` — listar utilizadores com o seu role
- [ ] `create()` / `store()` — criar utilizador com role atribuído
- [ ] `edit()` / `update()` — editar dados e role do utilizador
- [ ] `destroy()` — desactivar utilizador (`is_active = false`), não apagar

---

## Lógica de Negócio

- [ ] Criar helper para gerar números sequenciais de factura (FAT-ANO-XXXX)
- [ ] Criar helper para gerar números sequenciais de recibo (REC-ANO-XXXX)
- [ ] Actualizar estado da factura automaticamente após pagamento (pendente → parcial → paga)
- [ ] Recalcular `dividas.valor_divida` e `meses_atraso` após cada pagamento
- [ ] Implementar confirmação de leituras (`confirmado = true`) antes de gerar factura
- [ ] Registar actividade com `spatie/laravel-activitylog` (criação de facturas, pagamentos)

---

## Views Blade

### Layout e componentes base

- [ ] Layout principal com navegação lateral por role (`resources/views/layouts/app.blade.php`)
- [ ] Componente de alertas/flash messages (sucesso, erro, aviso)
- [ ] Dashboard com resumo (facturas pendentes, dívidas, leituras do mês)

### Clientes

- [ ] `resources/views/clientes/index.blade.php` — tabela com filtros e paginação
- [ ] `resources/views/clientes/create.blade.php` — formulário de criação
- [ ] `resources/views/clientes/edit.blade.php` — formulário de edição
- [ ] `resources/views/clientes/show.blade.php` — perfil com historial

### Leituras

- [ ] `resources/views/leituras/index.blade.php` — tabela com filtros
- [ ] `resources/views/leituras/create.blade.php` — formulário de registo
- [ ] `resources/views/leituras/show.blade.php` — detalhe

### Facturas

- [ ] `resources/views/facturas/index.blade.php` — tabela com filtros e estados
- [ ] `resources/views/facturas/create.blade.php` — formulário de geração
- [ ] `resources/views/facturas/show.blade.php` — detalhe + botão imprimir PDF

### Pagamentos

- [ ] `resources/views/pagamentos/index.blade.php` — tabela com filtros
- [ ] `resources/views/pagamentos/create.blade.php` — formulário de registo
- [ ] `resources/views/pagamentos/show.blade.php` — recibo imprimível

### Tarifas

- [ ] `resources/views/tarifas/index.blade.php`
- [ ] `resources/views/tarifas/create.blade.php`
- [ ] `resources/views/tarifas/edit.blade.php`

### Utilizadores

- [ ] `resources/views/users/index.blade.php` — lista com roles
- [ ] `resources/views/users/create.blade.php` — formulário com select de role
- [ ] `resources/views/users/edit.blade.php`

---

## PDF (barryvdh/laravel-dompdf)

- [ ] Template de factura em PDF (`resources/views/pdf/factura.blade.php`)
- [ ] Template de recibo em PDF (`resources/views/pdf/recibo.blade.php`)
- [ ] Rota/método no FacturaController para download do PDF
- [ ] Rota/método no PagamentoController para download do recibo

---

## Seeders e Dados Iniciais

- [ ] Criar seeder do utilizador administrador inicial (`AdminSeeder`)
- [ ] Criar tarifa padrão no seeder
- [ ] Registar `RoleSeeder` e `AdminSeeder` no `DatabaseSeeder`
- [ ] Registar `BillingService` como singleton no `AppServiceProvider`

---

## Testes Mínimos

- [ ] Testar login com username/password
- [ ] Testar acesso negado a rotas por role (ex: caixa não acede a clientes)
- [ ] Testar cálculo do BillingService com consumo abaixo e acima do mínimo
- [ ] Testar cálculo da multa com dívida acima e abaixo do limiar
- [ ] Testar fluxo completo: leitura → factura → pagamento → dívida actualizada
