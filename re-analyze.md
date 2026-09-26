# AzCuts — Full System Analysis (handoff for a new chat)

> Purpose: everything a new session needs to understand, run, and modify this
> system without re-deriving it. Generated 2026-09-22. Source of truth files
> (read them in order if you need depth): `school-requirements.txt`,
> `SERVER_PLAN.md` + `CLIENT_PLAN.md` (partly historical — `implemented.md`
> Addendum explains what actually shipped), `implemented.md`,
> `difference.md` (§6 CLOSED is current), `configuration.json`,
> `defense-script.md`, `barbers-import.md`.

## 1. What it is

Barber shop & salon management system (MERN), single shop branch.
- `server/` — Node.js + Express 5 + Mongoose 9 + Socket.io. `npm run dev`
  (nodemon) / `npm start`. API at `http://localhost:5000/api`.
- `client/` — React 18 + Vite (dev port **3000**, strictPort) + Tailwind v3
  (`darkMode:'class'`) + React Query + Socket.io client. `npm run dev`.
- Repo-root `package.json` — monorepo runner; production can serve
  `client/dist` from the server (single-origin).
- MongoDB local: `mongodb://localhost:27017`, DB `azeubarbersalondb`.
- Install with **pnpm only** (`pnpm install`), run scripts with **npm**.
  Never `npm install` (would create a competing lockfile).
- No automated tests anywhere. `client/package.json` lint script is broken
  (ESLint not installed). Verification = live runs + browser checks.

## 2. Scope truth (school paper)

`schoool-requirements.txt` defines exactly three roles. Everything in the
paper must work; extras exist but are flag-disabled (see §6).

- **Customer:** register, login, view/select services, pick date/time, book,
  view info/status/history, logout.
- **Barber/Staff:** login, view assigned appointments/schedules, review
  details, confirm (accept), update status (start/finish), **record sales
  (services + products)**, view own sales, **update stock when authorized**
  (`canUpdateStock` grant), logout.
- **Owner/Admin:** login, dashboard, manage users (add/update/deactivate,
  assign roles — hard delete is code-present but flag-disabled), manage
  services, manage appointments (**assign barber manually** via
  `PATCH /appointments/:id/assign`, monitor), manage sales/products/
  inventory, customer records, **reports (appointments/sales/inventory,
  JSON+CSV)**.
- **ERD (paper collections, all real):** Users, Services, Appointments,
  Sales, Products, Inventory (+ infra: settings, refreshtokens, counters;
  `extras` collection retained but gated off).

## 3. Core flows & business rules

- **Booking (customer):** pick service (cover-flow carousel, auto-selects
  centered card) → pick time slot (only times with a free on-shift barber;
  server rejects slots with none, 409) → cash → confirm. Every booking lands
  **unassigned-pending**; `POST /appointments` rejects any customer `staffId`
  (400). Owner assigns via `PATCH /appointments/:id/assign` (on-shift + free
  checks, `assignedBy` audit).
- **Lifecycle:** `pending → accepted → in_service → done`, with
  `pending/accepted → cancelled`. `done`/`cancelled` terminal (409).
  Atomic accept (no double-claim). `statusHistory[]` audit on every step.
- **Money (server is source of truth):** pricing from live catalog, snapshot
  frozen on appointment (`priceSnapshot`); receipt numbers `AZ-YYYYMMDD-####`
  via atomic `counters` collection.
- **Sales:** manual counter sales (`POST /sales`, live pricing + atomic
  stock decrement + orphan rollback) + one auto-created service sale per
  completed booking (`saleId` on appointment, `SL-…` numbers).
- **Inventory:** ledger model (`stock_in/sale/usage/adjustment`), atomic
  guarded `$inc` (oversell-safe, 400 on insufficient stock). Stock edited
  only via `PATCH /inventory/update`; staff need per-barber
  `canUpdateStock`. `paymentStatus` is never flipped to `paid` (no payment
  processing; GCash enum exists but booking with it is rejected).
- **Auth:** JWT access (memory) + rotating refresh in `httpOnly` cookie
  (`refreshToken`, `path=/api/auth`, jti, reuse-detection revokes all user
  tokens). Login accepts username OR email (`identifier`). Staff created by
  admin only. Disabled accounts → 403.
- **Images:** stored as bytes in Mongo (`avatarData`/`imageData`), streamed
  via `GET /api/users/:id/avatar`, `GET /api/services/:id/image`,
  `/api/products/:id/image`. Legacy disk Multer (`middleware/upload.js`)
  is dead code.
- **Realtime (flag-off):** Socket.io rooms `user:<id>`/staff/admin;
  `appointment:new/updated/assigned`, `dashboard:refresh({at})`,
  `rating:added` via `services/notify.service.js`.

## 4. API quick map (base `/api`)

- `auth`: POST register/login/refresh/logout, GET me.
- `users`: GET/PUT profile, PUT password, POST avatar(`file`), PUT theme,
  GET `:id/avatar`. Guard chain: `auth → systemMode → requireRole`.
- `appointments`: GET slots (service+date+extras-aware), POST create,
  GET mine, GET `:id`, GET `:id/receipt`, PATCH `:id/assign` (admin),
  PATCH `:id/status`, PATCH `:id/cancel`, POST `:id/rate` (flag-off),
  GET staff (bookable roster).
- `staff`: GET appointments (`?scope=incoming|mine`), PATCH
  accept/reject, history, shift.
- `admin`: GET dashboard, users CRUD (20/page), PATCH appointment discount
  (flag-off), GET history (unified, replaces staff/users split).
- `services`/`extras`/`products` CRUD (+ image streams); `inventory`:
  GET levels/movements, PATCH update; `sales`: POST record, GET mine/all.
- `analytics`: summary/sales/report (`?kind=appointments|sales|inventory`,
  JSON+CSV). `settings`: GET public (shopInfo+services+staff+features+
  schoolComplianceMode, no auth), admin GET/PUT + nicknames.
- `chatbot/message` (flag-off → 503 in school mode).
- Errors: `{ success:false, message, errors? }`. Validators → 422.
- ⚠️ Convention (load-bearing): use **per-route guards**, never bare
  `router.use(auth…)` at a `/` mount — that once intercepted later routers
  and 403'd customer booking.

## 5. Client map

- Routes: `/` landing (auth slide-in panel; `/login`+`/register` redirect
  to `/`), `/app/*` (customer: book, history, settings),
  `/staff/*` (dashboard, sales, inventory, history, settings),
  `/admin/*` (dashboard, analytics, users, inventory, sales, history,
  settings), `/guide/*` (classmate tour, flag-gated), `/maintenance`, 404.
- Providers: QueryClient → Theme → Router → Auth → Socket.
  `AuthContext` (in-memory token, silent `/auth/refresh` on 401),
  `ThemeContext` (dark-class + localStorage, server sync off),
  `SocketContext` (auth-only when flagged).
- Shared UI: `ui/` kit (Button, Modal, Select, Pagination, Table,
  ConfirmDialog, ImagePicker…), `FeatureGate feature="x.y"` +
  `useFeatures()` (flags from `GET /settings/public`, 5-min cache, unknown
  defaults ON). `DataTable` (all tables), `StatusBadge`, `ReceiptCard`,
  `SaleModal`, `StockUpdateModal`, `ChatWidget` (flag-off), `ThemeSync`
  (local-only), `RealtimeBridge` (flag-off).
- `cn()` = clsx only (NO tailwind-merge) — conflicting classes do NOT
  resolve; write standalone class sets.

## 6. Feature flags (`configuration.json`, root)

`schoolComplianceMode: true` = paper view. DISABLE-only policy (never
delete gated code). Server: `config/features.js` + `SCHOOL_DENYLIST`
(strict-off even if individually true) + `middleware/requireFeature.js`.
Client: flags ride `GET /settings/public` → `FeatureGate`.
- OFF in school mode: extras, discounts, tax UI, receipt PNG, ratings,
  system modes (always online), nicknames, sockets, charts, chatbot,
  landing demo stats/testimonials, server theme sync, username-login,
  hard delete, AI, image-picker-advanced.
- `features.guide.enabled` (default true) gates all 7 `/guide/*` routes
  (→ 404 fallback) + both navbar links. NOT in denylist (works either
  mode). Server caches config in memory → **restart server after flipping**;
  client caches 5 min → hard-reload. `/guide/*` must still be DELETED
  (`client/src/guide/`, README has steps) before any real public deploy
  (demo credentials + internals published there).
- Toasts (global, `main.jsx`): bottom-right, 5s, custom `ToastBar` with red
  X (`toast.dismiss`).

## 7. Booking cover-flow (newest custom work, `BookWizard.jsx` + CSS)

- Hand-rolled cover-flow (no carousel lib): scroll-snap strip + CSS
  scroll-driven `view-timeline` tilt (`cf-tilt` ±60° desktop / ±22° mobile
  keyframes + `cf-shade` grayscale) in `styles/globals.css`. Needs
  `preserve-3d` on track+slide levels (flattening bug fixed before).
- Cards image-only (75vw mobile single-card / 75%-390-440px desktop fan,
  440 cap); caption outside (name/desc/price/duration + dots). Center =
  selected (geometric closest-center tracking via rAF scroll listener +
  auto-select effect; IO was unreliable with overlap). Tap centers,
  dots/chevrons/arrows funnel through center-then-select.
- Drag-to-scroll (mouse; snap suspended mid-drag, restored on release),
  overlay ‹ › chevrons, theme-aware stage (cream `rgb(245 243 236)` light /
  `#0B0D12` dark), mobile edge-fade masks, sticky mobile summary bar +
  desktop rail shown on final steps only (step>=3), glowing stepper.
- No booking logic changed (same `POST /appointments`, slots, cash,
  confirm). Category tabs preserved.

## 8. Current state (2026-09-22)

- Branch `main`, tree clean. Recent: `8e9d442` toasts, `a479dee`
  cover-flow theme/grayscale/mobile, `14c3112` booking remodel,
  `513d41b` sale modal, `4d8e54e` sale/select UI, `b4da127` modal/
  pagination/table, `2798a36` guide flag (+ older guide commits).
- **Live DB (owner is actively testing — counts move):**
  users=5 (1 admin + cristiano/joshua/zayn + `user@gg.com` self-test),
  services=4 (Bob Cut/Burst Fade/Wolf Cut/Pedicure), extras=4,
  products=5, appointments=5, sales=3, ledger=11.
  Official clean baseline for comparison: 1 admin + 3 staff, 4/4/5,
  0 appointments/sales, ledger 10.
- **Known deviations to be aware of:** admin password ROTATED (neither
  `admin` nor `Admin@123` works → admin UI unverifiable without owner);
  staff logins (`Staff@123`) work. `cristiano` currently `inactive`
  (left as-is — may be owner's live test). `guide.enabled: false`
  currently (owner hiding guide).

## 9. Landmines & working agreements with owner

- NEVER commit/push unless explicitly told ("commit" ≠ push).
- Never write secrets/keys into files. A pasted Gemini key has zero quota
  — no image generation; reuse DB/local images only.
- UI changes → live boot (:5000 + :3000) + real browser checks + build;
  create-then-delete any test data (baseline above); clean dead sessions/
  temp files; kill orphaned node/vite squatters on EADDRINUSE (ports
  5000/3000) — but never kill unrelated processes blindly.
- Shell flips between PowerShell and bash between calls — write commands
  for the shell you get (or check first). In PowerShell, quote `@refs`.
  `mongosh` `$`-operators need a script file (quoting hell otherwise);
  temp scripts live in `...\Temp\opencode\` and must be deleted.
- agent-browser sessions: always named (`session id --scope worktree
  --prefix X`), viewport via `set viewport`, fresh session defeats the
  5-min React Query flag cache.
- Answer concisely. "Do you get it?" → brief read-back, wait for "go".
  Owner iterates fast: propose → approve → build → verify → report.
  Report drift (DB/baseline) rather than silently cleaning others' data.
