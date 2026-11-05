# Roteiro local de testes de usabilidade

## Ambiente seguro

- URL local: `http://127.0.0.1:8011/login`
- Base de dados: SQLite descartavel em `%TEMP%\aquafuros-ux-audit.sqlite`; separada da base PostgreSQL auditada.
- Dataset: ficticio, criado pelos seeders locais; 10 clientes e 20 facturas.
- Utilizador e senha de teste: cada nome de utilizador abaixo usa a senha `password`. Usar apenas neste servidor local.
- Para repetir um fluxo com estado inicial limpo, recriar apenas esta base descartavel com `DB_CONNECTION=sqlite`, `DB_DATABASE=<ficheiro em %TEMP%>` e `php artisan migrate:fresh --seed --force`.

| Perfil | Utilizador local | Tarefa observada |
|---|---|---|
| Administrador | `admin` | No painel, localizar uma factura vencida e explicar qual cliente e valor exigem atencao. Abrir o registo relacionado. |
| Gestor | `graca.simbine` | Encontrar um cliente com divida em atraso e identificar a proxima acao operacional oferecida pela interface. |
| Caixa | `celia.machel` | Localizar uma factura em aberto, dizer o montante a cobrar e onde faria o fecho de caixa; nao confirmar pagamento durante a observacao inicial. |
| Tecnico | `sergio.nhaca` | Encontrar uma leitura por confirmar ou cliente por visitar e descrever como registaria/confirmaria a leitura. |
| Desenvolvedor | `dev` | Verificar saude do sistema, localizar o pulso do scheduler e abrir a checklist de tarefas sem executar operacoes destrutivas. |

## Registo do observador

Para cada tarefa, anotar: codigo anonimo do participante, perfil, hora de inicio/fim, conclusao (sim/nao), passos/interaccoes relevantes, erros/recuperacoes, pedidos de ajuda e uma nota sobre o que causou hesitacao. Registar tempos em segundos. Nao recolher nomes reais, conteudo de formularios, passwords, dados financeiros pessoais ou gravacao de ecra sem consentimento especifico.

No fim de cada tarefa, perguntar: "O que esperava encontrar?", "Que informacao foi dificil de interpretar?" e "Quao confiante ficou na proxima acao?" (1 a 5). Nao sugerir respostas durante a tarefa. Com pelo menos 5 participantes por tarefa, reportar mediana e percentis; com amostras menores, mostrar resultados individuais anonimizados e nao inferir taxa estavel.

## Acessibilidade manual

Em cada perfil, repetir navegacao principal com teclado apenas (Tab, Shift+Tab, Enter, Espaco, Escape), verificar link de salto, foco visivel, ordem de leitura, nomes de botoes e recuperacao de erros. Repetir com zoom 200% e viewport estreito. Leitor de ecras deve ser testado por pessoa que use tecnologia assistiva ou por avaliador qualificado. Registar browser, sistema, viewport, zoom e tecnologia assistiva, se usada.

Este roteiro mede uma amostra de tarefas; nao substitui a avaliacao pagina a pagina nem certifica WCAG 2.2 AA.