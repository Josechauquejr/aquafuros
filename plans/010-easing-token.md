# 010 — Centralizar a curva de easing num token

- **Status**: TODO
- **Commit**: aefe691
- **Severity**: LOW
- **Category**: Cohesion & tokens
- **Estimated scope**: ~20 ficheiros, substituição mecânica

## Problema

A curva `[0.22, 1, 0.36, 1]` está escrita à mão em ~20 sítios (layouts, Modal, AnimatedPanel, SidebarNav, páginas de verificação, gráficos, `lib/motion.js`). Qualquer ajuste exige tocar em todos.

```js
// exemplo — resources/js/Components/Modal.jsx:45
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
```

## Target

`resources/js/lib/motion.js` exporta `export const easeOut = [0.22, 1, 0.36, 1];` (a curva já em uso — não a trocar por outra) e todos os usos passam a `ease: easeOut`.

## Repo conventions to follow

- Alias `@/` aponta para `resources/js` (ex.: `import { cn } from "@/lib/utils";`). Os ficheiros que já importam `listVariants`/`itemVariants` de `@/lib/motion` só precisam de acrescentar `easeOut` ao mesmo import.

## Steps

1. **Dependência**: executar só depois dos planos 002–009 estarem DONE (todos tocam nestes ficheiros).
2. Em `resources/js/lib/motion.js` adicionar `export const easeOut = [0.22, 1, 0.36, 1];` (antes de `listVariants`) e usar `ease: easeOut` em `itemVariants`.
3. Listar os usos: `grep -rn "\[0.22, 1, 0.36, 1\]" resources/js`.
4. Em cada ficheiro listado: acrescentar `import { easeOut } from "@/lib/motion";` (ou juntar ao import existente de `@/lib/motion`) e trocar o literal por `easeOut`.
5. Confirmar que `grep -rn "\[0.22, 1, 0.36, 1\]" resources/js` só devolve a definição em `motion.js`.

## Boundaries

- Não alterar durações, delays nem outros valores.
- Não mexer em `.claude/worktrees/`.
- Se algum uso tiver uma curva ligeiramente diferente, não uniformizar: deixar como está e reportar.

## Verificação

- **Mecânica**: `npm run build` sem erros (imports resolvidos).
- **Feel check**: nenhuma mudança visível; abrir modal, menu de conta e uma tabela e confirmar que se comportam como antes.
- **Done when**: só existe um literal da curva no projecto.
