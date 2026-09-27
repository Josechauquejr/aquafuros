# 008 — Páginas públicas de verificação e acesso bloqueado: entradas mais curtas

- **Status**: TODO
- **Commit**: aefe691
- **Severity**: MEDIUM
- **Category**: Easing & duration
- **Estimated scope**: 3 ficheiros, 3–5 linhas cada

## Problema

São páginas raras (delight permitido), mas o cartão demora 450ms e o selo "verificado" 400ms com `delay 0.1`: ~500ms até assentar. Quem verifica um QR quer o resultado já.

```jsx
// resources/js/Pages/Verificacao/Pagamento.jsx:24-28 e Verificacao/Factura.jsx:32-36 e AcessoBloqueado.jsx:21-25 — actual
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
```

```jsx
// resources/js/Pages/Verificacao/Pagamento.jsx:41-45 e Verificacao/Factura.jsx:49-53 — actual (selo verificado)
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
```

## Target

Cartão: `duration: 0.3`. Selo: `duration: 0.25, delay: 0.05`. Resto igual (`y: 16`, `scale: 0.9` mantêm-se).

## Repo conventions to follow

- Curva `[0.22, 1, 0.36, 1]` mantém-se.

## Steps

1. Nos três ficheiros, mudar `duration: 0.45` para `duration: 0.3` na `motion.div` do cartão.
2. Em `Verificacao/Pagamento.jsx` e `Verificacao/Factura.jsx`, mudar a transição do selo para `{ duration: 0.25, delay: 0.05, ease: [0.22, 1, 0.36, 1] }`.

## Boundaries

- Não mexer noutras animações nem no conteúdo.
- Se o código diferir (drift), PARAR e reportar.

## Verificação

- **Mecânica**: `npm run build` sem erros.
- **Feel check**: abrir `/verificar/...` (ou a rota equivalente) e `/acesso-bloqueado`; o cartão assenta em ~300ms e o selo aparece logo a seguir, sem sensação de espera; DevTools Animations a 10%: origem do selo visível (cresce a partir de 0.9, não de 0).
- **Done when**: nenhum `duration: 0.45` nem `duration: 0.4` restam nesses três ficheiros.
