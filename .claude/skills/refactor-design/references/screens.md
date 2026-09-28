# Screens (interactive app pages)

Applies to `resources/js/Pages/**` (except `**/Imprimir*.jsx` and
`**/ImprimirLote.jsx`, which are documents — see `documents.md`) and their
supporting `resources/js/Components/**` (except `Components/print/*`, also
documents).

This is a Laravel + Inertia + React app styled entirely with Tailwind
utility classes — no CSS-in-JS, no separate stylesheet to hunt through. Dark
mode is `darkMode: 'class'` in `tailwind.config.js`, toggled by
`Components/ThemeToggle.jsx`. Every color decision needs to work in both
modes; there is no light-only page in this app.

This file describes what the codebase does *as of when it was written*. If
a sibling page you open contradicts something here, trust the sibling —
this file is a starting point for orientation, not the final word.

## The component catalog — reuse these, don't reinvent them

| Need | Component | Notes |
| --- | --- | --- |
| Primary action button | `PrimaryButton` | Filled `bg-cyan-700`, uppercase `text-xs font-semibold`. The one call-to-action per view, not every button. |
| Secondary action | `SecondaryButton` | White/`bg-slate-900` with a border, same text treatment as PrimaryButton. |
| Destructive action | `DangerButton` | Filled `bg-red-600`. Reserve for delete/anular, not "cancel". |
| Icon-only button (table row actions) | `IconButton` / `IconLink` | `tone="default" \| "danger" \| "success"`, has its own tap animation — don't wrap it in more motion. |
| Text field | `TextInput` | Forwards a ref; wrap with `InputLabel` above and `InputError` below. |
| Multi-line field | `Textarea` | Same pairing as TextInput. |
| Status/tag pill | `StatusBadge` | `tone="emerald" \| "amber" \| "rose" \| "cyan" \| "slate"`. If you find a hand-rolled `<span className="rounded-full ...">` doing the same job, that's a real finding — replace it. |
| Dashboard stat | `KpiCard` | Icon + label + big number + optional up/down % badge. Already wraps `AnimatedPanel`. |
| Generic card/panel | `AnimatedPanel` | `rounded-lg border-slate-200 bg-white shadow-sm` (+ dark variants) with a fade-in. Use this instead of writing the same border/shadow/radius combo by hand. |
| Dialog | `Modal` | `maxWidth="sm" \| "md" \| "lg" \| "xl" \| "2xl"`, handles Escape-to-close and the backdrop. |
| Yes/no confirmation | `ConfirmDialog` | Built on Modal — use it instead of a bespoke confirm modal. |
| Inline success/error/info banner | `InlineNotice` | `tone="success" \| "error" \| "info"`. |
| Paginated list nav | `Pagination` | |
| Date/period filter control | `PeriodoFiltro` | |
| Searchable list/combobox | `ListaPesquisavel` | |
| App navigation | `SidebarNav` | |

Merge conditional classes with `cn()` from `@/lib/utils` (a `clsx` +
`tailwind-merge` wrapper) rather than hand-written template-literal
ternaries — it's already the convention in every component above, and it
avoids the class-ordering bugs template literals produce with Tailwind.

## Color roles

- **`cyan-700`** (and `cyan-500`/`cyan-400` in dark mode) — the one brand/
  primary-action color. Don't introduce a second "brand" color; if
  something needs to stand out, it's cyan, or it's a status tone.
- **`slate`** — all neutral text, borders, and backgrounds. `slate-950`/
  `white` for headings, `slate-500`/`slate-400` for secondary text,
  `slate-200`/`slate-800` for borders, `white`/`slate-900` for surfaces.
- **Status tones** (`emerald` = success/paid/active, `amber` = warning/
  pending, `rose` = danger/error/overdue, `slate` = neutral/inactive) — used
  consistently across `StatusBadge`, `InlineNotice`, and `KpiCard`'s
  variation badge. Pick from these four, don't invent a fifth (e.g. don't
  reach for `orange` or `red` when `amber`/`rose` already cover that
  meaning elsewhere).

Every color utility you write needs its `dark:` pair, matching how the same
role is handled elsewhere (e.g. a light card is always
`bg-white ... dark:bg-slate-900`, not just `bg-white` with no dark variant).
Grep the file you're editing (and a sibling) for the `dark:` classes already
near the thing you're changing before inventing a new dark-mode value.

## Spacing, radius, shadow, type

These aren't hard tokens defined anywhere — they're the values used over
and over across the app. Match them instead of picking new arbitrary
values:

- **Card/panel radius**: `rounded-lg`. **Button/input/icon-box radius**:
  `rounded-md`. **Pills/dots**: `rounded-full`.
- **Panel shadow**: `shadow-sm` (`shadow-xl` for modals, which sit above
  everything). Don't add a shadow to something that isn't meant to float
  above the page.
- **Card padding**: `p-5` for a stat/content card, `px-5 py-4` for a modal
  header. Gaps between stacked sections: `space-y-4`–`space-y-6` depending
  on how related they are.
- **Type scale**: `text-xs uppercase font-semibold` for buttons/badges/
  eyebrow labels, `text-sm` for body and form labels, `text-2xl font-bold`
  for a big standalone number (KPIs), `font-semibold` (not a size bump
  alone) for section headings. A page that mixes three different "body
  text" sizes for the same kind of content is a real inconsistency to fix.

## Motion

`motion/react` (Framer Motion) is already wired into several primitives
(`IconButton`, `Modal`, `AnimatedPanel`, `KpiCard`) with a consistent easing
curve (`[0.22, 1, 0.36, 1]`) and short durations (~0.18–0.25s for fades/
scale-ins, a stiff spring for tap feedback). When a refactor calls for a
card or a fade-in, reach for `AnimatedPanel` rather than writing new motion
by hand. If the request is actually about *adding new motion* somewhere
(a page transition, a drag interaction, a novel entrance), that's the
`animate` skill's job, not this one — don't freelance new easing curves or
durations here.

## Responsiveness

Check every page you touch at a phone width (this is a field-service app —
técnicos likely use it on a phone away from the office):

- Tables: does it reflow or scroll horizontally at `sm`, or does it just
  clip? A `<table>` with many columns usually needs either a horizontal
  scroll wrapper or a stacked-card view under a breakpoint — check how an
  existing list page in this app handles it before inventing a new pattern.
- Grids: multi-column layouts (`grid-cols-2`, `grid-cols-3`, KPI rows)
  should collapse to fewer columns under `sm`/`md` (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
  is the usual shape) rather than staying fixed and forcing horizontal
  scroll on the whole page.
- Fixed widths: a `max-w-*` on a card is fine; a raw `w-[400px]` on
  something that should reflow usually isn't.
- Sidebar/nav: confirm `SidebarNav` still works (collapses, doesn't
  overlap content) at the width you're testing.

If you can't actually load the page in a browser to check this (see
SKILL.md step 5), say explicitly in your report that responsiveness needs
human verification on a phone or a resized window — don't assert it looks
right on mobile from reading the JSX alone.

## Anti-patterns

| Instead of… | Do… |
| --- | --- |
| A new `<button className="...">` copy-pasted from somewhere | `PrimaryButton` / `SecondaryButton` / `DangerButton` / `IconButton` |
| A hand-rolled colored `<span>` pill for a status | `StatusBadge` with the matching tone |
| A raw hex or `rgb()` color | The nearest Tailwind slate/cyan/status-tone shade already used nearby |
| A color utility with no `dark:` pair | Add the dark variant, copying the pattern from a sibling component |
| A bespoke `border + shadow + rounded` card | `AnimatedPanel` |
| A hand-written confirm modal | `ConfirmDialog` |
| Template-literal class ternaries | `cn(...)` from `@/lib/utils` |
| A grid/table that just clips on mobile | A responsive column count or a scroll/stacked fallback |
| Declaring a visual fix "done" without seeing it render | Say what you verified vs. what still needs a human look |
