<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Prepara a entrada em produção: apaga todo o movimento (leituras, facturas,
 * pagamentos e tudo o que deles depende) e deixa só os clientes, sem leitura
 * inicial. Mantém zonas, tarifas, utilizadores, configurações, perfil da
 * empresa e a numeração dos clientes (CLI-xxxx). Por omissão só mostra o que
 * seria apagado; com --aplicar apaga tudo numa única transacção.
 */
class RecomecarSistema extends Command
{
    protected $signature = 'sistema:recomecar
        {--aplicar : Apaga de facto (sem isto só mostra as contagens)}
        {--force : Não pede confirmação (para correr no servidor sem terminal interactivo)}';

    protected $description = 'Apaga leituras, facturas, pagamentos e movimento associado, deixando só os clientes (sem leitura inicial)';

    /** Ordem de eliminação: dependentes primeiro (as chaves estrangeiras bloqueiam o contrário). */
    private const TABELAS = [
        'pagamento_imputacoes' => 'Imputações de pagamentos',
        'factura_saldos' => 'Saldos transferidos entre facturas',
        'acertos_leitura' => 'Acertos de leituras estimadas',
        'leitura_correccoes' => 'Correcções de leituras',
        'ajustes_leitura' => 'Ajustes de leituras',
        'envios_email' => 'Emails enviados a clientes',
        'notificacoes' => 'Notificações a clientes',
        'promessas_pagamento' => 'Promessas de pagamento',
        'contactos_cobranca' => 'Contactos de cobrança',
        'creditos' => 'Créditos / adiantamentos',
        'pagamentos' => 'Pagamentos (recibos)',
        'facturas' => 'Facturas',
        'leituras' => 'Leituras',
        'leituras_estimadas' => 'Leituras estimadas',
        'fechos_caixa' => 'Fechos de caixa',
        'ocorrencias' => 'Ocorrências',
        'producoes_agua' => 'Produção de água',
    ];

    /** Histórico de actividade destes registos (deixaria de apontar para nada). */
    private const MODELOS = [
        \App\Models\AcertoLeitura::class, \App\Models\AjusteLeitura::class, \App\Models\ContactoCobranca::class,
        \App\Models\Credito::class, \App\Models\EnvioEmail::class, \App\Models\Factura::class,
        \App\Models\FechoCaixa::class, \App\Models\Leitura::class, \App\Models\LeituraCorreccao::class,
        \App\Models\LeituraEstimada::class, \App\Models\Notificacao::class, \App\Models\Ocorrencia::class,
        \App\Models\Pagamento::class, \App\Models\PagamentoImputacao::class, \App\Models\ProducaoAgua::class,
        \App\Models\PromessaPagamento::class,
    ];

    /** A sequência dos números de cliente continua; as restantes recomeçam do 1. */
    private const NUMERACAO_MANTIDA = 'CLI';

    public function handle(): int
    {
        $tabelas = array_filter(self::TABELAS, fn ($t) => Schema::hasTable($t), ARRAY_FILTER_USE_KEY);

        $linhas = [];
        foreach ($tabelas as $tabela => $rotulo) {
            $linhas[] = [$rotulo, DB::table($tabela)->count()];
        }
        $linhas[] = ['Numerações de documentos (recomeçam do 1)', DB::table('numeracoes_documentos')->where('chave', '!=', self::NUMERACAO_MANTIDA)->count()];
        $linhas[] = ['Histórico de actividade destes registos', DB::table('activity_log')->whereIn('subject_type', self::MODELOS)->count()];
        $linhas[] = ['Clientes com leitura inicial (fica vazia)', DB::table('clientes')->whereNotNull('leitura_inicial')->count()];

        $this->info('Base de dados: '.DB::connection()->getDatabaseName().' ('.DB::getDriverName().')');
        $this->table(['O que será apagado', 'Registos'], $linhas);
        $this->line('Ficam: '.DB::table('clientes')->count().' cliente(s), zonas, tarifas, utilizadores e configurações.');

        if (! $this->option('aplicar')) {
            $this->comment('Nada foi alterado. Use --aplicar para apagar.');

            return self::SUCCESS;
        }

        if (! $this->option('force') && $this->ask('Isto não se pode desfazer. Escreva RECOMECAR para continuar') !== 'RECOMECAR') {
            $this->warn('Cancelado. Nada foi alterado.');

            return self::FAILURE;
        }

        DB::transaction(function () use ($tabelas) {
            // Reversões apontam para o ajuste revertido com RESTRICT; no
            // Postgres um DELETE em massa falharia sem soltar esta ligação.
            if (isset($tabelas['ajustes_leitura']) && Schema::hasColumn('ajustes_leitura', 'ajuste_revertido_id')) {
                DB::table('ajustes_leitura')->update(['ajuste_revertido_id' => null]);
            }

            foreach (array_keys($tabelas) as $tabela) {
                DB::table($tabela)->delete();
            }

            DB::table('numeracoes_documentos')->where('chave', '!=', self::NUMERACAO_MANTIDA)->delete();
            DB::table('activity_log')->whereIn('subject_type', self::MODELOS)->delete();
            DB::table('clientes')->update(['leitura_inicial' => null]);
        });

        // Painéis e contagens guardados em cache mostrariam os valores antigos.
        Cache::flush();

        $this->info('Concluído. O sistema ficou só com os clientes, sem leituras, facturas nem pagamentos.');

        return self::SUCCESS;
    }
}
