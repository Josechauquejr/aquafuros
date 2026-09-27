# 009 — Cartões "Novo contrato / Cliente existente": hover só em ponteiro fino + feedback de press

- **Status**: TODO
- **Commit**: aefe691
- **Severity**: LOW
- **Category**: Acessibilidade / Performance
- **Estimated scope**: 1 ficheiro, 2 classes

## Problema

Os dois cartões usam `transition hover:-translate-y-0.5 ... hover:shadow-md` sem gate de dispositivo (em touch o hover "cola" após o toque) e sem feedback de press. `transition` genérico anima propriedades desnecessárias.

```jsx
// resources/js/Pages/Clientes/Index.jsx:510 e :526 — actual (className idêntica nos dois botões)
                        className="flex flex-col items-start gap-3 rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-cyan-600"
```

## Target

```jsx
                        className="flex flex-col items-start gap-3 rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition-[transform,border-color,box-shadow] duration-150 active:scale-[0.98] [@media(hover:hover)]:hover:-translate-y-0.5 hover:border-cyan-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-cyan-600"
```

## Repo conventions to follow

- Tailwind v3 com classes utilitárias; `active:scale-[0.98]` já é usado em `resources/js/Components/SidebarNav.jsx:48`.

## Steps

1. Em `resources/js/Pages/Clientes/Index.jsx`, nos dois botões (linhas ~510 e ~526), substituir a `className` pelo target.

## Boundaries

- Não alterar o conteúdo dos cartões nem `escolherTipoRegisto`.
- Se o código diferir (drift), PARAR e reportar.

## Verificação

- **Mecânica**: `npm run build` sem erros; a classe `[@media(hover:hover)]:hover:-translate-y-0.5` deve existir no CSS gerado (`grep -o "hover:hover" public/build/assets/*.css | head -1`).
- **Feel check**: no desktop, o cartão sobe 2px em 150ms; em emulação de dispositivo touch (DevTools) tocar não deixa o cartão "levantado"; clicar e segurar encolhe ~2%.
- **Done when**: os dois botões têm exactamente a className do target.
