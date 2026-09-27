# 004 — Tabelas e listas: fade curto, sem stagger nem deslocamento

- **Status**: DONE (commit `83f1aa7`, branch `anima-melhorias`)
- **Commit**: aefe691
- **Severity**: HIGH
- **Category**: Purpose & frequency / Performance
- **Estimated scope**: 1 ficheiro (usado por ~16 páginas)

## Problema

`listVariants`/`itemVariants` são usados em ~16 páginas (Facturas, Pagamentos, Clientes, Leituras, Users, Tarifas, Logs, dashboards…). As linhas reentram (opacity + `y: 8`) com stagger de 35ms **sempre que os filtros/pesquisa/paginação mudam**. Com 50 linhas o stagger soma 1,75s; cada `motion.tr` anima `y` em JS na main thread. Filtrar é uma acção de dezenas de vezes por dia.

```js
// resources/js/lib/motion.js:4-12 — actual
export const listVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.035 } },
};

export const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } },
};
```

## Target

Só opacidade, 150ms, todas as linhas ao mesmo tempo (sem stagger). Os nomes exportados e a estrutura `hidden`/`show` mantêm-se para não editar as páginas.

```js
// target (manter o comentário de cabeçalho existente, actualizando-o para descrever "fade curto")
export const listVariants = {
    hidden: {},
    show: {},
};

export const itemVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.15, ease: [0.22, 1, 0.36, 1] } },
};
```

## Repo conventions to follow

- Este é o único ficheiro de variantes partilhadas; as páginas importam `listVariants`/`itemVariants` de `@/lib/motion`.

## Steps

1. Editar `resources/js/lib/motion.js` com o target. Actualizar o comentário do topo: "as linhas entram com um fade curto (150ms) ao carregar e quando os filtros mudam".

## Boundaries

- Não editar as páginas nem renomear exports.
- Não adicionar props `custom`/índices.
- Se o ficheiro não corresponder ao excerto (drift), PARAR e reportar.

## Verificação

- **Mecânica**: `npm run build` sem erros; `grep -rn "staggerChildren" resources/js` não devolve nada.
- **Feel check**: em `/facturas` ou `/clientes`, escrever na pesquisa e mudar filtros/páginas rapidamente:
  - A tabela troca com um fade discreto, sem "chuva" de linhas.
  - Spammar filtros nunca deixa linhas a meio a deslizar.
  - DevTools → Animations a 10%: só opacidade, sem movimento vertical.
- **Done when**: nenhuma linha anima posição e a tabela inteira fica visível em ≤150ms.
