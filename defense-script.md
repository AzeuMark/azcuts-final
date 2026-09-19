# AzCuts — Defense Demo Script (school-compliant build)

Accounts (seeded): admin `admin@azcuts.com / Admin@123` · staff
`miguel@azcuts.com / Staff@123`, `ramon@azcuts.com / Staff@123` · customers
self-register on the landing page. Serve: `npm run dev` in `/server` (:5000)
and `/client` (:3000). Mode: `schoolComplianceMode: true` (paper view).

## Act 1 — Customer (paper §1) — 3 min
1. Landing `/`: services gallery, barbers, hours, contact (all live data).
2. Book Now → register → `/app/book`: pick service → pick barber (or Auto =
   admin assigns) → pick slot → Cash → Confirm → receipt + booking in
   `/app/history` (Pending). Note: no extras step, no one-booking block —
   service-only per paper.

## Act 2 — Owner assigns + manages (paper §3) — 4 min
1. Admin `/admin/dashboard`: staff, bookings, **shop sales today**,
   **low-stock** widgets.
2. `/admin/history` (filter Awaiting barber) → **Assign** → Miguel.
3. `/admin/users`: add staff, deactivate (status Inactive), grant
   **Can update stock**; search/sort/pagination.
4. `/admin/inventory`: Services CRUD → **Products** CRUD → **Stock** tab
   (levels + movements + update).
5. `/admin/sales`: every sale, revenue header. `/admin/analytics`:
   Appointments / **Sales** / **Inventory** tabs + CSV + JSON export each.

## Act 3 — Barber (paper §2) — 3 min
1. Staff `/staff/dashboard`: Incoming → **Accept** (= Confirm) → Start →
   **Record sale** (service + Pomade ×2 → stock drops) → Finish (auto-creates
   the service sale).
2. `/staff/sales`: own records. `/staff/inventory`: levels → **Update**
   (usage −1, needs the admin grant — show 403 before grant if asked).

## Likely questions
- **ERD?** `Users, Services, Appointments, Sales, Products, Inventory`
  (+ infra `settings, refreshtokens, counters`). Sales/inventory are real
  collections — open Compass and show them.
- **Where do sales come from?** Manual counter sales + one auto-created per
  completed booking (`saleId` on the appointment, `SL-…` numbers).
- **Why no delete button?** Paper says *deactivate* — status toggle is the
  action; delete exists in code but is flag-disabled.
- **Extras/ratings/chatbot?** Built, then disabled via `configuration.json`
  for paper scope — flip `schoolComplianceMode: false` to show them after
  the graded demo (do NOT demo unless asked).
- **Oversell?** Atomic guarded decrement — demo two rapid sales of the last
  unit; second gets 400, no orphan sale row.
