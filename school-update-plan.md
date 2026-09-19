# AzCuts — School Compliance Update Plan

> PLAN ONLY — no code is changed by this document.
> Source of truth for scope: `school-requirements.txt` (research paper).
> Current system truth: `SERVER_PLAN.md` + `CLIENT_PLAN.md` + `implemented.md` (incl. Addendum) + `difference.md`.
> Rule adopted per your instruction: **everything in the system that is NOT in `school-requirements.txt` gets disabled behind `configuration.json` flags** (code stays, hidden, re-enableable later). Everything in `school-requirements.txt` must exist and be demonstrable.

---

## 0. Goal and non-goals

**Goal:** make the running system match the paper exactly by role and module, while preserving the extra work behind flags:

| Paper module | Verdict today | Plan action |
|---|---|---|
| User Account Management | ✅ exists, over-built | Gate extras (username-login, avatar, server theme, hard delete) behind flags; keep register/login/roles/deactivate |
| Appointment Management | ✅ exists, over-built | Simplify to book/view/assign/confirm/update-status/monitor/history; gate extras/auto-assign/pool/re-route/one-booking-limit/receipt-PNG behind flags; add **manual assign by admin** |
| Service Management | ✅ exists | Keep; gate service images only if panel objects (default keep, it matches "service details") |
| Sales Management | ⚠️ derived only | **NEW:** `sales` collection + barber record (service/product) + barber view + admin review/monitor + auto-create on `done` |
| Product Management | ❌ missing | **NEW:** `products` collection + admin CRUD |
| Inventory Management | ❌ missing | **NEW:** `inventory` collection (stock ledger + levels) + admin full + barber-when-authorized update + low-stock |
| Customer Management | ✅ exists | Keep users + unified history search; label it "Customer Records" |
| Dashboard | ✅ exists | Keep owner dashboard; add sales/product/stock widgets; keep barber queue + customer home |
| Report Generation | ⚠️ partial | Keep appointment/sales reports; **NEW: inventory reports**; gate charts behind flag (CSV/JSON is the school requirement) |
| Role-Based Access | ✅ exists | Keep; gate `systemMode` (always online in school mode) |
| Centralized Database | ⚠️ different tables | Add `sales, products, inventory` so ERD becomes `Users, Services, Appointments, Sales, Products, Inventory` (+ infra `settings, refreshtokens, counters`; `extras` deprecated) |

**Non-goals (do not build in this plan):** email/SMS, GCash processing, server PDF receipts, password-reset flow, CI/tests (note as limitations, same as today).

---

## 1. What gets disabled (behind flags) vs added

### 1.1 Disabled when `schoolComplianceMode: true` (all re-enableable)

- Extras / add-ons (select, duration-extend, pricing) → booking becomes service-only
- Auto-assign least-loaded, pending pool, reject re-route → replaced by **admin manual assign** + barber confirm
- One-active-booking-per-customer limit → off (paper allows history without this constraint)
- Per-booking discount %, tax rate → off (price = service price + products; snapshot still kept)
- Receipt PNG download → off (view receipt info stays)
- Ratings (prompt, edit, avg) → hidden everywhere
- System modes / maintenance page → always `online`
- Nicknames → hidden (plain name + role title)
- Real-time Socket.io → off (manual refresh; toasts stay)
- Charts (Recharts) → off (tables + CSV/JSON stay)
- Landing stats band + testimonials → hidden (hero/gallery/about/contact/location/hours stay)
- Azeu AI chatbot → hidden (route returns 503 in school mode)
- Server-persisted theme + advanced ImagePicker → local theme + basic file input only
- Username-or-email login → email-only (username field kept in DB, ignored)
- Hard user delete → hidden (deactivate `active/inactive` is the paper action)

### 1.2 Added (missing per `difference.md` G1–G6)

1. `products` model/CRUD + public active list
2. `inventory` model (current level per product + movement ledger) + update paths for admin + authorized barber
3. `sales` model (service sales + product sales, recorded-by barber/admin, auto-created when appointment → `done`)
4. Barber: Record Sales, View Relevant Sales Records, Update Stock (when authorized)
5. Admin: Manage Products, Manage Inventory (levels/availability/update), Inventory Reports, manual Assign Barber
6. Reports: inventory report (stock on hand, low stock, movement) alongside appointment + sales

---

## 2. `configuration.json` design (SPEC — file to be created in Phase S0, not yet created)

Location (proposed): repo root `configuration.json`, copied/merged into `server/config/features.js` + exposed via `GET /settings/public.features` for the client. Single shape both sides read.

```json
{
  "schoolComplianceMode": true,
  "version": "1.0.0",
  "notes": "true = enabled. false = disabled/hidden but re-enableable. School items = true, extras = false.",
  "features": {
    "userAccountManagement": { "register": true, "login": true, "logout": true, "manageAccounts": true, "assignRoles": true, "deactivateUsers": true, "deleteUsers": false, "usernameLogin": false, "avatarUpload": false, "serverPersistedTheme": false },
    "appointmentManagement": { "book": true, "view": true, "viewHistory": true, "viewStatus": true, "assignBarber": true, "confirm": true, "updateStatus": true, "monitor": true, "cancelWithReason": false, "oneActiveBookingLimit": false, "autoAssignLeastLoaded": false, "pendingPool": false, "rejectReRoute": false, "manualAssignByAdmin": true },
    "serviceManagement": { "enabled": true, "viewServices": true, "addService": true, "updateService": true, "serviceImages": true, "serviceDuration": true, "serviceAvailabilityToggle": true },
    "extras": { "enabled": false, "selectExtras": false, "extrasAffectDuration": false, "extrasAffectPricing": false },
    "salesManagement": { "enabled": true, "recordServiceSale": true, "recordProductSale": true, "viewSalesRecordsBarber": true, "reviewSalesAdmin": true, "monitorSalesAdmin": true, "autoCreateSaleOnDone": true },
    "productManagement": { "enabled": true, "addProduct": true, "updateProduct": true, "productImages": true, "productAvailabilityToggle": true },
    "inventoryManagement": { "enabled": true, "monitorStockLevels": true, "monitorAvailability": true, "updateStockAdmin": true, "updateStockBarberWhenAuthorized": true, "lowStockWarning": true },
    "customerManagement": { "enabled": true, "maintainCustomerRecords": true, "viewCustomerHistory": true },
    "dashboard": { "ownerDashboard": true, "barberQueue": true, "customerBookingHome": true, "liveCounters": true },
    "reports": { "appointmentReports": true, "salesReports": true, "inventoryReports": true, "exportCsv": true, "exportJson": true, "charts": false },
    "pricing": { "basePlusProducts": true, "discountPercent": false, "taxRate": false, "priceSnapshot": true },
    "receipts": { "viewReceipt": true, "downloadPng": false, "receiptNo": true },
    "ratings": { "enabled": false, "promptAfterDone": false, "editRating": false, "staffAvg": false },
    "scheduling": { "storeHours": true, "slotStep": true, "staffAvailabilityCheck": true, "sundayClosedDefault": true },
    "systemMode": { "enabled": false, "maintenancePage": false },
    "nicknames": { "enabled": false },
    "realtime": { "enabled": false, "socketIo": false, "toasts": true, "notificationBell": false },
    "landingCms": { "hero": true, "servicesGallery": true, "about": true, "contact": true, "location": true, "storeHoursTable": true, "statsBand": false, "testimonials": false, "meetBarbers": true },
    "theme": { "lightDarkToggle": true, "persistLocal": true, "persistServer": false },
    "aiChatbot": { "enabled": false },
    "media": { "storeInMongoDb": true, "streamingEndpoints": true, "imagePickerAdvanced": false },
    "roleBasedAccess": true,
    "centralizedDatabase": true
  }
}
```

Gating rules (to be implemented in S0):
- Server: `config/features.js` loads it once; `middleware/requireFeature('salesManagement.recordProductSale')` returns 403 `{ success:false, message:'Feature disabled in school mode' }` when off; `systemMode` middleware short-circuits to `online`; chatbot route short-circuits to 503; extras/discount/tax paths throw 400 when disabled.
- Client: `config/features.js` + `hooks/useFeatures.js` (from `/settings/public.features` with local fallback); `<FeatureGate feature="ratings.enabled">`, nav entries, wizard steps, buttons, and admin tabs render only when on.

---

## 3. New database schema (target)

Keep: `users, services, appointments, settings(singleton _id:system), refreshtokens, counters`.
Add: `products, inventory, sales`. Deprecate (keep table, ignore in school mode): `extras`.

### 3.1 `products` (NEW — paper collection `Products`)

| Field | Type | Notes |
|---|---|---|
| `name` | String, required | e.g. Pomade, Shampoo |
| `description` | String | card detail |
| `price` | Number, required | PHP, ≥0 |
| `stockQuantity` | Number, default 0 | current on-hand (denormalized from inventory ledger) |
| `lowStockThreshold` | Number, default 5 | triggers low-stock list |
| `imageData/imageType` | Buffer/String, select:false | same MongoDB pattern as services |
| `image` | String | URL or `/api/products/:id/image?v=` cache-busted |
| `isActive` | Boolean, default true | hide without deleting |
| timestamps | | |

Indexes: `{ isActive:1 }`, `{ name:1 }`.

### 3.2 `inventory` (NEW — paper collection `Inventory`)

One document per stock movement (ledger); current level lives on `products.stockQuantity`.

| Field | Type | Notes |
|---|---|---|
| `product` | ObjectId → products, required | |
| `change` | Number, required | +in / −out (e.g. +20 delivery, −1 sale/use) |
| `type` | Enum `stock_in, sale, usage, adjustment`, required | `sale` auto-created by sales flow; `usage` = barber consumed in service |
| `reason` | String | required for adjustment |
| `referenceSale` | ObjectId → sales, nullable | link when type=sale |
| `byUser` | ObjectId → users | who recorded (barber/admin) |
| timestamps | | |

Indexes: `{ product:1, createdAt:-1 }`, `{ type:1 }`.

### 3.3 `sales` (NEW — paper collection `Sales`)

| Field | Type | Notes |
|---|---|---|
| `saleNo` | String, unique | `SL-YYYYMMDD-####` via same atomic `counters` pattern as receipts |
| `customer` | ObjectId → users, nullable | null = walk-in product sale |
| `barber` | ObjectId → users, nullable | who performed/recorded |
| `recordedBy` | ObjectId → users, required | barber or admin (paper: barber records, owner reviews) |
| `appointment` | ObjectId → appointments, nullable | set when auto-created on `done` |
| `items` | Array | `{ kind: service|product, refId, name, qty, price }` — price snapshotted |
| `subtotal/total` | Number | `total = Σ qty*price` (discount/tax forced 0 in school mode) |
| `paymentMethod` | Enum `cash`, default cash | GCash stays disabled |
| timestamps | | |

Indexes: `{ recordedBy:1, createdAt:-1 }`, `{ barber:1, createdAt:-1 }`, `{ saleNo:1 }` unique.

### 3.4 Adjustments to existing collections

- `users`: no new fields. `username` kept but ignored when `usernameLogin:false`. `status active/inactive` = deactivate (paper); delete hidden. `isApproved` stays inert/reserved.
- `services`: unchanged (school Service Management).
- `appointments`: add `saleId` (nullable → sales) for traceability; add `assignedBy` (admin manual assign audit). `extras[]`, `discountPercent`, `rating` kept in schema but unused when flags off (never deleted → re-enableable). `cancelReason/cancelledBy` kept but `cancelWithReason:false` means reason optional/defaults to "Cancelled".
- `extras`: table stays, no new code; all reads/writes gated off in school mode.
- `settings`: add `features` snapshot (copy of active flags for audit) — optional; `systemMode` forced `online`; `nicknames/storeHours` kept (nicknames hidden in UI).

ER (target):
```
users(1)──< appointments >──(1)services
users(1)──< sales >──(0..1)appointments
users(1)──< inventory >──(1)products
products(1)──< inventory
products(1)──< sales.items (snapshot, not populate)
settings = singleton; refreshtokens, counters = infra
```

---

## 4. New server file tree (target — annotations only, nothing created yet)

```
/server
├── configuration.json (COPY of root flags for server fallback — S0)
├── app.js (KEEP + mount /products /sales /inventory + feature middleware)
├── server.js (KEEP)
├── config/
│   ├── db.js (KEEP)
│   ├── env.js (KEEP + FEATURE_FLAGS_PATH)
│   ├── bootstrap.js (KEEP + seed products/inventory/sales counters)
│   └── features.js (NEW — loads configuration.json, isEnabled(path), schoolMode)
├── models/
│   ├── User.js (KEEP)
│   ├── Service.js (KEEP)
│   ├── Extra.js (GATED — retained, unused in school mode)
│   ├── Appointment.js (KEEP + saleId, assignedBy fields)
│   ├── Product.js (NEW — §3.1)
│   ├── Inventory.js (NEW — §3.2 ledger)
│   ├── Sale.js (NEW — §3.3)
│   ├── Settings.js (KEEP + optional features snapshot)
│   └── RefreshToken.js (KEEP)
├── middleware/
│   ├── auth.js, roles.js, validate.js, error.js (KEEP)
│   ├── requireFeature.js (NEW — 403 when flag off)
│   ├── systemMode.js (GATED — pass-through online in school mode)
│   ├── uploadImage.js (KEEP — reused for products)
│   └── upload.js (DEPRECATED — stays unused)
├── validators/
│   ├── product.validator.js (NEW)
│   ├── inventory.validator.js (NEW — stock update rules)
│   ├── sale.validator.js (NEW)
│   └── existing validators (KEEP + flag-aware: extras/discount/rating reject when off)
├── services/
│   ├── product.service.js (NEW)
│   ├── inventory.service.js (NEW — applyChange + low-stock)
│   ├── sales.service.js (NEW — record + autoCreateOnDone)
│   ├── appointment.service.js (KEEP + manual-assign + auto-sale hook + flag guards)
│   ├── assignment.service.js (GATED — bypassed in school mode)
│   ├── scheduling.service.js (KEEP — extras branch skipped when off)
│   ├── pricing.service.js (KEEP — discount/tax forced 0 when off)
│   ├── rating.service.js (GATED — 403 in school mode)
│   ├── chatbot.service.js (GATED — 503 in school mode)
│   └── others (KEEP)
├── controllers/
│   ├── product.controller.js (NEW)
│   ├── inventory.controller.js (NEW — levels, movements, update)
│   ├── sales.controller.js (NEW — record, mine/barber list, admin list)
│   ├── appointment.controller.js (KEEP + assign endpoint)
│   ├── staff.controller.js (KEEP + record-sale + update-stock endpoints)
│   └── others (KEEP + flag guards)
├── routes/
│   ├── product.routes.js (NEW — GET public active; CRUD admin)
│   ├── inventory.routes.js (NEW — GET levels/movements; PATCH update admin + authorized barber)
│   ├── sales.routes.js (NEW — POST record; GET mine/barber/admin)
│   ├── appointment.routes.js (KEEP + PATCH /:id/assign admin-only)
│   └── others (KEEP + requireFeature wiring)
├── socket/ (GATED — init skipped when realtime.enabled:false)
├── ai/ (GATED — retained, route 503 in school mode)
├── seed/
│   ├── products.seed.json (NEW — 4-6 demo products with stock)
│   ├── inventory.seed.json (NEW — opening stock_in per product)
│   └── existing seeds (KEEP)
└── utils/ (KEEP + saleNo.js reusing receiptNo pattern)
```

---

## 5. New client file tree (target — annotations only)

```
/client/src
├── config/
│   ├── features.js (NEW — default flags + fetch /settings/public.features)
│   └── existing axios/queryClient (KEEP)
├── hooks/
│   ├── useFeatures.js (NEW — isEnabled(path))
│   ├── useProducts.js (NEW)
│   ├── useInventory.js (NEW)
│   ├── useSales.js (NEW — barber mine + admin list)
│   └── existing hooks (KEEP; useSlots/useBooking skip extras when off)
├── api/
│   ├── product.api.js (NEW)
│   ├── inventory.api.js (NEW)
│   ├── sales.api.js (NEW)
│   └── others (KEEP)
├── components/
│   ├── FeatureGate.jsx (NEW — wrapper)
│   ├── ProductCard.jsx (NEW — mirrors ServiceCard)
│   ├── StockBadge.jsx (NEW — in-stock/low/out)
│   ├── SaleModal.jsx (NEW — barber record service/product sale)
│   ├── StockUpdateModal.jsx (NEW — qty + type + reason)
│   ├── ExtraChip.jsx (GATED — hidden)
│   ├── RatingStars.jsx (GATED — hidden)
│   ├── ChatWidget.jsx (GATED — hidden)
│   ├── RealtimeBridge.jsx (GATED — mounted but no-op)
│   └── ChartPanel.jsx (GATED — hidden; tables stay)
├── pages/
│   ├── user/
│   │   ├── BookWizard.jsx (KEEP — service-only step when extras off; staff select stays but auto-route off)
│   │   ├── History.jsx (KEEP — no rate buttons; receipt view stays, PNG hidden)
│   │   └── Settings.jsx (KEEP — no nickname/avatar/theme-server)
│   ├── staff/
│   │   ├── Dashboard.jsx (KEEP + Record Sale button + confirm flow)
│   │   ├── Sales.jsx (NEW — relevant sales records)
│   │   ├── Inventory.jsx (NEW — levels + update when authorized)
│   │   ├── History.jsx (KEEP — served list; ratings hidden)
│   │   └── Settings.jsx (KEEP — basic profile only)
│   ├── admin/
│   │   ├── Dashboard.jsx (KEEP + sales/products/stock widgets)
│   │   ├── UserManager.jsx (KEEP — deactivate primary; delete hidden)
│   │   ├── AppointmentHistory.jsx (KEEP + Assign Barber modal)
│   │   ├── Inventory.jsx (KEEP services/extras-TAB-hidden + NEW Products tab + Stock tab)
│   │   ├── Sales.jsx (NEW — review/monitor all sales)
│   │   ├── Reports.jsx (NEW or extend Analytics.jsx — appointment/sales/inventory tabs, tables + CSV/JSON, charts gated)
│   │   └── SystemSettings.jsx (GATED — mode/nicknames hidden; hours/shop info stay)
│   └── public/Landing.jsx (KEEP — stats/testimonials gated off)
└── utils/constants.js (KEEP + product/sale/inventory enums)
```

Nav (target):
- Customer: Book, History, Settings (+ Products view inside Book or landing).
- Barber: Dashboard, Sales, Inventory, History, Settings.
- Admin: Dashboard, Booking History, Sales, Products/Inventory, Users, Reports, Settings.

---

## 6. Flow changes (before → after in school mode)

1. **Booking:** Service + Extras + Auto → **Service only + preferred staff (optional) + date/time**. Slot math uses service duration only. No one-booking-limit block. Pending still requires barber confirm; no pool claim.
2. **Assign:** Auto least-loaded → **Admin manual assign** (`PATCH /appointments/:id/assign { staffId }`, admin-only, validates free + on-shift, writes `assignedBy`, notifies). Barber sees it in Incoming → Confirm (accepted) → Start → Done.
3. **Done → Sale:** `advanceStatus(done)` → `sales.service.autoCreateOnDone` creates `Sale{service item, barber, customer, appointment}` + decrements any linked consumable? (v1: service sale only; product-use decrement manual via usage type).
4. **Barber sales:** Dashboard “Record Sale” → pick Service and/or Product + qty → stock check → creates Sale + `inventory{type:sale, change:-qty}` atomically. “My Sales” lists own records.
5. **Stock:** Admin Inventory → adjust (`stock_in/adjustment`); Barber Inventory (if `canUpdateStock:true` on user or role-wide allow) → `usage/sale` + reason. Low-stock list when `stockQuantity ≤ threshold`.
6. **Cancel:** reason optional (default text) instead of required.
7. **Auth:** email + password only; username ignored; register creates `user`; admin creates staff with temp password; deactivate = `status:inactive` (login 403).
8. **Reports:** three tabs — Appointments (bookings/completed/cancelled/status), Sales (revenue/count/avgTicket/top services/products/barbers), Inventory (on-hand, low-stock, movement ledger). CSV + JSON export each.

---

## 7. Flag gating strategy (how “disable but re-enableable” works)

- No file deletions. Every extra is wrapped: server `requireFeature` / early-return 403-503-400; client `FeatureGate` / `useFeatures().isEnabled`.
- `schoolComplianceMode:true` = master switch that forces the §1.1 set off regardless of individual flags (so one toggle restores full paper compliance; setting it `false` restores today’s full system).
- Smoke test per phase: boot with `true` (paper view) and `false` (legacy full view) — both must run without crashes; hidden routes must 403/503, hidden UI must not render or fetch.

---

## 8. Phases (all — build order)

### S0 — Flag foundation
- Tasks: create root `configuration.json` (§2); `server/config/features.js`; `middleware/requireFeature.js`; expose `features` in `GET /settings/public`; `client/config/features.js` + `hooks/useFeatures.js` + `components/FeatureGate.jsx`; force `systemMode=online` when school mode.
- DoD: app boots with flags on/off; `/settings/public.features` returns flags; gated dummy route returns 403 when off.

### S1 — Database models + seeds
- Tasks: `Product.js`, `Inventory.js`, `Sale.js` (§3); extend `Appointment(saleId, assignedBy)`; extend `utils/saleNo.js`; seeds `products.seed.json`, `inventory.seed.json`; `seed.js` loader (idempotent upsert).
- DoD: `node seed/seed.js` creates 5 products + opening stock; no appointments/sales wiped.

### S2 — Products backend
- Tasks: `product.validator/service/controller/routes` (`GET /products` public active-only + `GET /products/:id/image`, CRUD admin with image upload, `isActive` toggle).
- DoD: admin CRUD 201/200; public sees active only; image streams; non-admin write 403.

### S3 — Inventory backend
- Tasks: `inventory.validator/service/controller/routes` (`GET /inventory/levels?lowOnly`, `GET /inventory/movements?product`, `PATCH /inventory/update { productId, change, type, reason }`); admin full; barber requires `canUpdateStock` (new `users.canUpdateStock` boolean, default false, admin-editable) or flag `updateStockBarberWhenAuthorized`.
- DoD: stock_in +20 works; sale −1 without oversell (400 if insufficient); ledger lists; unauthorized barber 403.

### S4 — Sales backend
- Tasks: `sale.validator/service/controller/routes` (`POST /sales { items[], customerId?, appointmentId? }` with live price lookup + stock check + atomic inventory decrement; `GET /sales/mine` barber, `GET /sales` admin with filters; auto-create on appointment `done`).
- DoD: barber records product sale → stock drops + ledger `sale`; `done` appointment auto-creates service sale; double-create guarded (one sale per appointment).

### S5 — Appointments to paper spec
- Tasks: `PATCH /appointments/:id/assign` (admin manual assign); confirm semantics (`pending→accepted` = Confirm); `cancelWithReason:false` (reason optional); `oneActiveBookingLimit:false`; extras/discount/tax/rating guards (400/403 when off); `GET /appointments/staff` stays (needed for preferred-staff select).
- DoD: admin can assign unassigned booking; barber confirm/start/finish intact; extras/discount/rate calls correctly rejected in school mode, pass when flags re-enabled.

### S6 — Reports + dashboard
- Tasks: extend `analytics.service` with `inventorySummary/movements` + product/top lists; `GET /analytics/report?kind=appointments|sales|inventory&format=json|csv`; dashboard counters + today-sales + low-stock count.
- DoD: three report kinds return correct rows + CSV headers; dashboard shows sales + low-stock.

### S7 — Barber client (paper §2)
- Tasks: Dashboard confirm/start/finish + `SaleModal`; `staff/Sales.jsx` (relevant records); `staff/Inventory.jsx` (levels + update-if-authorized); History without ratings; shift toggle stays.
- DoD: barber can complete full paper loop: view assigned → confirm → update status → record sale → view sales → update stock (if authorized) → logout.

### S8 — Owner + customer client (paper §1, §3)
- Tasks: Admin `Sales.jsx`, Products + Stock tabs in Inventory, `Reports.jsx` three tabs, UserManager deactivate-first + Assign Barber modal in history, Dashboard widgets; Customer BookWizard service-only + History view-only + Products visible on landing.
- DoD: owner can do every §3 bullet from UI; customer can do every §1 bullet.

### S9 — Global gating + cleanup
- Tasks: wrap extras/ratings/chatbot/realtime/charts/stats/testimonials/nicknames/PNG/username/delete-behind `FeatureGate`; theme local-only; nav pruned; `/settings/public` trims gated fields.
- DoD: with school mode on, no hidden UI renders or fetches (network tab clean); with mode off, legacy full UI returns.

### S10 — Verification + docs
- Tasks: school checklist walkthrough (every bullet in `school-requirements.txt` demoed); `difference.md` addendum (what was added/gated); update `implemented.md` (S0–S10 log); defense script (ERD → demo path per role).
- DoD: paper-to-demo trace passes; `npm run build` + `npm run dev` green on both flag settings.

---

## 9. School checklist → where it will live (traceability)

| Paper bullet | Target endpoint / page |
|---|---|
| Customer Register/Login/Logout | `POST /auth/register, /login, /logout` → LandingAuthPanel + guards |
| View/Select Service, Date/Time, Book | `GET /services`, `GET /appointments/slots`, `POST /appointments` → BookWizard |
| View Info/Status/History | `GET /appointments/mine, /:id, /:id/receipt` → History |
| Barber Login/View Assigned/Schedules/Details/Confirm/Update Status | `GET /staff/appointments?scope=`, `PATCH accept/reject(confirm semantics), /appointments/:id/status` → staff Dashboard |
| Barber Record Sales (services/products) | `POST /sales` → SaleModal |
| Barber View Sales | `GET /sales/mine` → staff Sales |
| Barber Update Stock (authorized) | `PATCH /inventory/update` → staff Inventory |
| Owner Dashboard / Users / Roles / Deactivate | `GET /admin/dashboard`, `/admin/users` → Dashboard + UserManager |
| Owner Services | `/services` CRUD → Inventory (Services tab) |
| Owner Appointments + Assign | `GET /admin/history`, `PATCH /appointments/:id/assign` → AppointmentHistory |
| Owner Sales review/monitor | `GET /sales` → Sales + Reports(sales) |
| Owner Products / Inventory | `/products`, `/inventory/*` → Products/Stock tabs |
| Owner Customer Records | `GET /admin/users?role=user` + history search → UserManager + history |
| Reports (appt/sales/inventory) | `GET /analytics/report?kind=` → Reports (CSV/JSON) |

---

## 10. Decisions needing your OK before S0

1. `canUpdateStock` per-barber boolean (recommended) vs all-barbers-can-update? Default: per-barber, admin grants.
2. Service consumables auto-decrement? Recommended **no** for v1 (manual `usage` entries only) — avoids false stock-outs.
3. Keep service/extras images in MongoDB for new products too? Recommended **yes** (consistent).
4. Charts stay hidden in school mode (tables + exports = requirement)? Recommended **yes**.
5. `/login` + `/register` stay as redirects to landing panel (current) — acceptable as Log In/Register? Recommended **yes**, note in docs.

---

*End of plan. Next step after your approval: implement S0 (create `configuration.json` + loaders/gates), then S1–S10 in order, logging each in `implemented.md`.*
