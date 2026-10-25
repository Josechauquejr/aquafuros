<?php

use App\Http\Controllers\PagamentoController;
use App\Models\Factura;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

$accao = $argv[1] ?? '';
$utilizadorId = (int) ($argv[2] ?? 0);
$facturaId = (int) ($argv[3] ?? 0);
$valor = (float) ($argv[4] ?? 0);
$marker = $argv[5] ?? '';

putenv('APP_ENV=testing');
putenv('DB_CONNECTION=pgsql');
putenv('DB_DATABASE=aquafuros_p0_regression_test_20261023');
putenv('DB_URL=');

require dirname(__DIR__, 2).'/vendor/autoload.php';
$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

try {
    if (DB::connection()->getDriverName() !== 'pgsql'
        || DB::connection()->selectOne('select current_database() as name')->name !== 'aquafuros_p0_regression_test_20261023') {
        throw new RuntimeException('Worker ligado fora da base PostgreSQL isolada.');
    }

    $utilizador = User::findOrFail($utilizadorId);
    $url = $accao === 'close' ? '/pagamentos/fecho-caixa/confirmar' : '/pagamentos';
    $dados = $accao === 'close'
        ? ['valor_contado' => $valor]
        : ['factura_id' => $facturaId, 'valor_pago' => $valor, 'metodo_pagamento' => 'dinheiro'];
    $request = Request::create($url, 'POST', $dados, server: ['HTTP_REFERER' => 'http://localhost/pagamentos']);
    $request->setUserResolver(fn () => $utilizador);

    if ($marker === '' || file_put_contents($marker, "READY\n") === false) {
        throw new RuntimeException('Nao foi possivel sinalizar o inicio do processo concorrente.');
    }

    $controller = app(PagamentoController::class);
    $response = $accao === 'close'
        ? $controller->confirmarFecho($request)
        : $controller->store($request);

    echo 'DONE TARGET='.$response->getTargetUrl()."\n";
} catch (Throwable $erro) {
    if ($erro instanceof ValidationException && $accao === 'payment') {
        echo "DONE REJECTED\n";
        exit(0);
    }
    fwrite(STDERR, get_class($erro).': '.$erro->getMessage()."\n");
    exit(1);
}
