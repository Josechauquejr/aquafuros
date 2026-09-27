# 001 — Respeitar `prefers-reduced-motion` em toda a app

- **Status**: DONE (commit `33cbf2a`, branch `anima-melhorias`)
- **Commit**: aefe691
- **Severity**: HIGH
- **Category**: Acessibilidade
- **Estimated scope**: 1 ficheiro, ~5 linhas

## Problema

Não existe `MotionConfig`, `useReducedMotion` nem `prefers-reduced-motion` em `resources/`. Há dezenas de animações com `x`/`y`/`scale` (entradas de tabelas, painéis, sidebar, botões) que correm sempre, mesmo para quem pediu menos movimento ao sistema operativo.

```js
// resources/js/app.js:19-21 — actual
    setup({ el, App, props }) {
        createRoot(el).render(createElement(App, props));
    },
```

## Target

Envolver a app em `MotionConfig` com `reducedMotion="user"`. O Framer Motion (pacote `motion/react`, v12) passa então a desactivar animações de transformação (`x`, `y`, `scale`, `rotate`) quando o utilizador tem "reduzir movimento" activo, mantendo `opacity` e cor — que é o comportamento pretendido (mais suave, não zero).

```js
// resources/js/app.js — target
import { createInertiaApp } from "@inertiajs/react";
import { MotionConfig } from "motion/react";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers";
...
    setup({ el, App, props }) {
        createRoot(el).render(
            createElement(MotionConfig, { reducedMotion: "user" }, createElement(App, props)),
        );
    },
```

## Repo conventions to follow

- `app.js` não usa JSX (usa `createElement`); manter esse estilo. Não renomear o ficheiro.
- O pacote de animação é `motion/react` (ver `resources/js/Components/Modal.jsx:1`).

## Steps

1. Em `resources/js/app.js`, adicionar `import { MotionConfig } from "motion/react";` junto dos outros imports.
2. Substituir o corpo de `setup` pelo bloco target acima.

## Boundaries

- Não tocar em nenhum outro ficheiro. Não adicionar `useReducedMotion` em componentes.
- Não adicionar dependências.
- Se `app.js` for diferente do excerto acima (drift), PARAR e reportar.

## Verificação

- **Mecânica**: `npm run build` conclui sem erros.
- **Feel check**: no Chrome DevTools → Rendering → "Emulate CSS media feature prefers-reduced-motion: reduce", recarregar uma página com tabela (ex.: `/clientes`) e o dashboard:
  - As linhas e painéis aparecem só com fade, sem deslizar.
  - Botões com `whileTap` deixam de escalar; hover de cor (CSS) continua a funcionar.
  - Com a emulação desligada, tudo anima como antes.
- **Done when**: a emulação reduce elimina todo o movimento de posição/escala e mantém opacidade.
