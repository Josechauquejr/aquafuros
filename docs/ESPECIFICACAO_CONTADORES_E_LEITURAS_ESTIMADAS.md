# Especificação P4-01 — Ciclo do contador e leituras estimadas

Data: 25/10/2026  
Fase: 5 — P4-01 implementado localmente em 25/10/2026 (estimativas e reconciliação financeira).

## Objectivo

Definir como registar a vida de um contador, como distinguir leituras estimadas de leituras reais e como acertar o consumo quando uma leitura real voltar a estar disponível. A especificação protege a sequência do contador, o histórico de facturas e os pagamentos já recebidos.

## Estado actual observado

- O cliente guarda `leitura_inicial`; a leitura mensal guarda `leitura_anterior`, `leitura_actual` e confirmação.
- A abertura aparece separada das leituras facturáveis e pode ser alterada com pré-visualização e auditoria.
- Ajustes retroactivos recalculam a sequência e facturas elegíveis. Facturas pagas, parciais ou anuladas bloqueiam alterações que não possam ser aplicadas com segurança.
- O modelo não identifica um contador, uma troca/avaria, nem se uma leitura é estimada. Também não guarda um ciclo de estimativas a reconciliar.
- Os KPIs já detectam consumo anormal comparando com as três leituras anteriores. Esta análise deve ser reutilizada; não é necessário criar uma segunda regra de alerta nesta fase.

## Âmbito proposto para a Fase 5

1. Manter um contador activo por cliente, com histórico de contadores substituídos. Um cliente com vários contadores activos e o histórico de titularidade ficam para P4-02.
2. Registar instalação, leitura de abertura, retirada, avaria e substituição, sempre com autor, data, motivo e evidência opcional.
3. Marcar cada período como leitura real ou estimada e preservar a origem e quem a registou.
4. Definir o algoritmo de estimativa e o acerto posterior, sem reescrever silenciosamente documentos emitidos.
5. Reutilizar a detecção de anomalias já existente e associar alertas ao contador activo.

## Regras do ciclo do contador

### Instalação

- Criar o contador com número de série, modelo quando conhecido, data de instalação e estado `activo`.
- Registar a leitura de abertura como referência. A abertura não representa consumo mensal e não gera factura nem pagamento.
- Para contador novo, a abertura pode ser zero. Para contador usado, registar o número visível no momento da instalação.
- A primeira leitura real do período calcula consumo a partir dessa abertura, mantendo as regras actuais de consumo.

### Troca, retirada ou avaria

- Encerrar o contador anterior com data, leitura final quando disponível, motivo e autor. O histórico desse contador fica imutável depois da troca.
- Abrir o contador novo com uma leitura inicial própria. Nunca subtrair o valor do contador antigo ao valor do contador novo.
- Se ambos os valores de fronteira forem conhecidos, o consumo do período é a soma dos segmentos: leitura final do contador antigo menos a sua leitura anterior, mais leitura do contador novo menos a sua abertura.
- Se o contador avariado não fornecer uma leitura final, registar o intervalo como estimado. A estimativa fica associada ao contador retirado e pode ser acertada quando houver evidência suficiente.
- Uma leitura menor que a anterior no mesmo contador não é aceite como consumo negativo. Deve ser corrigida com auditoria ou explicada por um evento de troca/reset do contador.

### Leitura real

- Guardar o valor do visor, data da leitura, contador, autor e confirmação.
- Validar a monotonia dentro do mesmo contador. O novo contador começa a sua própria sequência a partir da abertura.
- Leituras retroactivas continuam sujeitas às regras existentes: caber entre a leitura anterior e a seguinte; pré-visualizar alterações; recalcular apenas facturas sem pagamentos; bloquear alterações a facturas pagas, parciais ou anuladas.

## Regras de leitura estimada

- Uma estimativa regista consumo estimado em m³ para o período; não inventa nem grava esse valor como leitura real do visor.
- Deve conter contador e período, valor estimado, método de cálculo, autor, data, motivo e, quando aplicável, referência à última leitura real.
- A estimativa não altera a última leitura real de referência. Estimativas consecutivas são acumuladas até à próxima leitura real.
- A leitura estimada é apresentada com indicação visível `Estimada`; não pode ser confundida com leitura confirmada do contador.
- O cálculo recomendado usa a média dos três últimos consumos reais válidos do mesmo contador. Se não houver três períodos, mostrar a base disponível e exigir confirmação do supervisor; uma estimativa manual exige motivo.
- Não estimar automaticamente quando houve troca/avaria sem uma referência confiável, quando o consumo anterior é nulo/atípico, ou quando a ordem temporal do contador é inconsistente. Nestes casos exigir valor manual aprovado ou manter o período pendente.

## Algoritmo de reconciliação

Para um ciclo sem troca de contador:

1. `R0` é a última leitura real confirmada antes do ciclo estimado.
2. `E1...En` são os consumos estimados já facturados depois de `R0`.
3. `R1` é a próxima leitura real confirmada. O consumo medido acumulado é `A = R1 - R0`.
4. O consumo já facturado por estimativa é `S = soma(E1...En)`.
5. A diferença de acerto é `D = A - S`.
   - Se `D > 0`, há consumo adicional por facturar.
   - Se `D < 0`, foi facturado consumo a mais e existe crédito a reconhecer.
   - Se `D = 0`, não há acerto financeiro.
6. Fechar o ciclo de estimativa, gravar `R1` como nova referência real e auditar `R0`, `R1`, estimativas incluídas, `A`, `S`, `D`, autor e documentos associados. O mesmo ciclo não pode ser acertado duas vezes.

Numa troca de contador, o cálculo deve primeiro separar o consumo de cada contador entre os seus valores de fronteira. Só depois compara o total medido com as estimativas associadas a esses períodos.

Para converter o volume em valor sem modificar as facturas antigas, distribui-se `A` pelos meses estimados na proporção do consumo estimado de cada mês (`Ei / S`), calcula-se o valor de cada mês com a tarifa congelada na factura correspondente e compara-se a soma com o valor de consumo já facturado. O sinal de `D` decide se há cobrança adicional ou crédito; a prévia guarda os volumes, tarifas, facturas e pagamentos usados no cálculo.

## Protecção financeira

- Uma factura estimada pendente e sem pagamentos pode ser corrigida com pré-visualização e registo de auditoria, de acordo com o mecanismo existente de ajuste de leituras.
- Uma factura parcial, paga ou anulada nunca é reescrita pelo acerto. O sistema cria um movimento de ajuste separado, ligado ao ciclo estimado e à factura original.
- Um acerto positivo pode ser facturado como linha de ajuste identificável. Um acerto negativo deve criar crédito do cliente, preservando o valor e estado da factura original.
- O crédito não deve ser pago em dinheiro nem compensado automaticamente sem uma regra aprovada. Notas de crédito, reembolsos e tratamento fiscal pertencem a P4-03 e precisam de validação fiscal antes da implementação.
- Se uma factura do período actual estiver parcialmente paga, o ajuste é separado; nunca se altera o valor já liquidado nem se recalculam pagamentos.
- O utilizador deve ver uma pré-visualização com leituras, estimativas, facturas afectadas, pagamentos e valor final do acerto antes de confirmar.

## Auditoria e permissões

- Técnico pode registar leituras reais e estimadas e propor abertura/troca, com motivo obrigatório para estimativas manuais, avaria e correcções.
- Gestor ou administrador confirma estimativas e eventos de troca, conforme a política de permissões a fixar antes do desenvolvimento.
- Administrador pode corrigir dados históricos através de pré-visualização; alterações nunca apagam o valor anterior nem a trilha de auditoria.
- Registar autor, data, valores antes/depois, contador, motivo, estimativa utilizada e identificadores das facturas/ajustes.
- Fotografia do visor é evidência opcional para leitura real; definir limite, retenção e acesso antes de activar upload.

## Casos de aceitação para implementação

1. Instalar contador com abertura zero e emitir a primeira leitura sem facturar a abertura.
2. Instalar contador usado com abertura diferente de zero e calcular o primeiro consumo a partir dela.
3. Substituir contador: fechar sequência antiga, abrir sequência nova e somar correctamente os dois segmentos do período.
4. Registar estimativas em vários meses e reconciliar uma leitura real sem duplicar nem perder consumo.
5. O acerto positivo aumenta o valor devido sem alterar facturas já pagas.
6. O acerto negativo gera crédito rastreável sem reduzir ou apagar facturas pagas.
7. Factura parcial mantém o seu valor e pagamentos; o acerto aparece como movimento separado.
8. Repetir a confirmação do mesmo ciclo não gera um segundo ajuste.
9. Não aceitar leitura descendente no mesmo contador sem correcção auditada ou evento de substituição.
10. Pré-visualização mostra claramente leituras reais, estimadas, facturas afectadas e bloqueios financeiros.

## Decisões de negócio confirmadas

1. **Estimativa automática:** média dos três últimos consumos reais válidos do mesmo contador. Se ainda não houver três leituras reais, não extrapolar automaticamente; pedir estimativa manual com motivo e aprovação de um gestor ou administrador.
2. **Acerto positivo (`D > 0`):** manter as facturas emitidas e lançar o valor adicional na próxima factura disponível como linha de acerto identificada.
3. **Acerto negativo (`D < 0`):** manter as facturas emitidas e registar o valor como crédito do cliente, com ligação ao ciclo reconciliado. Não emitir reembolso nem compensar automaticamente nesta fase.
4. **Facturas pagas ou parciais:** permanecem imutáveis. O acerto é sempre um movimento separado, sem reimputar pagamentos existentes.
5. **Aprovação:** gestor ou administrador confirma estimativas e reconciliações; a fotografia é opcional. Estimativas manuais, avarias, resets e correcções exigem motivo.
6. **Reset sem substituição:** exige evento explícito auditado, com leitura de fronteira conhecida quando disponível; nunca aceitar uma leitura mensal descendente como se fosse consumo normal.

Estas decisões fecham a especificação funcional P4-01. O fluxo de estimativas e reconciliação foi implementado no código e a migration foi aplicada à cópia PostgreSQL local. As facturas antigas e os pagamentos não são reescritos. A gestão do ciclo físico do contador (instalação, retirada, avaria e substituição) ainda não foi construída; essa parte exige um plano próprio de migração do histórico e permanece pendente. Não foi feito deploy nem foram executados testes automatizados nesta etapa. P4-02 e P4-03 permanecem fora desta implementação.

## Fora desta fase

- Vários contadores activos por cliente, titularidade e mudança de cliente (P4-02).
- Nota de crédito formal, reembolso, caução e parcelamento (P4-03).
- Integrações, mensagens, modo offline e processo de deployment.
- Migração automática dos históricos existentes para contadores: requer plano de compatibilidade e ensaio numa cópia antes de produção.
