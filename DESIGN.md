# Design

Visual system for the AzCuts client. Committed in CLIENT_PLAN.md §1 and realized here as the source of truth for tokens, type, components, and motion. Product register (see PRODUCT.md): restrained by default, one confident accent, consistent vocabulary across all three portals. The landing page (brand surface) may push further within these tokens.

## Theme

Light and dark are both first-class, toggled by the `dark` class on `<html>` (Tailwind `darkMode: 'class'`), persisted to `localStorage` under `az-theme`, and applied before first paint by an inline script in `index.html` to avoid a flash. First visit respects `prefers-color-scheme`. Light is the daytime shop-floor default (bright, high-contrast, calm); dark is for evening shifts and low-light phones.

## Color

Expressed as hex tokens (canonical, matching CLIENT_PLAN §1.1) and wired into Tailwind. Semantic surface/text/border tokens flip per theme via CSS variables in `theme.css`, surfaced to Tailwind as `bg-app`, `bg-surface`, `bg-surface-2`, `text-ink`, `text-muted`, `border-line` (named to avoid clashing with Tailwind built-ins such as the `text-base` font-size utility).

### Neutrals (per theme)
| Role | Light | Dark |
|---|---|---|
| app background | `#F7F8FA` | `#0F1115` |
| surface (cards, panels) | `#FFFFFF` | `#171A21` |
| surface-2 (sidebar, toolbars) | `#F1F3F7` | `#1F232C` |
| text (primary ink) | `#111827` | `#F3F4F6` |
| text muted | `#6B7280` | `#9CA3AF` |
| border | `#E5E7EB` | `#232733` |

Muted text is for secondary metadata only; it still must clear 4.5:1 on its surface. When in doubt, move body color toward the ink end, never toward light gray for "elegance."

### Brand & accent
- **Brand** `#E11D48` (red), hover `#BE123C`. Primary buttons, active nav, focus rings, current selection. One accent, used for action and state, not decoration.
- **Accent** `#0EA5E9` (water blue). Sparing secondary highlight (charts, subtle emphasis). Never competes with brand for "the primary action."

### Semantic
`success #16A34A` · `warning #D97706` · `danger #DC2626` · `info #2563EB`. Each renders as text/icon on a tinted background of its own hue (not gray) for banners and inline validation.

### Status (appointment lifecycle badges)
`pending` amber · `accepted` blue · `in_service` indigo · `done` green · `cancelled` red. Badges are tinted-background pills with a text label (never color-only), so `in_service` (indigo) reads as a status, not as a primary button. Keep hues distinct from the brand fill by using low-alpha tints.

### Color strategy
Restrained: tinted neutrals plus the single brand accent under ~10% of any product surface. A single flow (a completed-booking receipt, an onboarding step) may briefly go Committed. The landing hero has brand permission to go bolder.

## Typography

One family carries the product UI: **Inter** (variable, self-hosted via `@fontsource-variable/inter`, no runtime network dependency). Product register favors one well-tuned sans over a display/body pair; headings, buttons, labels, body, and tabular data all use Inter with weight and size contrast rather than a second family. A characterful display face may be introduced only for the landing hero (brand surface) in a later phase.

- **Scale (fixed rem, not fluid** — users view portals at consistent DPI): 12 / 13 / 14 (base UI) / 16 / 18 / 20 / 24 / 30 / 36. Ratio ~1.2.
- **Weights:** 400 body, 500 UI/labels, 600 headings/buttons, 700 emphasis.
- **Numerals:** tabular-nums for money, counts, and tables so columns align.
- **Prose** capped at 65–75ch; dense tables may run wider.
- `text-wrap: balance` on headings; `pretty` on long prose.

## Spacing & Layout

- 4px base, 8px rhythm (Tailwind default scale). Vary spacing for grouping; don't distribute evenly by reflex.
- Content max-width ~1200–1280px in portals; comfortable gutters.
- App shell: fixed left sidebar (role-aware) + top bar + scrollable `<Outlet/>`. Sidebar collapses to a hamburger drawer under `lg`.
- Responsive is structural (collapse sidebar, responsive tables, breakpoint columns), not fluid type. Grids without breakpoints use `repeat(auto-fit, minmax(280px, 1fr))`.
- Semantic z-index scale: dropdown → sticky → modal-backdrop → modal → toast → tooltip. No magic 999.

## Radius, elevation, borders

- Radius: `md` 8px (inputs, buttons), `xl` 12px, `2xl` 16px (cards, panels).
- Light mode: soft shadows for lift. Dark mode: lean on borders over shadows.
- Cards are used only when they are the right affordance; never nest cards.

## Motion

- 150–250ms on state transitions; ease-out (quart/quint), no bounce or elastic.
- Motion conveys state (hover, focus, open/close, status change, reveal), not decoration. No orchestrated page-load choreography in the portals.
- Every animation has a `@media (prefers-reduced-motion: reduce)` fallback (crossfade or instant).

## Components (base UI vocabulary)

`Button` (variants: primary/secondary/ghost/danger; sizes; loading + disabled), `Input`, `Select`, `Textarea`, `Card`, `Badge`/`StatusBadge`, `Modal` + `ConfirmDialog` (native `<dialog>` or portal, never clipped by overflow), `Tabs`, `Table`/`DataTable` + `Pagination`, `Spinner`, `Skeleton`, `EmptyState`, `Toast` (react-hot-toast, themed), `ThemeToggle`. Every interactive component ships default, hover, focus-visible, active, disabled, and where relevant loading + error. Same shape and vocabulary in every portal.

## Iconography

`lucide-react`, single consistent stroke style, 16–20px in UI, aligned to text baseline. Icon-only controls carry an `aria-label`.

## Assets

Brand logo at `/assets/website-logo.png` (used by public navbar, dashboard top bar, landing hero, receipt, and favicon). Service/template imagery served from the server at `/uploads/*`, with template images under `/assets/templates` until real ones are uploaded.
