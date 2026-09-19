# AzCuts — School Requirements vs Actual System (Difference Analysis)

Source A: `school-requirements.txt` (research paper: Customer / Barber / Owner + Main Modules + ERD `Users, Services, Appointments, Sales, Products, Inventory`)
Source B: Actual codebase per `SERVER_PLAN.md` + `CLIENT_PLAN.md` + `implemented.md` (incl. Addendum audit 2026-07-29)

Legend: ✅ covered | ⚠️ partial / different | ❌ missing in system | ➕ in system but never mentioned in school paper

---

## 1. TL;DR

* **Customer flow: fully covered + expanded.** Everything in §1 exists, plus extras, staff pick/auto, receipts, cancel-with-reason, ratings, profile/theme.
* **Barber flow: covered except sales + stock duties.** Accept/reject/start/finish, shift, history all exist. `Record Sales / View Sales Records / Update Product Usage/Stock` (§2) do **not** exist — there is no product/stock concept in code.
* **Owner flow: covered except products + stock inventory.** Users/services/appointments/sales-monitoring/dashboard/reports all exist (better than spec). `Manage Products` and `Inventory stock levels / Inventory reports` do **not** exist.
* **Biggest ERD mismatch:** paper says 6 collections `Users, Services, Appointments, Sales, Products, Inventory`. Code has 7 models `users, services, extras, appointments, settings(singleton), refreshtokens, counters` — **no `sales`, no `products`, no `inventory(stock)` collections**. Sales = derived from `appointments.priceSnapshot.total`; reports are aggregations, not stored (this part matches the paper's note).
* **Most of the real system is unlisted in the paper:** ~30+ features (extras engine, auto-assign, pricing/discount/tax, receipts, ratings, system modes, real-time sockets, AI chatbot, themes, landing CMS, analytics charts, etc.) appear nowhere in `school-requirements.txt`.

---

## 2. School REQUIRES but system DOES NOT HAVE (gaps — read as risks for defense)

| # | School requirement | Status in code | Evidence |
|---|---|---|---|
| G1 | Barber: `Record Sales Transactions (Services, Products)` | ❌ missing | No `POST /sales`, no `paymentStatus→paid` route. `paymentStatus` exists on schema but no route ever flips it to `paid` (see Addendum L). Staff can only accept/reject/start/finish. |
| G2 | Barber: `View Relevant Sales Records` | ❌ missing | `GET /staff/history` returns done list + `totalServed/avgRating/ratings` — no money/sales totals for staff. |
| G3 | Barber + Owner: `Update Product Usage / Stock Information` | ❌ missing | No stock field anywhere. `Service`/`Extra` have only `price, durationMinutes, isActive, image` — no `quantity/stock`. |
| G4 | Owner: `Manage Products — maintain product information` | ❌ missing | `server/models/` = User, Service, Extra, Appointment, Settings, RefreshToken. No `Product.js`. No `/products` routes. |
| G5 | Owner: `Manage Inventory — monitor stock levels, product availability, update stock` | ❌ missing | Inventory page = Services/Extras CRUD + `isActive` hide/show only. No stock counts, no low-stock, no usage log. |
| G6 | Owner: `Generate Inventory reports` | ❌ missing | `analytics.service` = summary/salesSeries/report (bookings, revenue, status, top services/staff). No inventory report. |
| G7 | ERD collections `Sales, Products, Inventory` | ❌ missing as collections | Sales are computed from appointments (`finishedAt` + `priceSnapshot.total`); nothing stored separately. Matches paper's "reports not stored" but contradicts the 6-collection ERD. |
| G8 | Owner: `Deactivate users` (as stated) | ⚠️ different | System does hard `DELETE /admin/users` (with self-delete + admin-delete guards) + `status:active/inactive` toggle. Deactivate exists as status, but spec has no delete; system has delete the spec never mentions. |
| G9 | Owner: `Assign available barber/stylist` (manual assign) | ⚠️ different | No manual "owner picks staff for any booking" button. Assignment = customer picks explicit staff OR auto least-loaded OR staff claims pool OR reject re-routes. Admin can view history/discount but not force-assign. |

If your panel checks strictly against the paper, G1–G6 are the items to either (a) justify as out-of-scope, or (b) implement as a small Products/Stock module.

---

## 3. System HAS but school NEVER MENTIONS (extras — the bulk of the work)

### 3.1 Booking & scheduling (beyond "select date/time")
* ➕ `Extras / add-ons` (bleaching etc.) with own price + `durationMinutes` that **extends the booked block** (`totalDuration = service + Σ extras`) and affects both slots and pricing.
* ➕ Slot engine: store-hours + `slotStepMinutes` candidates, tz-aware past-slot exclusion, `availableStaffCount`, closed-day handling.
* ➕ Staff picker: explicit staff vs **Auto (least-loaded)**. Load = count `pending+in_service`; tie-break fewest ratings → earliest joiner. Off-shift (`inactive`) staff never assigned.
* ➕ Pending pool: auto-booking with no free staff stays `pending, assignedStaff=null` awaiting claim.
* ➕ **One active booking per customer** (409 if you hold `pending/accepted/in_service`) — major product rule, nowhere in paper.
* ➕ Explicit-staff guards: 409 if busy (incl. creation-time check, not just listing), 400 if staff off-shift.

### 3.2 Appointment lifecycle (beyond "confirm/update status")
* ➕ Full state machine `pending→accepted→in_service→done`, `pending/accepted→cancelled`, terminal enforcement 409, `statusHistory[]` audit on every step.
* ➕ Staff **Reject with reason → re-route** to next least-loaded (excluding rejecter); auto-cancel `role:system` only if none remain.
* ➕ Cancel requires `cancelReason` + records `cancelledBy{userId,role}` + timestamps. `in_service→cancelled` forbidden.
* ➕ Atomic accept (`findOneAndUpdate` on `pending` + `assignedStaff∈{null,self}`) — no double-claim.

### 3.3 Money, discounts, receipts (paper just says "sales")
* ➕ Server-authoritative pricing engine (base + extras → subtotal → discount% → tax → total, 2-decimal rounding, snapshot frozen so later price edits don't rewrite history).
* ➕ Per-booking manual `discountPercent` (admin-only, blocked once done/cancelled).
* ➕ `taxRate` from Settings, `currency` PHP.
* ➕ Atomic `receiptNo` (`AZ-YYYYMMDD-####` via `counters` collection).
* ➕ Canonical receipt JSON (`GET /:id/receipt`) + client `ReceiptCard` + **PNG download** (html2canvas). No server PDF.
* ➕ Cash only — `gcash` enum exists but service throws 400 and forces `cash/unpaid`.

### 3.4 Ratings & reviews (absent from paper entirely)
* ➕ `POST /:id/rate` (owner-only, must be `done`, stars 1-5 + comment ≤500). Add **or edit**.
* ➕ Staff `avgRating/ratingCount` **recomputed from appointments** (edit never inflates count).
* ➕ Auto rating-prompt modal when booking flips to `done` + editable stars in History + reviews list on staff History.

### 3.5 Roles, auth, accounts (beyond "register/login/logout/role")
* ➕ JWT access (memory) + rotating refresh (`httpOnly` cookie `refreshToken`, `path=/api/auth`, `jti`, reuse-detection revokes all tokens).
* ➕ `username` (unique, `^[a-zA-Z0-9._]+$`) — login via **username OR email** (`identifier`). Paper says email-only.
* ➕ Admin-only staff creation (no staff self-register), `status active/inactive/in_service`, disabled-account 403, self-role-change + admin-delete guards.
* ➕ Profile update, change password, avatar upload, server-persisted `theme` (`PUT /users/theme`).
* ➕ `systemMode online/maintenance/offline` gate (login + middleware) + `/maintenance` page. Paper has no modes.
* ➕ `nicknames` list (Barber/Hairstylist/…) enforced in 3 places; store hours per weekday (Sun closed default); timezone/region/country; `shopInfo` CMS.

### 3.6 Dashboards, admin, analytics (beyond "dashboard/reports")
* ➕ Admin dashboard 6 live KPIs (active/in-service staff, bookings/customers/sales/completed today) + recent bookings.
* ➕ User Manager: paginated 20/pp (configurable 10/20/30/50), search (regex-escaped) + role/status/sort filters, create/edit/delete + password reset.
* ➕ **Unified** `GET /admin/history` (replaces paper's staff-vs-user split) with status/range/assignment/search/sort + inline discount % + discount modal. Old URLs redirect.
* ➕ Analytics page: Daily/Weekly/Monthly/Yearly/All, 6 KPI cards, Recharts line/bar/pie (sales, top services, status split, revenue by staff), CSV + JSON export. Timezone-aware bucketing.
* ➕ Staff dashboard split Incoming vs My Queue + shift toggle in Topbar + served history + stats.

### 3.7 Frontend / UX / real-time (none in paper)
* ➕ Public landing CMS (hero, services tabs, about, team, contact, location, hours-today highlight, stats band, testimonials — latter hardcoded demo), `serverAsset` + category-gradient fallbacks.
* ➕ Auth **slide-in panel** (`LandingAuthPanel`), not `/login` + `/register` pages (those redirect to `/`).
* ➕ Light/dark design system (red `#E11D48` / blue `#0EA5E9`, Inter+Oswald+Fraunces, Tailwind `dark` class, `theme-init.js` for CSP, `ThemeSync`).
* ➕ Socket.io live: `appointment:new/updated/assigned, dashboard:refresh({at} only), rating:added` + `RealtimeBridge` invalidations, toasts, Topbar bell (99 cap), StatusClock + Marquee.
* ➕ ImagePicker (browse/drag-drop/paste-URL, 5 MB guard), Avatar with initials, Reveal scroll animations, `DataTable` + rows-per-page, `ConfirmDialog`, skeletons/empty states.
* ➕ Code-split lazy routes (345 kB initial), `_redirects` + `vercel.json`, single-origin prod (server serves `client/dist`, relative `/api`), helmet CSP + `crossOriginResourcePolicy`.

### 3.8 AI + security + ops (none in paper)
* ➕ **Azeu AI chatbot**: `POST /api/chatbot/message` (public, role derived from token), 3 role prompts, Groq (`qwen3-27b`, temp 0.6, 2048 tok, tools disabled, 30s timeout), 12-turn/2000-char sanitization, 503/504/502 mapping. Global `ChatWidget` (suggestions, markdown renderer, typewriter, draggable, `az-chat-pos/seen`, a11y, disclaimer).
* ➕ Media in **MongoDB** (`avatarData/imageData` + public streaming `/users/:id/avatar`, `/services/:id/image`, immutable cache + `?v=` bust, URL-or-bytes semantics). Disk Multer legacy unused.
* ➕ Rate limits (auth 30/15m prod, api 300/m prod), validators→422 on every write, ownership checks, bcrypt-10, CORS lockdown, Multer mime/size guards, `AESCrypt` util (zero call sites), PM2 + DEPLOYMENT docs, `node seeder.js` admin-reset helper.

---

## 4. Side-by-side matrix

| School item | In system? | Notes / delta |
|---|---|---|
| Customer Register/Login/Logout | ✅ | + username, silent refresh, auth panel |
| View/Select Service | ✅ | + category tabs, ServiceCard, duration/price live |
| Select Date/Time | ✅ | + slot engine incl. extras duration + staff availability |
| Book Appointment | ✅ | + extras, staff/auto, cash, one-active limit, receiptNo |
| View Info/Status/History | ✅ | + receipt modal/PNG, cancel w/ reason, rate/edit, filters, live socket refresh |
| Barber Login/Logout | ✅ | same JWT, role gate |
| View Assigned Appts/Schedules | ✅ | `scope=incoming/mine`, queue cards |
| Review Details | ✅ | full appointment + receipt data |
| Confirm Appointment | ✅ | Accept (+ atomic claim) |
| Update Status | ✅ | Start→Finish + Reject-re-route + state-machine guards |
| Record/View Sales (barber) | ❌ | no staff sales recording/viewing |
| Update Product Usage/Stock | ❌ | no stock model |
| Owner Login/Dashboard | ✅ | 6 KPIs + activity, live |
| Manage Users (add/update/deactivate/roles) | ✅ | + delete, search/sort/pagination, avatar, nickname validation |
| Manage Services | ✅ | + extras, images, active toggle |
| Manage Appointments (view/monitor/assign) | ⚠️ | view/monitor ✅, manual assign ❌ (auto/claim instead) + discounts |
| Manage Sales Records | ✅* | *derived from appointments, no Sales collection |
| Manage Products / Inventory stock | ❌ | missing |
| Manage Customer Records | ✅ | users + unified history search |
| Reports (appt/sales/inventory) | ⚠️ | appt/sales ✅ (JSON/CSV+charts), inventory ❌ |
| Role-Based Access | ✅ | + mode gate, ownership checks |
| Centralized DB | ✅* | *different tables: no Sales/Products/Inventory; has Extras/Settings/RefreshTokens/Counters |

---

## 5. What to tell the panel

1. Your paper describes a **POS-with-products** shop (Services + Products + Stock + Sales table). Your build is a **service-booking** shop (Services + Extras, no stock, sales derived). Decide which story you defend.
2. Cheapest way to close the gap: add a minimal `Product` model (name/price/stock/isActive) + admin CRUD + `stock` decrement on sale + inventory report — reuses your existing inventory/analytics patterns.
3. Everything in §3 above is defensible bonus scope (real-time, ratings, receipts, AI assistant, modes, themes) — credit it explicitly, since none of it appears in `school-requirements.txt`.
