# 011 — Hover de cor: `transition-colors duration-150` em vez de `transition`

- **Status**: TODO
- **Commit**: aefe691
- **Severity**: LOW
- **Category**: Easing & duration (polish)
- **Estimated scope**: ~35 ocorrências, substituição guiada

## Problema

A classe Tailwind `transition` cobre cor, opacidade, sombra, transform e filtros com o timing por omissão (150ms, `cubic-bezier(0.4, 0, 0.2, 1)`). Em botões, linhas e links onde só a cor muda, isto é mais amplo do que o necessário e pode competir com transforms.

```jsx
// exemplo — resources/js/Pages/Users/Index.jsx:302
                                                        className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
```

## Target

Onde a classe só serve hover de cor/fundo: `transition-colors duration-150`.

## Repo conventions to follow

- Exemplo já correcto: `resources/js/Components/IconButton.jsx:25` (`transition-colors`) e os gráficos (`transition-colors` nas legendas).

## Steps

1. **Dependência**: executar depois dos planos 005, 007 e 009 (já tratam alguns casos).
2. Listar: `grep -rnE "(\"|\s)transition(\s|\")" resources/js --include=*.jsx`.
3. Para cada ocorrência, trocar `transition` por `transition-colors duration-150` **apenas se** a mesma className NÃO contiver `scale`, `translate`, `rotate`, `shadow-`-com-hover ou `transition-` já qualificado. Casos com transform (ex.: `SidebarNav.jsx:48` `active:scale-[0.98]`, `SidebarNav.jsx:62`) ficam como `transition-[transform,background-color,color] duration-150` ou são ignorados e reportados.
4. Ignorar `resources/css/app.css:11` (`transition-colors duration-300` no `body`, justificado pela troca de tema).

## Boundaries

- Não mexer em `transition-*` já qualificados, nem em animações do Framer.
- Não tocar em `.claude/worktrees/`.
- Na dúvida sobre se a className anima transform, deixar como está e listar no resumo.

## Verificação

- **Mecânica**: `npm run build` sem erros.
- **Feel check**: passar o rato por botões, links de tabela, linhas e itens de menu: a cor muda em ~150ms, sem saltos de transform.
- **Done when**: `grep` do passo 2 só devolve ocorrências deliberadamente ignoradas e listadas no resumo.
