# 003 — Encurtar a entrada dos `AnimatedPanel` (sem cascata de ~1s)

- **Status**: DONE (commit `305d0cd`, branch `anima-melhorias`)
- **Commit**: aefe691
- **Severity**: HIGH
- **Category**: Easing & duration / Frequência
- **Estimated scope**: 1 ficheiro, 2 linhas

## Problema

`AnimatedPanel` dura 450ms e as páginas passam-lhe `delay` de 0.1 até 0.58 (valores em uso: 0.1, 0.16, 0.2, 0.24, 0.28, 0.3, 0.36, 0.42, 0.52, 0.58). O último painel de um dashboard só assenta ao fim de ~1s, por cima do fade do wrapper `key={url}` do layout. Acima do orçamento de 300ms, e repete-se em cada visita.

```jsx
// resources/js/Components/AnimatedPanel.jsx:6-10 — actual
        <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
```

## Target

Duração 250ms, deslocamento 8px, e o `delay` recebido limitado a 80ms (a API `delay` mantém-se: nenhuma página é editada; os painéis passam a entrar quase juntos, com no máximo 80ms de diferença).

```jsx
// target
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: Math.min(delay, 0.08), ease: [0.22, 1, 0.36, 1] }}
```

## Repo conventions to follow

- Manter a curva `[0.22, 1, 0.36, 1]` (a usada em todo o projecto; plano 010 trata de a centralizar).

## Steps

1. Em `resources/js/Components/AnimatedPanel.jsx`, substituir `y: 14` por `y: 8` e a linha `transition` pelo target acima.

## Boundaries

- Não editar as páginas que usam `<AnimatedPanel delay={...}>`.
- Não alterar `className` nem a estrutura.
- Se o excerto for diferente (drift), PARAR e reportar.

## Verificação

- **Mecânica**: `npm run build` sem erros.
- **Feel check**: abrir `/dashboard` (Admin), `/admin/kpis`, `/caixa`:
  - Os painéis aparecem praticamente em simultâneo, sem "cascata" lenta.
  - DevTools → Animations a 10%: a subida é curta (8px) e desacelera no fim.
  - Com `prefers-reduced-motion` (plano 001) só há fade.
- **Done when**: nenhum painel demora mais de 330ms (250ms + 80ms) a ficar totalmente visível.
