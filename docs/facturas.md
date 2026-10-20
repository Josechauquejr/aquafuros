# Impressão de facturas

Os modelos individual A4 e compacto em lotes usam os dados de EmpresaPerfil.
Os números e titulares de M-Pesa e E-Mola são editáveis em
`/dev/configuracoes`, no formulário Dados da empresa. Campos sem número não
aparecem no documento. A migração de 22/10 preserva as contas anteriormente
publicadas nos templates.

Os documentos apresentam valores em MT, com duas casas decimais. A tabela
financeira dos modelos compactos discrimina consumo, saldo anterior,
penalizações, ajustamentos e pagamentos posteriores. Um único bloco destaca
o total actual. Os pagamentos registados
são descontados do montante a pagar, sem modificar o total facturado.
Penalizações previstas continuam informativas até serem confirmadas.

Na impressão em lote, o sistema mede a altura dos módulos e coloca até três
por página. Módulos maiores passam à página seguinte; se excederem a altura
útil, usam o formato individual. A prévia e o download partilham a paginação.
O texto financeiro compacto usa 9,5 pt e os textos auxiliares pelo menos
8 pt, sem reduzir a tipografia para forçar três facturas por folha.

As origens da dívida usam o mês e o ano dos registos de facturação. Até
três origens aparecem integralmente no módulo compacto. Históricos maiores
mostram duas origens e o total das restantes, com anexos A4 de até dez
origens por folha. Os anexos identificam a factura, o cliente e o QR
individual. Os seus saldos já estão incluídos no documento principal.

O QR do browser é gerado por qrcode.react. O PDF produzido no servidor usa
o mesmo pacote através de `node scripts/factura-qr.mjs`, sem chamadas externas.
O servidor deve ter Node no PATH e as dependências npm instaladas. Se o
codificador estiver indisponível, o PDF mantém o link assinado de verificação.

Verificação local:

```sh
node tests/js/facturaDocumento.test.mjs
php artisan test --filter=FacturaDocumentoTest
npm run build
```

## Saldos e pagamentos por factura de origem

Desde a migração de 23/10, `facturas.total_pagar` contém apenas os encargos
próprios da factura. A emissão seguinte não encerra as anteriores. A relação
`factura_saldos` identifica as facturas anteriores apresentadas no documento.
`emissao_original` conserva os valores da emissão, incluindo o saldo acumulado
então apresentado. A consulta mostra esse total, os pagamentos posteriores,
os ajustamentos posteriores e o saldo actual das origens ainda em aberto.

`pagamentos` conserva o dinheiro recebido, o número e a referência original de
cada recibo. `pagamento_imputacoes` discrimina o principal e a multa pagos em
cada factura. A vista de leitura `pagamentos_aplicados`, usada pela relação
`Factura::pagamentos()`, expõe apenas a parcela aplicada àquela factura. Os
totais de caixa continuam a usar os recibos originais, evitando contar o mesmo
pagamento várias vezes.

Nos pagamentos individuais e múltiplos, a multa aplicável faz sempre parte
do saldo a pagar. O operador escolhe as facturas a liquidar; não existe uma
opção para excluir a multa. O principal é liquidado antes da multa dentro de
cada factura. As penalizações continuam ligadas à factura de origem, sem
gerar outra penalização sobre elas.

O formulário único «Registar pagamento» pesquisa clientes e mostra a dívida
total com multas. O operador selecciona uma, várias ou todas as facturas
do cliente. A revisão discrimina a aplicação por factura e o saldo restante
do cliente. Crédito disponível e excesso guardado como crédito funcionam
nos dois casos; os recibos continuam associados às facturas de origem.

A reconciliação dos recibos antigos mantém a regra histórica: primeiro os
principais, por antiguidade, depois as multas. Os números, valores e
referências dos recibos não são alterados. O processo compara o saldo de cada
cliente antes e depois e reverte a transacção se houver diferença. As
fotografias das emissões e as imputações reconciliadas ficam guardadas.

Nos documentos antigos sem lista dos pagamentos já considerados na emissão,
recibos e facturas importados podem partilhar a mesma data/hora. A consulta
usa o saldo anterior preservado e os valores das origens para separar os
pagamentos anteriores nesses empates. Um pagamento já abatido no saldo de
abertura não é novamente apresentado como pagamento posterior. Os recibos
originais e as suas imputações permanecem inalterados.

Estornos e reposições recalculam todas as facturas afectadas. Uma reposição
que excederia os saldos actuais é recusada. As migrações financeiras não têm
reversão automática que possa eliminar esse rasto.

```sh
php artisan test --filter=FacturasOrigemTest
```
