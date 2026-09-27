# 007 — Linhas de Facturas: hover em CSS, como nas outras tabelas

- **Status**: TODO
- **Commit**: aefe691
- **Severity**: MEDIUM
- **Category**: Cohesion / Performance
- **Estimated scope**: 1 ficheiro, 2 linhas

## Problema

`Facturas/Index.jsx` é a única tabela que anima a cor de fundo do hover via `whileHover` (JS) e ainda tem `className="transition"` (que inclui `transform`/`box-shadow` e compete com o Framer). Todas as outras tabelas usam `hover:bg-slate-50 dark:hover:bg-slate-800/40`.

```jsx
// resources/js/Pages/Facturas/Index.jsx:608-613 — actual
                                                    <motion.tr
                                                        key={factura.id}
                                                        variants={itemVariants}
                                                        whileHover={{ backgroundColor: "rgba(148, 163, 184, 0.08)" }}
                                                        className="transition"
                                                    >
```

## Target

```jsx
                                                    <motion.tr
                                                        key={factura.id}
                                                        variants={itemVariants}
                                                        className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                                    >
```

## Repo conventions to follow

- Exemplar: `resources/js/Pages/Users/Index.jsx:299-303` (`motion.tr` com `variants={itemVariants}` e `className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"`).

## Steps

1. Em `resources/js/Pages/Facturas/Index.jsx` (~linha 608), remover a prop `whileHover` e substituir `className="transition"` pelo target.

## Boundaries

- Não editar o resto da tabela nem as outras páginas.
- Se o código diferir do excerto (drift), PARAR e reportar.

## Verificação

- **Mecânica**: `npm run build` sem erros.
- **Feel check**: em `/facturas`, passar o rato pelas linhas: fundo muda de cor em 150ms, igual ao de `/pagamentos`; em modo escuro o tom é legível.
- **Done when**: `grep -n "whileHover" resources/js/Pages/Facturas/Index.jsx` vazio.
