# Documents (printed Factura / Recibo templates)

Applies to `resources/js/Components/print/*.jsx` (`FacturaA4`,
`FacturaTermica58mm`, `ReciboTermico58mm`) and the print pages that embed
their own inline markup instead of a shared component
(`Pages/Facturas/Imprimir.jsx`, `Pages/Facturas/ImprimirLote.jsx`,
`Pages/Pagamentos/Imprimir.jsx`, `Pages/Pagamentos/ImprimirLote.jsx`).

These are **not web pages that happen to print** — they're paper documents
that happen to be built in React. A customer holds this in their hand or
files it. That changes almost every rule from `screens.md`:

- **No dark mode.** There's no `dark:` variant anywhere in these files —
  paper doesn't have a color scheme, and adding one is dead code.
- **No hover, no interactivity, no motion** inside the printed area itself
  (the surrounding page chrome — the "Imprimir"/"Descarregar" buttons — is a
  normal screen and screens.md applies to *that* part).
- **Fixed physical sizing, not viewport-responsive.** A4 templates use
  `max-w-3xl`/`w-[210mm]`; the 58mm thermal templates are `w-[58mm]`; the
  batch layout hard-codes `h-[90mm]` per invoice so exactly 3 fit on one A4
  sheet. Don't "fix" these for mobile breakpoints — a phone screen is not
  the target, a piece of paper is. If a batch-print card's fixed height is
  the actual problem (see the height-budget note below), that's a document
  layout issue, not a responsiveness one.
- **Must survive black-and-white printing.** Never rely on a saturated
  filled background (`bg-cyan-700`, `bg-slate-900`, etc.) to carry meaning
  or hierarchy — on a B&W printer it becomes a solid dark block that eats
  toner and can wash out overlaid text. Use a **border** instead (a thicker
  or darker border for the more important element, a thin light one for
  the secondary/muted one) and vary font weight/size, not fill, for
  emphasis. A very light tint (`bg-cyan-50`) is borderline-acceptable but a
  border-only card is safer and is what this app has standardized on after
  hitting this exact problem. Solid color *is* fine on the QR code and any
  screen-only UI outside the printed area.

## Where the data comes from

- **Company identity** (`empresa.nome`, `.nuit`, `.localizacao`,
  `.logotipoUrl`) is a shared Inertia prop from
  `HandleInertiaRequests::share()`, backed by `App\Models\EmpresaPerfil`
  (edited at `/dev/configuracoes`). Every print template should read this —
  never hard-code "Aquafuros" as a literal string. If you're adding a
  company-identity line to a template that doesn't have one yet, check the
  other print templates for the exact pattern (`empresa?.nome ?? "Aquafuros"`,
  guard NUIT/localização with `empresa?.nuit &&` since they're optional).
- **The logo image** is a real `<img src={empresa.logotipoUrl}>`, not a
  data URI. Two things commonly break it, both worth checking if a logo
  "doesn't show up when printing": (1) the `public/storage` symlink must
  exist (`php artisan storage:link`) or the URL 404s — this has bitten this
  exact app before; (2) the PDF export path uses `html2canvas` with
  `useCORS: true`, so the `<img>` needs `crossOrigin="anonymous"` or the
  canvas snapshot silently renders it blank.
- **Client/factura/pagamento data** comes through as full Inertia props
  from the relevant controller (`FacturaController`, `PagamentoController`)
  — check what's eager-loaded (`->with([...])`) before assuming a field
  isn't available; it's often already there and just not rendered yet
  (e.g. `cliente.data_adesao` existed in the payload long before any
  template displayed it as "Cliente desde").
- **Currency/date formatting**: always `formatCurrency()` / `formatDate()`
  / `formatDateTime()` from `@/lib/utils` — never format a number or date
  by hand in a print template.

## The fixed-height batch layout (3 facturas per A4 page)

`Facturas/ImprimirLote.jsx` and `Pagamentos/ImprimirLote.jsx` print three
documents per A4 sheet using a hard `h-[90mm]` per card (3 × 90mm ≈ the
printable area of an A4 page after margins). This is the layout most likely
to be described as "has too much empty space in the middle" — that
symptom means the content inside the fixed-height card is shorter than
90mm, so `flex flex-col justify-between` is shoving the footer down and
leaving a gap, not that the page has room to spare.

If you're asked to fill that space, enrich it, or make the fonts bigger,
you have to do the arithmetic, because `h-[90mm]` will silently overflow
into the next card if you add content without checking:

1. Convert font sizes to line-height in mm: `line-height(px) ≈ font-size(px) × 1.25`
   (Tailwind's `leading-tight`) `× 0.2646 mm/px`. E.g. `text-xs` (12px) at
   `leading-tight` ≈ 4mm per line.
2. Add up every line, box (`py-*` padding counts), and gap (`space-y-*`,
   `gap-*`) in the card, plus the container's own `p-4` padding (counts
   *inside* the fixed height since Tailwind's preflight uses
   `box-sizing: border-box`).
3. Keep the total a few mm under 90mm. A few mm of slack left as a gap
   before the footer is fine and looks intentional; going over means the
   next invoice's content visually collides with this one when printed.
4. Prefer `leading-tight` over `leading-normal` when you need a bigger font
   without the line-height cost — it lets you satisfy "fonts maiores" and
   "no wasted space" at the same time instead of trading one for the other.
5. When you need to fit more information (e.g. splitting a "current vs.
   previous" comparison into two cards), reclaim space by condensing
   less-important detail into a single compact line (e.g. a
   `Consumo · Dívida · Multa` breakdown that was three stacked rows can
   become one line with `·` separators) rather than just cramming
   everything in and hoping.

The single-document A4 templates (`FacturaA4.jsx`, the inline recibo in
`Pagamentos/Imprimir.jsx`) don't have this fixed-height constraint — they
grow naturally with `mt-*` spacing between sections — so the "fill the
empty space" problem there is a normal layout/emphasis question, not an
arithmetic one.

## Visual hierarchy on a document

The thing a customer looks at first on a Factura is the amount they owe and
how much water they used. If those are rendered at the same size and weight
as "Bairro: Polana Caniço", the document is failing at its one job. Give
the current period's consumption and the total due a dedicated, larger,
bordered callout (see the anti-pattern table below for how, given the B&W
constraint) rather than leaving them as just another row in a table — this
app's Factura templates already do this (look at `FacturaA4.jsx` and the
batch layout in `Facturas/ImprimirLote.jsx` for the pattern before
reinventing it). Anything from a *previous* period (last month's
consumption, last month's amount) is context, not the headline — render it
smaller and less bold, next to (not instead of) the current figure, so the
comparison is easy to read.

## Anti-patterns

| Instead of… | Do… |
| --- | --- |
| Hard-coding "Aquafuros" / a fixed subtitle | Read `empresa.nome` / `.nuit` / `.localizacao` / `.logotipoUrl` |
| A filled `bg-cyan-700` / `bg-slate-900` highlight box | A border (thicker/darker border = more important) on a white background |
| `dark:` classes anywhere in the printed area | None — paper has no color scheme |
| Adding content to a `h-[90mm]` batch card without checking the mm budget | Do the line-height arithmetic first (see above) |
| "Fixing" a print template's fixed mm width/height for mobile breakpoints | Leave it — the target is paper, not a viewport |
| An `<img>` logo with no `crossOrigin` in a template used for PDF export | `crossOrigin="anonymous"` |
| Formatting a currency/date value by hand | `formatCurrency()` / `formatDate()` / `formatDateTime()` from `@/lib/utils` |
| Giving the total/consumption the same visual weight as every other line | A dedicated bordered, larger callout for the figure the customer actually looks for |
