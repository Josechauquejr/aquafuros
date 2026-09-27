# 005 — Botões: só feedback de press, componente estável, sem CSS a lutar com o Framer

- **Status**: DONE (commit `b0a8fd8`, branch `anima-melhorias`)
- **Commit**: aefe691
- **Severity**: MEDIUM
- **Category**: Frequência / Acessibilidade / Performance
- **Estimated scope**: 3 ficheiros, ~20 linhas

## Problema

1. Hover com `scale`/`y` em botões usados dezenas de vezes por dia, sem gate `(hover: hover)` — falsos hovers em touch. `AnimatedButton` sobe/escala, `IconButton` escala 1.12 (em cada linha de tabela), `Pagination` escala 1.08.
2. Tap demasiado fundo (`0.9`, `0.94`); spring `damping: 25` ressalta.
3. `const Component = motion.create(as)` é chamado **dentro do render**: cria um componente novo a cada render, o React desmonta/remonta o botão (perde foco e estado de animação).
4. `AnimatedButton` e `Pagination` usam a classe Tailwind `transition`, que inclui `transform` e faz o CSS competir com o transform inline do Framer (movimento com "atraso" duplo).

```jsx
// resources/js/Components/AnimatedButton.jsx:19-28 — actual
    const Component = motion.create(as);

    return (
        <Component
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            className={cn(
                "inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold transition focus:outline-none ...",
```

```jsx
// resources/js/Components/IconButton.jsx:16-23 — actual
    const Component = motion.create(as ?? "button");

    return (
        <Component
            type={as ? undefined : "button"}
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
```

```jsx
// resources/js/Components/Pagination.jsx:40-43 — actual
                            whileHover={link.url ? { scale: 1.08 } : {}}
                            whileTap={link.url ? { scale: 0.94 } : {}}
                            className={cn(
                                "flex h-8 min-w-[2rem] items-center justify-center rounded-md px-2 text-xs font-medium transition",
```

## Target

- Sem `whileHover` nos três.
- `AnimatedButton`: `whileTap={{ scale: 0.97 }}`, `transition={{ type: "spring", stiffness: 500, damping: 35 }}`, e `transition` → `transition-colors` na className.
- `IconButton`: `whileTap={{ scale: 0.95 }}`, spring `stiffness: 500, damping: 35` (já usa `transition-colors`).
- `Pagination`: `whileTap={link.url ? { scale: 0.97 } : {}}` e `transition` → `transition-colors` na className.
- `motion.create(...)` fora do render, memorizado: `const Component = useMemo(() => motion.create(as), [as]);` (`IconButton`: `useMemo(() => motion.create(as ?? "button"), [as])`), com `import { useMemo } from "react";`.

## Repo conventions to follow

- Hover de cor/fundo continua por CSS Tailwind (`hover:bg-...`), como em `resources/js/Components/PrimaryButton.jsx:11`.

## Steps

1. `AnimatedButton.jsx`: adicionar `import { useMemo } from "react";`; substituir a linha do `motion.create` pelo `useMemo`; remover `whileHover`; ajustar `whileTap` e `transition`; na string da className trocar ` transition ` por ` transition-colors `.
2. `IconButton.jsx`: idem (`useMemo`, remover `whileHover`, `whileTap` 0.95, spring 500/35).
3. `Pagination.jsx`: remover `whileHover`; `whileTap` 0.97; na className trocar `font-medium transition"` por `font-medium transition-colors"`.

## Boundaries

- Não alterar variantes de cor, tamanhos, props públicas nem `IconLink`.
- Não adicionar dependências.
- Se o código não corresponder (drift), PARAR e reportar.

## Verificação

- **Mecânica**: `npm run build` sem erros.
- **Feel check**:
  - Passar o rato por botões/ícones/paginação: só muda a cor, sem crescer.
  - Clicar e segurar: o botão encolhe ligeiramente (3–5%) e volta sem ressaltar.
  - Clicar num `IconButton` em tabela com foco de teclado: o foco não se perde ao re-renderizar a página.
  - Emulação `prefers-reduced-motion` (plano 001): sem escala.
- **Done when**: `grep -n "whileHover" resources/js/Components/{AnimatedButton,IconButton,Pagination}.jsx` não devolve nada e `motion.create` não aparece dentro do corpo de render sem `useMemo`.
