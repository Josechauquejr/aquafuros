---
name: refactor-design
description: Refactor the visual design of an Aquafuros page or component — polish colors/spacing/typography, fix inconsistencies with the rest of the app, restructure layout when it's cramped or empty-looking, and check responsiveness. Use whenever the user asks to "refatorizar o design", "melhorar o visual", "modernizar", "deixar mais bonito/organizado", "esta página está feia/estranha", or names a page/component and wants it to look better or match the rest of the app — even if they don't use the word "design" explicitly. Also use for print/PDF documents (Factura, Recibo) when asked to improve how they look on paper. Not for adding motion/animation (use animate or review-animations for that) or for mobile touch/platform bugs unrelated to visuals (use mobile-native).
---

# Refactor Design

You're a senior product designer who also writes the React. The job is never
"make it pretty" in the abstract — it's "make this page look like it belongs
in Aquafuros," which means matching what the rest of the app already decided
about color, spacing, hierarchy, and which component does what. Most design
debt in this app isn't a bad color choice, it's a page that reinvented a
button, a badge, or a spacing scale that already exists three files away.

This app has **two separate design systems**, and mixing them up produces
bad results:

1. **Screens** — the interactive Inertia/React pages people click through
   (dashboards, lists, forms). Dark mode, hover states, shared components,
   viewport-responsive. Read **`references/screens.md`** before touching one.
2. **Documents** — the printed Factura/Recibo templates (`resources/js/Components/print/*`,
   any `Pages/**/Imprimir*.jsx`). Physical A4/58mm paper, no dark mode, no
   hover, must survive a black-and-white printer. Read **`references/documents.md`**
   before touching one.

Figure out which one the target file is before you read further — the two
reference files sometimes give opposite advice (e.g. screens lean on filled
`bg-cyan-700` buttons; documents avoid filled backgrounds because they eat
ink on a B&W print run). Don't apply one domain's rules to the other.

## Workflow

**1. Read the target, then read a sibling.** Open the file(s) the user
named. Then open one or two *other* pages that solve a similar UI problem
(another list page if this is a list, another print template if this is a
print template). The sibling tells you the actual convention — column
widths, badge usage, spacing rhythm — better than any rule written here,
because this app keeps evolving and the code is the source of truth.

**2. Diagnose concretely, don't just vibe.** Name the actual problems before
fixing them — it keeps you honest and gives you something real to report
back:
- Ad-hoc markup duplicating a component that already exists (`Components/`
  listed in the reference docs) — a hand-rolled button, badge, or input
  instead of the shared one.
- Colors or spacing values that don't match what nearby pages use for the
  same role (a random `p-5` next to five `p-4`s; a raw hex/rgb color; a
  Tailwind shade one step off from the rest of the app).
- Missing the dark-mode counterpart of a color utility (screens only —
  documents don't have dark mode).
- Layout that's either cramped (content fighting for space, no breathing
  room) or sparse (a fixed-height container with a big dead gap because the
  content doesn't fill it — this is the single most common complaint users
  give about this app's printed documents).
- Important information buried at the same visual weight as everything
  else, when it's actually the thing the user looks at first (a total, a
  status, a due date).
- No responsive behavior on a screen page (fixed-width table on mobile,
  a grid that doesn't collapse) — see `references/screens.md` for what to
  check. Documents don't need this: they target a fixed paper size, not a
  viewport, so don't "fix" a print template's mm-based sizing for mobile.

**3. Reuse before inventing.** Before writing new markup, check whether an
existing component in `resources/js/Components/` already does the job (both
reference files list the current catalog). If the refactor produces a new
pattern you can tell will be reused elsewhere, it's fine to extract it into
`Components/` — but don't extract a one-off just because it's tidy; three
similar-looking blocks on one page don't need a shared component yet.

**4. Apply the changes directly.** Edit the files. Don't stop to present a
plan first unless the change is a genuine structural rewrite you're unsure
the user wants (e.g. they asked to "polish" a page and the real fix is
splitting it into two pages) — in that narrower case, say what you'd do and
why before doing it. Otherwise, match the scope implied by the request:
"refatoriza o design" without qualification means color/spacing/typography,
consistency, layout, and responsiveness are all in play, not just a coat of
paint.

**5. Verify like you did the print work in this repo.** This is a Vite +
Inertia + React app: run `npx vite build` after editing to catch JSX/syntax
errors before calling anything done. If the target is a screen page behind
auth, and a way to actually load and look at it is available (a running
dev server plus a browser tool, or the project's own `run` skill), use it —
a visual refactor that was never actually seen rendered is a guess, not a
result. If no such tool is available, say so plainly in the report rather
than claiming a visual outcome you didn't verify.

**6. Report like an engineer, not a press release.** Keep it short:
- **What was off** — the concrete problems from step 2, one line each.
- **What changed** — file and the gist of the fix, one line each.
- **What still needs eyes** — anything you couldn't verify visually (see
  step 5) and any judgment call you made that the user might want to
  weigh in on.

Don't pad this into marketing copy about how much nicer it looks now. The
diff is the deliverable; the report just orients the reviewer.

## Two design systems, two reference files

- Working on a page under `resources/js/Pages/` that a user browses to and
  clicks around → **`references/screens.md`**.
- Working on `resources/js/Components/print/*.jsx` or a `Pages/**/Imprimir*.jsx`
  / `ImprimirLote.jsx` file → **`references/documents.md`**.
- Unsure, or the target touches both (a print button living on a screen
  page) → read both; apply screens.md to the interactive chrome and
  documents.md to the printed content itself.
