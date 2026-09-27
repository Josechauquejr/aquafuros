# 006 — Barras dos gráficos: `transform`/`clip-path` em vez de `height`/`width`

- **Status**: TODO
- **Commit**: aefe691
- **Severity**: MEDIUM
- **Category**: Performance
- **Estimated scope**: 2 ficheiros, ~25 linhas

## Problema

`EvolucaoMensalChart` anima `height` (layout) e `scaleX` no mesmo `animate`, partilhando uma transição de 0.5s com `delay index*0.05` — o hover (`scaleX`) demora e herda o atraso. `DistribuicaoMetodoChart` anima `width` (layout).

```jsx
// resources/js/Components/charts/EvolucaoMensalChart.jsx:96-107 — actual
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: alturaFacturado, scaleX: activo ? 1.15 : 1 }}
                                        transition={{ duration: 0.5, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                                        className={`w-3 origin-bottom rounded-t sm:w-4 ${CORES.facturado}`}
                                    />
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: alturaRecebido, scaleX: activo ? 1.15 : 1 }}
                                        transition={{ duration: 0.5, delay: index * 0.05 + 0.05, ease: [0.22, 1, 0.36, 1] }}
                                        className={`w-3 origin-bottom rounded-t sm:w-4 ${CORES.recebido}`}
                                    />
```

```jsx
// resources/js/Components/charts/DistribuicaoMetodoChart.jsx:69-75 — actual
                        <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" title=...>
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.max(2, pct)}%` }}
                                transition={{ duration: 0.6, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                                className={`h-full rounded-full ${config.cor}`}
                            />
```

## Target

**EvolucaoMensalChart** — barras de altura fixa `ALTURA_MAX` (140, já definida no ficheiro; o contentor tem `ALTURA_MAX + 8`) escaladas em `scaleY` (origem em baixo, já `origin-bottom`); transições separadas para `scaleY` (entrada) e `scaleX` (hover):

```jsx
                                    <motion.div
                                        initial={{ scaleY: 0 }}
                                        animate={{ scaleY: alturaFacturado / ALTURA_MAX, scaleX: activo ? 1.15 : 1 }}
                                        transition={{
                                            scaleY: { duration: 0.4, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] },
                                            scaleX: { duration: 0.15, ease: [0.22, 1, 0.36, 1] },
                                        }}
                                        style={{ height: ALTURA_MAX }}
                                        className={`w-3 origin-bottom rounded-t sm:w-4 ${CORES.facturado}`}
                                    />
```
A barra `recebido` igual, com `alturaRecebido`, `delay: index * 0.05 + 0.05` e `CORES.recebido`.

**DistribuicaoMetodoChart** — barra em largura total revelada por `clip-path` (preserva as pontas arredondadas):

```jsx
                            <motion.div
                                initial={{ clipPath: "inset(0 100% 0 0 round 9999px)" }}
                                animate={{ clipPath: `inset(0 ${100 - Math.max(2, pct)}% 0 0 round 9999px)` }}
                                transition={{ duration: 0.4, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                                className={`h-full w-full ${config.cor}`}
                            />
```

## Repo conventions to follow

- Manter a curva `[0.22, 1, 0.36, 1]`, as cores em `CORES` e o contentor existente.

## Steps

1. Editar as duas barras de `EvolucaoMensalChart.jsx` conforme o target.
2. Editar a barra de `DistribuicaoMetodoChart.jsx` conforme o target (o contentor pai mantém-se com `overflow-hidden rounded-full`).

## Boundaries

- Não alterar tooltips, legendas, `AreaChart`, `LineChart`, `DonutChart`.
- Não mudar `ALTURA_MAX` nem o cálculo de `alturaFacturado`/`alturaRecebido`.
- Se `rounded-t` ficar visivelmente achatado em barras baixas, NÃO improvisar: reportar no resumo final.
- Se o código não corresponder (drift), PARAR e reportar.

## Verificação

- **Mecânica**: `npm run build` sem erros.
- **Feel check**: abrir o dashboard com o gráfico mensal e o de distribuição por método:
  - As barras crescem de baixo para cima (e da esquerda para a direita) com stagger curto; alturas/larguras finais iguais às anteriores.
  - Passar o rato numa coluna alarga as barras em ~150ms, sem o atraso do índice.
  - Mudar o período: as barras animam de forma contínua entre os valores (transform, não layout).
  - DevTools → Performance: sem "Layout" durante a animação das barras.
  - Verificar se as pontas arredondadas de `rounded-t` ficam achatadas em barras muito baixas (reportar se sim).
- **Done when**: nenhum `height:`/`width:` animado nos dois ficheiros (`grep -n "initial={{ height\|initial={{ width" resources/js/Components/charts` vazio).
