# Aquafuros — Guião de Desenvolvimento

Sistema de gestão de furos de água para uso interno.
Stack: **Laravel 13 + PostgreSQL + Spatie Permission + Laravel Breeze**

---

## Fase 1 — Configuração do Ambiente

### Problema resolvido: driver PostgreSQL em falta

O PHP do terminal (Herd Lite PHP 8.4 NTS) não tinha o driver `pdo_pgsql`.
Solução: usar o PHP do Laragon (8.3 ZTS) que já tem o driver.

**Passo 1 — Activar extensões no php.ini do Laragon**

Ficheiro: `D:\Projects\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.ini`

Linhas descomentadas:
```ini
extension=pdo_pgsql
extension=pgsql
extension=zip
```

**Passo 2 — Adicionar o PHP do Laragon ao PATH do sistema (permanente)**

```powershell
[System.Environment]::SetEnvironmentVariable(
  "PATH",
  "D:\Projects\laragon\bin\php\php-8.3.30-Win32-vs16-x64;" + $env:PATH,
  "User"
)
```

Reiniciar o VS Code após esta alteração para o PATH ter efeito.

**Verificação da ligação à base de dados**

```bash
php artisan db:show
```

Resultado esperado: PostgreSQL 18.x, base de dados `aquafuros_database`.

---

## Fase 2 — Modelagem da Base de Dados

### Tabela `users` (modificada)

Ficheiro: `database/migrations/0001_01_01_000000_create_users_table.php`

Campos adicionados em relação ao padrão Laravel:
- `username` — login por username em vez de email
- `telefone`
- `is_active`
- `remember_token` — necessário para sessões

Campos removidos em relação ao padrão:
- `email_verified_at` — sistema interno, sem verificação de email

### Tabelas do negócio

Ficheiro: `database/migrations/2026_05_26_220258_modelagem_base_de_dados.php`

Tabelas criadas (por ordem de dependência):

| Tabela | Descrição |
|--------|-----------|
| `tarifas` | Planos de preços (preço/m³, taxa mínima, consumo mínimo, multa) |
| `clientes` | Clientes do furo (com SoftDelete) |
| `leituras` | Leituras mensais do contador por cliente |
| `facturas` | Facturas geradas por mês (FAT-2026-0001) |
| `pagamentos` | Pagamentos registados (REC-2026-0001) |
| `dividas` | Saldo de dívida por cliente (um registo por cliente) |

**Correcção aplicada:** `year()` substituído por `smallInteger()->unsigned()` em `leituras` e `facturas` — o PostgreSQL não tem tipo YEAR nativo.

**Correr migrations:**

```bash
php artisan migrate
```

---

## Fase 3 — Models

Todos os models criados em `app/Models/`.

### Relações definidas

| Model | Relações |
|-------|---------|
| `User` | hasMany Leitura, Factura, Pagamento |
| `Tarifa` | hasMany Cliente |
| `Cliente` | belongsTo Tarifa · hasMany Leitura, Factura, Pagamento · hasOne Divida |
| `Leitura` | belongsTo Cliente, User · hasOne Factura |
| `Factura` | belongsTo Cliente, Leitura, User · hasMany Pagamento |
| `Pagamento` | belongsTo Factura, Cliente, User |
| `Divida` | belongsTo Cliente |

### Detalhe do User model

```php
use HasFactory, Notifiable, HasRoles;

protected $fillable = ['name', 'username', 'email', 'telefone', 'password', 'is_active'];
protected $hidden   = ['password', 'remember_token'];
```

---

## Fase 4 — Controllers

Criados com o flag `--resource` (7 métodos REST por controller):

```bash
php artisan make:controller ClienteController --resource
php artisan make:controller FacturaController --resource
php artisan make:controller LeituraController --resource
php artisan make:controller PagamentoController --resource
php artisan make:controller UserController --resource
php artisan make:controller TarifaController --resource
```

Cada controller tem TODOs em português a descrever o que implementar em cada método.

| Método | HTTP | Acção |
|--------|------|-------|
| `index` | GET | Listar com paginação e filtros |
| `create` | GET | Mostrar formulário de criação |
| `store` | POST | Validar e guardar |
| `show` | GET | Ver detalhe de um registo |
| `edit` | GET | Mostrar formulário de edição |
| `update` | PUT/PATCH | Validar e actualizar |
| `destroy` | DELETE | Remover ou anular |

---

## Fase 5 — Autenticação (Laravel Breeze)

### Instalação

```bash
composer require laravel/breeze
php artisan breeze:install blade
npm install
npm run dev
```

### Alteração: login por username em vez de email

Ficheiro alterado: `app/Http/Requests/Auth/LoginRequest.php`

```php
// rules() — validação
'username' => ['required', 'string'],
'password' => ['required', 'string'],

// authenticate() — verificação na BD
Auth::attempt($this->only('username', 'password'), ...)

// throttleKey() — anti-brute force por username
Str::lower($this->string('username')) . '|' . $this->ip()
```

### Configuração adicional

- Middleware `verified` removido do dashboard (sem verificação de email)
- Rotas de registo público removidas de `routes/auth.php`

---

## Fase 6 — Controlo de Acesso por Roles (Spatie)

### Instalação

```bash
# Activar ext-zip no php.ini antes deste passo
composer require spatie/laravel-permission
php artisan vendor:publish --provider="Spatie\Permission\PermissionServiceProvider"
php artisan migrate
```

### Roles do sistema

Ficheiro: `database/seeders/RoleSeeder.php`

```bash
php artisan make:seeder RoleSeeder
php artisan db:seed --class=RoleSeeder
```

Roles criados:

| Role | Acesso |
|------|--------|
| `administrador` | Acesso total |
| `gestor` | Clientes, facturas, pagamentos, leituras |
| `caixa` | Apenas pagamentos |
| `tecnico` | Apenas leituras |

### Atribuir role a utilizador (via Tinker)

```bash
php artisan tinker
>>> $user = App\Models\User::first();
>>> $user->assignRole('administrador');
```

---

## Fase 7 — Rotas com Controlo por Role

Ficheiro: `routes/web.php`

```php
// Apenas administrador
Route::middleware(['auth', 'role:administrador'])->group(function () {
    Route::resource('users', UserController::class);
    Route::resource('tarifas', TarifaController::class);
});

// Administrador e Gestor
Route::middleware(['auth', 'role:administrador|gestor'])->group(function () {
    Route::resource('clientes', ClienteController::class);
    Route::resource('facturas', FacturaController::class);
});

// Caixa
Route::middleware(['auth', 'role:administrador|gestor|caixa'])->group(function () {
    Route::resource('pagamentos', PagamentoController::class);
});

// Técnico
Route::middleware(['auth', 'role:administrador|gestor|tecnico'])->group(function () {
    Route::resource('leituras', LeituraController::class);
});
```

---

## Fase 8 — BillingService (Cálculo de Facturas)

### Criação do ficheiro

Sem comando artisan — criado manualmente:

```
app/Services/BillingService.php
```

### Lógica de cálculo implementada

Ficheiro: `app/Services/BillingService.php`

O serviço recebe uma `Leitura` e um `Cliente` (com `tarifa` e `divida` carregados) e devolve um array com todos os valores necessários para criar a factura.

**Métodos privados:**

| Método | O que calcula |
|--------|--------------|
| `calcularConsumo()` | `leitura_actual - leitura_anterior` |
| `calcularValorConsumo()` | Se consumo ≤ consumo_minimo → taxa_minima; senão → consumo × preco_m3 |
| `calcularDividaAnterior()` | Vai buscar `dividas.valor_divida` do cliente (ou 0 se não existir) |
| `calcularMulta()` | Se dívida ≥ limiar_corte → dívida × percentagem_multa; senão → 0 |
| `calcularTotalPagar()` | valor_consumo + divida_anterior + multa |

**Método público:**

```php
public function calcular(Leitura $leitura, Cliente $cliente): array
```

Devolve:
```php
[
    'valor_consumo'   => float,
    'divida_anterior' => float,
    'multa'           => float,
    'total_a_pagar'   => float,
]
```

### Integração no FacturaController

Ficheiro alterado: `app/Http/Controllers/FacturaController.php`

```php
use App\Services\BillingService;
use App\Models\Leitura;
use App\Models\Cliente;

public function store(Request $request)
{
    $leitura = Leitura::findOrFail($request->leitura_id);
    $cliente = Cliente::with('tarifa', 'divida')->findOrFail($leitura->cliente_id);

    $factura = app(BillingService::class)->calcular($leitura, $cliente);
    // $factura['valor_consumo'], $factura['multa'], $factura['total_a_pagar'], ...
}
```

---

## Estado Actual

| Componente | Estado |
|-----------|--------|
| Ligação PostgreSQL | Funcional |
| Migrations | Criadas (correr `php artisan migrate`) |
| Models + Relações | Completos |
| Controllers (esqueleto + TODOs) | Completos |
| Autenticação Breeze (username) | Funcional |
| Roles Spatie | Instalados e configurados |
| Rotas por role | Configuradas |
| BillingService | Criado e integrado no FacturaController |

---

## Pendente

- [ ] Criar migration `add_username_to_users_table` e correr `php artisan migrate`
- [ ] Implementar lógica nos controllers (seguir os TODOs)
- [x] Criar `BillingService` para cálculo de facturas
- [ ] Criar views Blade para cada módulo (clientes, leituras, facturas, pagamentos)
- [ ] Criar `UserController` com gestão de utilizadores e atribuição de roles
- [ ] Configurar impressão de facturas/recibos em PDF (barryvdh/laravel-dompdf já instalado)
- [ ] Criar seeder do utilizador administrador inicial

---

## Pacotes Instalados

| Pacote | Finalidade |
|--------|-----------|
| `laravel/breeze` | Autenticação (login/logout) |
| `spatie/laravel-permission` | Controlo de acesso por roles |
| `spatie/laravel-activitylog` | Registo de actividade |
| `spatie/laravel-query-builder` | Filtros e ordenação em queries |
| `barryvdh/laravel-dompdf` | Geração de PDFs (facturas/recibos) |
| `maatwebsite/excel` | Exportação para Excel |
