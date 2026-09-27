# 002 — Navbar e sidebar não devem reanimar em cada navegação

- **Status**: DONE (commit `c862752`, branch `anima-melhorias`)
- **Commit**: aefe691
- **Severity**: HIGH
- **Category**: Purpose & frequency
- **Estimated scope**: 3 ficheiros, ~30 linhas

## Problema

Cada página renderiza o seu layout (`<AdminLayout>` / `<DevLayout>` dentro da página, ex.: `resources/js/Pages/Admin/Dashboard.jsx:106`), por isso o layout **remonta em cada navegação Inertia**. A navbar (350ms) e cada item da sidebar (300ms + `delay index*0.04`) reentram do zero a cada clique — a acção mais frequente da app (100+/dia). A sidebar chega a demorar >0.5s a "assentar" em cada página.

```jsx
// resources/js/Layouts/AdminLayout.jsx:99-104 — actual (idêntico em DevLayout.jsx:81-86, com outras cores)
            <motion.nav
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85"
            >
```

```jsx
// resources/js/Components/SidebarNav.jsx:15-16 e 34-42 — actual
    let indiceGlobal = 0;
...
                            const index = indiceGlobal++;

                            return (
                                <motion.div
                                    key={item.href}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
                                >
```
(o `</motion.div>` de fecho está em `SidebarNav.jsx:73`).

## Target

Chrome de navegação **estático**: sem animação de entrada na navbar nem nos itens da sidebar. A pílula activa (`motion.span layoutId=...`) e o menu de conta (`AnimatePresence`) mantêm-se como estão. O conteúdo da página continua a animar pelo wrapper `key={url}` de `AdminLayout.jsx:244-251` (não mexer aqui).

```jsx
// AdminLayout.jsx / DevLayout.jsx — target
            <nav
                className="sticky top-0 z-40 border-b ... (manter a className existente, sem alterações)"
            >
...
            </nav>
```

```jsx
// SidebarNav.jsx — target
                            return (
                                <div key={item.href}>
                                    <Link ...>...</Link>
                                </div>
                            );
```

## Repo conventions to follow

- `motion` continua importado nos três ficheiros (usado por `AnimatePresence`, `motion.aside`, `motion.span`, `motion.div` do wrapper `key={url}`); **não remover** o import.

## Steps

1. `resources/js/Layouts/AdminLayout.jsx:99`: trocar `<motion.nav` por `<nav` e remover as três props `initial`, `animate`, `transition`. Manter `className`. No fecho (~linha 187) trocar `</motion.nav>` por `</nav>`.
2. `resources/js/Layouts/DevLayout.jsx:81`: idem (o fecho `</motion.nav>` está mais abaixo; procurar por `</motion.nav>`).
3. `resources/js/Components/SidebarNav.jsx`: remover a linha `let indiceGlobal = 0;` e a linha `const index = indiceGlobal++;`. Trocar `<motion.div key={item.href} initial=... animate=... transition=...>` por `<div key={item.href}>` e o respectivo `</motion.div>` (linha ~73) por `</div>`.
4. Confirmar com `grep -n "indiceGlobal\|index" resources/js/Components/SidebarNav.jsx` que não sobraram referências a `index`/`indiceGlobal`.

## Boundaries

- NÃO converter para layout persistente (`Page.layout`) — é um refactor de ~20 páginas, fora de âmbito.
- NÃO alterar o wrapper `key={url}` de `<main>`, o menu de conta, o drawer móvel nem a pílula `layoutId`.
- NÃO mexer nas classes de estilo.
- Se o código não corresponder aos excertos (drift), PARAR e reportar.

## Verificação

- **Mecânica**: `npm run build` sem erros.
- **Feel check**: navegar entre 5 páginas seguidas pela sidebar (Admin e Dev):
  - Navbar e sidebar ficam imóveis; só o conteúdo principal faz o fade curto.
  - O menu de conta continua a abrir com scale/fade a partir do canto superior direito.
  - No drawer móvel, abrir/fechar continua a deslizar.
- **Done when**: nenhum `motion.nav` nos layouts e nenhum `initial`/`animate` nos itens da sidebar.
