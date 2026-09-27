# Planos de melhoria de animações

Gerados por `improve-animations` no commit `aefe691`. Cada plano é autónomo; executar por esta ordem.

| # | Título | Severidade | Estado |
| --- | --- | --- | --- |
| 001 | [Respeitar `prefers-reduced-motion`](001-reduced-motion-global.md) | HIGH | DONE (`33cbf2a`) |
| 002 | [Navbar e sidebar sem reanimar em cada navegação](002-layout-chrome-no-replay.md) | HIGH | DONE (`c862752`) |
| 003 | [Encurtar entrada dos `AnimatedPanel`](003-animated-panel-timing.md) | HIGH | DONE (`305d0cd`) |
| 004 | [Listas/tabelas: fade curto, sem stagger](004-list-variants-no-stagger.md) | HIGH | DONE (`83f1aa7`) |
| 005 | [Botões: só press, componente estável](005-buttons-press-only.md) | MEDIUM | DONE (`b0a8fd8`) |
| 006 | [Barras dos gráficos em transform/clip-path](006-chart-bars-gpu.md) | MEDIUM | TODO |
| 007 | [Linhas de Facturas: hover em CSS](007-facturas-row-hover-css.md) | MEDIUM | TODO |
| 008 | [Páginas de verificação: entradas mais curtas](008-verification-pages-timing.md) | MEDIUM | TODO |
| 009 | [Cartões de Clientes: hover gated + press](009-clientes-cards-hover-gate.md) | LOW | TODO |
| 010 | [Token de easing](010-easing-token.md) | LOW | TODO |
| 011 | [`transition-colors` no hover de cor](011-transition-colors.md) | LOW | TODO |

## Ordem e dependências

1. **001** — independente, executar primeiro.
2. **002 → 003 → 004** — mesmo eixo (entradas em navegação e filtros). Independentes entre si em ficheiros, mas avaliar o feel em conjunto no fim.
3. **005, 006, 007, 008, 009** — independentes; podem correr em paralelo (ficheiros distintos).
4. **010** — depende de 002–009 (toca nos mesmos ficheiros). **011** — depende de 005, 007 e 009.

## Notas do audit

- **Rejeitado**: menu de conta em `AdminLayout.jsx:158-162` / `DevLayout.jsx:133` — já tem `origin-top-right` na className, a origem está correcta.
- **Fora de âmbito (refactor maior)**: layout persistente do Inertia (`Page.layout`) para navbar/sidebar deixarem de remontar. O plano 002 remove apenas a animação de entrada.
- **Por verificar visualmente**: em `EvolucaoMensalChart.jsx` o tooltip combina `-translate-x-1/2` (Tailwind) com `y` do Framer, que substitui o `transform` inline; se o tooltip aparecer deslocado da coluna, corrigir com `x: "-50%"` no `initial`/`animate`.
