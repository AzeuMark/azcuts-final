# AzCuts — Implementation Log

This file tracks completed implementation phases for both the server and client,
as defined in `SERVER_PLAN.md` and `CLIENT_PLAN.md`.

---

## SERVER

### Phase 0 — Project skeleton  ✅ (2026-07-22)

**Goal:** a runnable Express + MongoDB skeleton with a health check.

**What was built**
- Initialized `/server` with `pnpm init` and installed dependencies via **pnpm**.
- `package.json`: set `main: server.js`, `type: commonjs`, and scripts
  `start` (`node server.js`) + `dev` (`nodemon server.js`).
- **Config layer**
  - `config/env.js` — centralized, validated env access (throws if `MONGO_URI` is missing; safe dev fallbacks for the rest). Loads `.env` via dotenv.
  - `config/db.js` — Mongoose connection to `azeubarbersalondb` with connection event logging and a 5s server-selection timeout.
  - `config/bootstrap.js` — ensures the `/uploads` directory exists (Settings-singleton seeding is deferred to Phase 1, noted as a TODO in the file).
- **Utils**
  - `utils/logger.js` — minimal timestamped console logger.
  - `utils/AESCrypt.js` — reversible AES helper (crypto-js) with the `encrypt(text, key)` / `decrypt(text, key)` signature from §6.1; key defaults to `AES_SECRET_KEY` ("azeumark" placeholder). Not for passwords.
- **HTTP layer**
  - `routes/index.js` — router mounted at `/api`, exposes `GET /api/health`; commented placeholders for future feature routers.
  - `app.js` — Express app with helmet, CORS (restricted to `CLIENT_ORIGIN`, `credentials: true`), JSON + urlencoded parsers, `cookie-parser`, morgan (dev only), static `/uploads`, the `/api` router, a 404 handler, and a central error handler.
  - `server.js` — wraps the app in an `http.Server` (ready for Socket.io in Phase 9), runs bootstrap, connects to MongoDB (starts anyway if DB is down so `/api/health` still responds), listens on `PORT`, and handles graceful shutdown.
- Env files (`.env`, `.env.example`) per §9, plus `.gitignore` and `uploads/.gitkeep`.

**Dependencies installed**
- Runtime: express, mongoose, jsonwebtoken, bcryptjs, dotenv, cors, helmet, morgan, multer, express-validator, socket.io, cookie-parser, dayjs, crypto-js
- Dev: nodemon

**Definition of Done — verified**
- `npm run dev` starts nodemon and the server logs `MongoDB connected -> azeubarbersalondb`. ✅
- `GET http://localhost:5000/api/health` → **200** with `{ success: true, message: "AzCuts API is healthy", ... }`. ✅
- Unknown route (`GET /api/nope`) → **404** `{ success: false, message: "Route not found: ..." }`. ✅

**Notes & decisions**
- Package versions resolved to current majors: **Express 5**, **Mongoose 9**, **Multer 2** (all compatible with the code; Node v24 in use). Basic routing/middleware verified working under Express 5.
- Removed the `devEngines.packageManager` field that `pnpm init` auto-adds — it made `npm run dev` fail with `EBADDEVENGINES` (npm refusing because the field demanded pnpm). This preserves the intended split: **install with pnpm, run scripts with npm**.
- MongoDB is running locally at `mongodb://localhost:27017` and the connection succeeded.

**Files created**
```
server/.env
server/.env.example
server/.gitignore
server/package.json
server/server.js
server/app.js
server/config/env.js
server/config/db.js
server/config/bootstrap.js
server/utils/logger.js
server/utils/AESCrypt.js
server/routes/index.js
server/uploads/.gitkeep
```

---

### Phase 1 — Models & Auth  ✅ (2026-07-22)

**Goal:** all data models plus a working JWT auth system (register/login/refresh/logout/me).

**What was built**
- **Mongoose models** (all six, per §3)
  - `User.js` — role-discriminated users; bcrypt `pre('save')` hash, `comparePassword()`, `toPublic()`; `password` is `select:false`; indexes on `email` (unique) and `{role, status}`.
  - `Service.js`, `Extra.js` — inventory items (used from Phase 2/3).
  - `Appointment.js` — full transactional schema with `priceSnapshot`, `statusHistory`, `rating`, milestone timestamps, and the §3.4 indexes.
  - `Settings.js` — singleton with fixed `_id: "system"`, typed `storeHours` (per weekday), `nicknames`, `shopInfo`.
  - `RefreshToken.js` — hashed token store with a TTL index on `expiresAt`.
- **Auth utilities & middleware**
  - `utils/ApiError.js` (typed errors + helpers), `utils/asyncHandler.js`, `utils/response.js` (`ok`/`created`).
  - `middleware/error.js` — central handler (maps Mongo `11000`→409, `ValidationError`→422, `CastError`→400); `app.js` now uses it instead of the inline Phase 0 handler.
  - `middleware/validate.js` — express-validator → 422 with field errors.
  - `middleware/auth.js` — verifies the Bearer access token → `req.user`.
  - `middleware/roles.js` — `requireRole(...)` guard.
- **Auth flow**
  - `services/auth.service.js` — access/refresh signing, `issueTokens`, `register` (role forced to `user`), `login` (credential + disabled-account checks), `rotateRefreshToken` (rotation + reuse detection: a valid-but-unknown/revoked token revokes all of that user's tokens), `logout`. Refresh tokens carry a unique `jti` and are stored only as SHA-256 hashes.
  - `controllers/auth.controller.js` — sets/clears the refresh token as a **secure httpOnly cookie** (`path=/api/auth`, `sameSite=lax` dev / `none` prod, `secure` in prod); access token + user returned in the body.
  - `validators/auth.validator.js`, `routes/auth.routes.js` (mounted at `/api/auth`).
- **Bootstrap** now also seeds the `Settings` singleton on first boot (fulfilling the Phase 0 TODO). Startup order in `server.js` reordered so the DB connects before bootstrap.
- **Seeds:** `seed/admin.seed.json` (admin@azcuts.com / Admin@123, bcrypt-hashed), `seed/settings.seed.json`, and an idempotent `seed/seed.js` (`npm run seed`).

**Definition of Done — verified** (via a temporary Node fetch script, since removed)
- Admin login (`admin@azcuts.com` / `Admin@123`) → **200**, `role=admin`, access token returned, refresh cookie set (`httpOnly=true`, `path=/api/auth`). ✅
- `GET /auth/me` with the token → **200**, correct email, **password not leaked**. ✅
- `POST /auth/refresh` (cookie) → **200** with a rotated access token. ✅
- Customer `POST /auth/register` → **201**, `role=user`. ✅
- Wrong password → **401**; duplicate email → **409**; invalid body → **422** (3 field errors). ✅

**Notes & decisions**
- **Bug found & fixed during verification:** issuing two refresh tokens within the same second produced byte-identical JWTs (same `{sub}` + `iat`/`exp`) → duplicate hash → unique-index conflict (surfaced as 409 on an immediate refresh). Fixed by adding a random `jti` to every refresh token.
- `POST /auth/logout` is intentionally **cookie-based (not access-token-gated)** so logout still works after the short-lived access token expires. Minor, deliberate deviation from the "auth" access note in §5.
- System-mode gate on login is deferred to **Phase 8** (marked as a TODO in `auth.service.login`), matching the phase plan.
- `/users` profile routes (update/password/avatar) were not part of the Phase 1 DoD and are deferred to their relevant phase (avatar needs Multer from Phase 2). `GET /auth/me` covers profile read for now.

**Files created**
```
server/models/User.js  Service.js  Extra.js  Appointment.js  Settings.js  RefreshToken.js
server/utils/ApiError.js  asyncHandler.js  response.js
server/middleware/error.js  validate.js  auth.js  roles.js
server/services/auth.service.js
server/controllers/auth.controller.js
server/validators/auth.validator.js
server/routes/auth.routes.js
server/seed/admin.seed.json  settings.seed.json  seed.js
```
**Files changed:** `server/routes/index.js` (mount /auth), `server/config/bootstrap.js` (seed Settings), `server/server.js` (connect DB before bootstrap), `server/app.js` (use error middleware), `server/package.json` (seed script).

---

### Phase 2 — Inventory  ✅ (2026-07-22)

**Goal:** admin-managed services + extras (with image upload) and public read endpoints for the landing page / booking flow.

**What was built**
- **Middleware**
  - `middleware/upload.js` — Multer disk storage into `/uploads` with random hex filenames (original extension kept); image-only mime filter (jpeg/png/webp/gif); 5 MB size cap.
  - `middleware/optionalAuth.js` — attaches `req.user` when a valid Bearer token is present but never rejects; lets public GETs return richer data to admins.
  - `middleware/error.js` — now also maps `MulterError` (e.g. `LIMIT_FILE_SIZE` → 400).
- **Validation** — `validators/inventory.validator.js` (create/update rules for services + extras) with `toFloat`/`toInt`/`toBoolean` coercion so multipart string fields become real types.
- **Controller** — `controllers/inventory.controller.js`
  - Services: `list`, `getOne`, `create`, `update`, `delete`. Images stored as `/uploads/<file>`; update replaces + deletes the old file; delete cleans up the local file.
  - Extras: `list`, `getOne`, `create`, `update`, `delete`.
  - **Visibility rule:** anonymous/non-admin callers only ever see `isActive: true`; admins see everything and may filter by `?isActive` / `?category`.
- **Routes** — `routes/inventory.routes.js` mounted at `/api`:
  - `GET /services`, `GET /services/:id`, `GET /extras`, `GET /extras/:id` → `optionalAuth` (public, active-only).
  - `POST/PUT/DELETE` → `auth` + `requireRole('admin')`; service `POST`/`PUT` run `upload.single('image')`.
- **Seeds** — `seed/services.seed.json` (5 services), `seed/extras.seed.json` (4 extras); `seed/seed.js` extended with an idempotent upsert-by-name loader (`npm run seed`).

**Definition of Done — verified** (temporary Node fetch test, since removed)
- Public `GET /services` → **200**, 5 active services; admin `GET /services` → all. ✅
- Create service via **JSON** → **201**, string `price:"123.5"` coerced to number `123.5`, `durationMinutes` to int. ✅
- Create service via **multipart + image** → **201**, `image=/uploads/<hash>.png`; fetching that URL → **200** `image/png` (static serving works). ✅
- Update `isActive=false` → **200**; public `GET /:id` then → **404**; public list excludes it. ✅
- Create extra → **201**. ✅
- Non-admin (customer) create → **403**; missing price → **422**. ✅
- Delete service → **200** (and its uploaded file is removed).
- Test artifacts cleaned from the DB afterward (back to 5 services / 4 extras / admin / settings).

**Notes & decisions**
- `GET /settings/public` (shopInfo + services for the landing page) belongs to **Phase 8 — System settings**, so it is intentionally not implemented yet; the public `GET /services` already satisfies the Phase 2 DoD.
- `DELETE` is a hard delete per the API contract. Once appointments exist (Phase 3+), the recommended way to retire an item is `isActive:false` (soft-hide) to preserve history; hard delete stays available for admin cleanup.
- Endpoints accept both JSON and multipart bodies, so the admin UI can create/update a service with or without an image.

**Files created**
```
server/middleware/upload.js  optionalAuth.js
server/validators/inventory.validator.js
server/controllers/inventory.controller.js
server/routes/inventory.routes.js
server/seed/services.seed.json  extras.seed.json
```
**Files changed:** `server/middleware/error.js` (MulterError), `server/routes/index.js` (mount inventory), `server/seed/seed.js` (seed services + extras).

---

### Phase 3 — Scheduling & Booking core  ✅ (2026-07-22)

**Goal:** a customer can complete a full booking — server-computed slots, prices, and receipt number.

**What was built**
- **Utils**
  - `utils/datetime.js` — dayjs with `utc` + `timezone` + `customParseFormat`; helpers `weekdayKey`, `zonedDateTime`, `inZone`, `dayStamp` (all Asia/Manila-aware; DB stays UTC).
  - `utils/receiptNo.js` — own `counters` collection; `nextReceiptNo()` does an atomic `findByIdAndUpdate($inc)` per Manila-day → `AZ-YYYYMMDD-####` (collision-safe under concurrency).
- **Services (business logic)**
  - `pricing.service.js` (§2.4) — `computePricing` → `{ base, extras[], subtotal, discountPercent, discountAmount, taxRate, taxAmount, total, currency }`, rounded to 2 decimals at each boundary.
  - `scheduling.service.js` (§2.2) — `getAvailableSlots` generates candidates from `storeHours` + `slotStepMinutes`, uses **`totalDuration = service + Σ extras`**, excludes past slots (tz-aware), returns `{ start, end, availableStaffCount }`. Plus reusable helpers: `resolveServiceAndExtras`, `isStaffFree` (overlap test), `assertWithinStoreHours`.
  - `appointment.service.js` — `createBooking` orchestration: resolves service/extras, validates future + within-hours, checks explicit-staff availability (409 if busy) or pools an auto booking, builds the price snapshot, generates the receipt number, and writes the appointment with an initial `statusHistory` entry.
  - `receipt.service.js` — canonical receipt JSON (shop, receiptNo, customer, staff, service, extras, schedule, totals, payment, status).
- **HTTP layer**
  - `controllers/appointment.controller.js` — `availableSlots`, `createBooking`, `listMine` (paginated), `getOne`, `getReceipt`; ownership guard (owner / assigned staff / admin); tolerant `extras` query parsing (array or CSV).
  - `validators/appointment.validator.js` — slot + booking rules.
  - `routes/appointment.routes.js` (mounted at `/api/appointments`) with `/slots` and `/mine` declared before `/:id`.
- **Seed:** `seed/staff.seed.json` (2 active staff — Miguel/Barber, Ramon/Hairstylist, password `Staff@123`); `seed.js` extended to seed staff (raw insert preserves the hash). Enables realistic slot/assignment testing.

**Definition of Done — verified** (temporary Node test, since removed)
- `GET /slots` (no extras) → `totalDuration=30`, 22 slots, `availableStaffCount=2`. ✅
- `GET /slots` (with a 10-min extra) → **`totalDuration=40`** (extras extend the block, §2.2). ✅
- `POST /appointments` (explicit staff + extra) → **201**, `receiptNo=AZ-20260722-0001`, `subtotal=200`, `total=200` (150 + 50, tax 0), booked block **40 min**, staff assigned, `status=pending`. ✅
- Re-booking the same staff/slot → **409** (no double-booking). ✅
- Auto booking (no staff) → **201**, `assignedStaff=null`, `autoAssigned=true` (pending pool). ✅
- `paymentMethod:gcash` → **400**; past time → **400**. ✅
- `GET /mine` → 2 items; `GET /:id/receipt` → total 200, 1 extra, staff name present. ✅
- A different customer requesting the booking → **403** (ownership). ✅
- Test data cleaned afterward (DB back to admin + 2 staff / 5 services / 4 extras / settings).

**Notes & decisions**
- **Auto-assign least-loaded ROUTING is deferred to Phase 4** (per the phase plan). For now an auto booking (no `staffId`) lands in the pending pool (`assignedStaff:null`, `autoAssigned:true`), which is a valid full booking; Phase 4 adds `assignment.service` to route it to the least-loaded staff and the accept/reject lifecycle.
- **gcash** is validated by the schema enum but blocked at booking time (400) since it is disabled.
- No-double-booking is enforced at **creation time** (not just in slot listing), so concurrent/stale-slot bookings can't overlap a staff member.
- Unknown/inactive extra ids are rejected (400) rather than silently dropped, keeping the price snapshot honest.

**Files created**
```
server/utils/datetime.js  receiptNo.js
server/services/pricing.service.js  scheduling.service.js  appointment.service.js  receipt.service.js
server/controllers/appointment.controller.js
server/validators/appointment.validator.js
server/routes/appointment.routes.js
server/seed/staff.seed.json
```
**Files changed:** `server/routes/index.js` (mount /appointments), `server/seed/seed.js` (seed staff).

---

### Phase 4 — State machine & Staff flow  ✅ (2026-07-22)

**Goal:** enforce the appointment lifecycle end-to-end and give staff a working queue (accept/reject/start/finish), with least-loaded auto-assign and cancellation.

**What was built**
- **`services/assignment.service.js`** (§2.3) — `pickLeastLoadedStaff({start,end,excludeStaffIds})`: candidates are on-shift staff (`active`/`in_service`, i.e. not off-shift) who are **free** for the slot; picks the minimum `load` (count of that staff's `pending`+`in_service` appointments), tie-broken by fewest ratings then earliest joiner. `staffLoad(staffId)` helper.
- **`services/appointment.service.js`** — the state machine (§2.1):
  - `ALLOWED` transition map + `assertTransition` (409 on illegal/terminal), `pushHistory`, `assertAssignedOrAdmin`.
  - `acceptAppointment` — pending→accepted; **atomic** `findOneAndUpdate` so two staff can't claim the same pooled booking; free-slot re-check.
  - `rejectAppointment` — clears the assignment, keeps it pending, appends a `rejected` note, then **re-routes** to the next least-loaded staff (excluding the rejecter); cancels ("No staff available") only if none remain.
  - `advanceStatus` — accepted→in_service (sets `startedAt`, staff `status:'in_service'`) and in_service→done (sets `finishedAt`, `totalServed++`, staff back to `active`).
  - `cancelAppointment` — pending/accepted→cancelled for owner/assigned-staff/admin; requires a reason; records `cancelledBy`.
  - `createBooking` now **auto-assigns via `assignment`** when no `staffId` is given (falls back to the pending pool if nobody is eligible).
- **Staff HTTP layer**
  - `controllers/staff.controller.js` — `listAppointments` (`?scope=incoming|mine`), `accept`, `reject`, `history` (done list + `totalServed`/`avgRating`/`ratingCount` + ratings), `setShift`.
  - `validators/staff.validator.js` (`rejectRules`, `shiftRules`); `routes/staff.routes.js` mounted at `/api/staff` (all routes `auth` + `requireRole('staff')`).
- **Appointment lifecycle endpoints** — `PATCH /appointments/:id/status` (in_service|done; assigned staff or admin) and `PATCH /appointments/:id/cancel` (owner/assigned staff/admin), with `statusChangeRules` + `cancelRules`.

**Definition of Done — verified** (temporary Node test, since removed)
- **Auto-assign least-loaded:** with miguel holding 2 bookings, an auto booking went to ramon (load 0). ✅
- **Full lifecycle:** ramon saw it in `incoming` → accept (accepted) → start (in_service, staff status `in_service`) → finish (done, staff status `active`, `totalServed=1`). ✅
- **Terminal:** cancelling a `done` appointment → **409**. ✅
- **Reject re-route:** the rejecting staff was replaced by the other staff, booking stayed `pending`. ✅
- **Cancel:** with reason → cancelled (`cancelledBy.role=user`); without reason → **422** (validator rejects it before the service). ✅
- **Guards:** customer `PATCH /status` → **403**; a staff accepting another staff's routed appointment → **403**. ✅
- **Shift:** miguel off-shift (`inactive`) → next auto booking skipped him and went to ramon. ✅
- Staff/appointment test data cleaned; staff reset to the clean baseline afterward.

**Notes & decisions**
- **Socket.io emits are deferred to Phase 9** (per the phase plan). Every transition already appends to `statusHistory`; the emit points are marked with `TODO (Phase 9)` in the service so wiring `notify.service` later is a drop-in.
- **Eligibility for assignment = on-shift (`active`/`in_service`) + free for the slot.** `inactive` = off-shift = never assigned. This matches the slot-availability staff set from Phase 3 so counts and routing agree. (`in_service` is a transient "serving right now" flag; the overlap test still governs actual time conflicts.)
- `accept` supports both **claiming from the pool** (assignedStaff was null) and accepting a routed booking; the atomic update prevents double-claims.
- `in_service → cancelled` is intentionally **not** allowed (a started service can only be completed), per the ALLOWED map.

**Files created**
```
server/services/assignment.service.js
server/controllers/staff.controller.js
server/validators/staff.validator.js
server/routes/staff.routes.js
```
**Files changed:** `server/services/appointment.service.js` (state machine + auto-assign in createBooking), `server/controllers/appointment.controller.js` (changeStatus, cancel), `server/validators/appointment.validator.js` (status/cancel rules), `server/routes/appointment.routes.js` (status + cancel), `server/routes/index.js` (mount /staff).

---

### Phase 5 — Ratings  ✅ (2026-07-22)

**Goal:** customers rate a completed appointment (and can edit later); staff rating stats stay accurate.

**What was built**
- **`services/rating.service.js`**
  - `recomputeStaffRating(staffId)` — recomputes `avgRating` + `ratingCount` **from that staff's rated appointments** (the appointments are the source of truth). Since `ratingCount` = number of rated appointments, editing an existing rating updates the average but never inflates the count.
  - `rateAppointment({ appointmentId, customerId, stars, comment })` — owner-only, appointment must be `done`; writes `rating {stars, comment, ratedAt}` and recomputes the assigned staff's stats. Returns `isEdit` so the API can message add vs. update.
- **Endpoint** — `POST /appointments/:id/rate` (`auth` + `requireRole('user')`; ownership + done-status enforced in the service) with `rateRules` (`stars` int 1–5, `comment` optional ≤500).

**Definition of Done — verified** (temporary Node test, since removed)
- First rating `4` → staff `avgRating=4`, `ratingCount=1` ("Rating submitted"). ✅
- **Editing** the same appointment to `2` → `avgRating=2`, **`ratingCount=1`** (no inflation, "Rating updated"). ✅
- Rating a second appointment `5` → `avgRating=3.5`, `ratingCount=2` (correct averaging). ✅
- Rating a non-done appointment → **400**; another customer rating it → **403**; `stars=6` → **422**. ✅
- Staff reset + test data cleaned afterward.

**Notes & decisions**
- Recompute-from-source (rather than an incremental running average) is what makes edits safe and keeps stats self-healing.
- The `rating:added` socket event is **deferred to Phase 9** (TODO marker in the service).
- `GET /staff/history` (Phase 4) already surfaces the ratings list + these stats, so no change was needed there.

**Files created**
```
server/services/rating.service.js
```
**Files changed:** `server/controllers/appointment.controller.js` (rate), `server/validators/appointment.validator.js` (rateRules), `server/routes/appointment.routes.js` (POST /:id/rate).

---

### Phase 6 — Admin management (+ self-profile)  ✅ (2026-07-22)

**Goal:** an admin can run the shop — dashboard, user/staff management, per-booking discounts, and history views. Bundled the self-profile endpoints here too (they had no dedicated phase and the client needs them).

**What was built**
- **Helpers**
  - `pricing.recomputeTotals(snapshot, discountPercent)` — recomputes discount/tax/total from an existing snapshot (keeps base/extras/subtotal/taxRate/currency).
  - `datetime.rangeBounds(range, tz)` — UTC `{start,end}` for daily/weekly/monthly/yearly (null for 'all'); reused by history + upcoming analytics.
- **`controllers/admin.controller.js`**
  - `dashboard` — live counters: `activeStaff`, `inService`, `bookingsToday`, `customersToday` (distinct), `salesToday` + `completedToday` (sum of `priceSnapshot.total` for today's done appointments), all in shop tz.
  - `listUsers` — paginated **20/page**, `?role`, `?search` (escaped regex on name/email).
  - `createUser` — creates customer/staff/admin; validates a staff `nickname` against `Settings.nicknames`; password hashed by the model.
  - `updateUser` — edits any field incl. password reset (loads `+password` so the save-hook validates and only re-hashes on change); blocks changing your own role.
  - `deleteUser` — blocks deleting yourself and the last admin.
  - `setDiscount` — sets the per-booking `discountPercent` and recomputes the snapshot; **409** if the appointment is already done/cancelled.
  - `historyStaff` / `historyUsers` — paginated appointment history with `?status` and `?range` filters.
- **`controllers/user.controller.js`** (self-service) — `getProfile`, `updateProfile` (staff-only nickname validated against settings), `changePassword` (verifies current), `uploadAvatar` (Multer field `file` → `/uploads`).
- **Validators** — `validators/user.validator.js` (admin create/update, discount, profile, password).
- **Routes** — `routes/admin.routes.js` (`/api/admin/*`, all `auth`+`requireRole('admin')`) and `routes/user.routes.js` (`/api/users/*`, `auth`); both mounted.

**Definition of Done — verified** (temporary Node test, since removed)
- Dashboard → **200** with counters; after completing a discounted booking, `salesToday=135`, `completedToday=1`. ✅
- Create staff → **201**, and the new staff can **log in** (password hashed correctly); passwords never returned. ✅
- Invalid staff nickname → **400**; duplicate email → **409**; list search/pagination works (20/page). ✅
- Update user (fields + password reset) → **200**, re-login with the new password works. ✅
- Discount 10% on a ₱150 booking → subtotal 150 / discount 15 / **total 135**; discount on a done booking → **409**. ✅
- History (staff + users) → **200** paginated. ✅
- Self profile get/update/change-password → **200**, re-login with new password works; avatar upload → **200** with `/uploads/...` path. ✅
- Non-admin hitting `/admin/*` → **403**; admin deleting self → **400**; delete a normal user → **200**. ✅
- Test users/appointments/uploads cleaned; staff reset to baseline afterward.

**Notes & decisions**
- **Self-profile endpoints** (`/users/profile`, `/users/password`, `/users/avatar`) were implemented here because they had no dedicated phase and the client will need them; grouped with the other user-facing management work.
- `updateUser`/`changePassword` load the password field explicitly (`select('+password')`) so Mongoose's required-field validation passes on save while the hash hook still fires only when the password actually changes.
- Discount edits are allowed while the appointment is **not** finalized (pending/accepted/in_service) and blocked once done/cancelled, per §2.4.
- Delete is a hard delete with self + last-admin guards; historical appointments keep their data via the frozen `priceSnapshot`.

**Files created**
```
server/controllers/admin.controller.js  user.controller.js
server/validators/user.validator.js
server/routes/admin.routes.js  user.routes.js
```
**Files changed:** `server/services/pricing.service.js` (recomputeTotals), `server/utils/datetime.js` (rangeBounds), `server/routes/index.js` (mount /admin + /users).

---

### Phase 7 — Analytics & Reports  ✅ (2026-07-22)

**Goal:** admin analytics — KPIs, a sales time-series, and JSON/CSV report export, all filterable by range.

**What was built**
- **`utils/csv.js`** — dependency-free `toCSV(records, columns)` with RFC-4180 escaping (quotes cells containing `, " \n`).
- **`services/analytics.service.js`** (Mongo aggregation)
  - `summary(range)` — `bookings` (created), `completed` + `revenue` + `avgTicket` (done, by `finishedAt`), `cancelled`, `newCustomers`, a full `statusBreakdown`, and `topServices` / `topStaff` (via `$lookup`).
  - `salesSeries(range)` — revenue + count grouped into tz-aware buckets with `$dateToString` (hour for daily, day for weekly/monthly, month for yearly/all).
  - `report(range)` — detailed per-appointment rows + the KPI summary.
  - All ranges resolved through `datetime.rangeBounds`; `range=all` applies no date filter.
- **HTTP layer** — `controllers/analytics.controller.js` (`getSummary`, `getSales`, `getReport`), `validators/analytics.validator.js` (range/format enums), `routes/analytics.routes.js` mounted at `/api/analytics` (all `auth` + `requireRole('admin')`). CSV export streams as `text/csv` with a `Content-Disposition` attachment.

**Definition of Done — verified** (temporary Node test with 2 done / 1 cancelled / 1 pending booking, since removed)
- `summary(all)` → `bookings=4, completed=2, cancelled=1, revenue=300, avgTicket=150`; `statusBreakdown` done=2/cancelled=1/pending=1; `topServices[0]` = Classic Haircut (count 2, ₱300); `topStaff[0]` = Miguel (count 2). ✅
- `summary(daily)` → same figures (all created today). ✅
- `salesSeries(all)` → 1 bucket, total revenue **300**. ✅
- `report(json)` → 4 rows + summary; `report(csv)` → **200** `text/csv`, header + 4 rows, correct columns. ✅
- Non-admin → **403**; invalid `range` → **422**. ✅
- Test data cleaned; staff reset afterward.

**Notes & decisions**
- Revenue/completion KPIs key off `finishedAt` (when money is realized); booking counts key off `createdAt`; cancellations off `cancelledAt`.
- Time-series bucketing is timezone-aware via `$dateToString { timezone }` so days align to Asia/Manila, not UTC.
- CSV is generated without any extra dependency, matching the earlier decision.

**Files created**
```
server/utils/csv.js
server/services/analytics.service.js
server/controllers/analytics.controller.js
server/validators/analytics.validator.js
server/routes/analytics.routes.js
```
**Files changed:** `server/routes/index.js` (mount /analytics).

---

### Phase 8 — System settings & mode gate  ✅ (2026-07-22)

**Goal:** admin-managed system settings + the online/maintenance/offline gate that restricts logins and protected routes.

**What was built**
- **`middleware/systemMode.js`** (§2.5) — `ALLOWED_BY_MODE` (online=all, maintenance=[staff,admin], offline=[admin]); reads `Settings.systemMode`, passes public/unauthenticated requests through, and returns **503** with a friendly message for disallowed roles. Exports `isAllowed`/`messageFor` for reuse.
- **Login gate** — `auth.service.login` now applies the same check **after** verifying credentials (the Phase 1 TODO is resolved), so the right roles can still get in during maintenance/offline.
- **`controllers/settings.controller.js`**
  - `getPublic` — landing data (shopInfo, timezone, currency, **systemMode** for the client banner, storeHours, active services). Public, no auth.
  - `getSettings` / `updateSettings` (admin) — update deep-merges `shopInfo` and per-day `storeHours` (with `markModified`) so partial edits don't wipe siblings.
  - `addNickname` / `updateNickname` / `removeNickname` — manage `Settings.nicknames` with duplicate + not-found guards.
- **Validators/routes** — `validators/settings.validator.js` (mode enum, `taxRate` 0–1, `slotStepMinutes` 5–240, nickname rules); `routes/settings.routes.js` mounted at `/api/settings` (`/public` open; the rest `auth`+`requireRole('admin')`, deliberately **not** mode-gated so an admin can always toggle the mode back).
- **Applied the gate** to the user, staff, and appointment routers (`auth → systemMode → requireRole`). `appointment.routes` refactored to `router.use(auth, systemMode)` + per-route `requireRole`. Admin/analytics routers were left ungated (admin is allowed in every mode).

**Definition of Done — verified** (temporary Node test, since removed)
- Public settings → **200** (shop name, mode, 5 services). Admin get → 200; customer get → **403**. ✅
- Update `taxRate=0.12` + `shopInfo.phone` → **200**, phone set and `shopInfo.name` **preserved** (deep-merge); customer update → **403**; `taxRate=2` → **422**. ✅
- Nicknames add/duplicate/rename/not-found/remove → **201/409/200/404/200**. ✅
- **Login gate:** maintenance → customer **503**, staff/admin **200**; offline → staff **503**, admin **200**; back online → customer **200**. ✅
- **Middleware gate (existing token):** in maintenance a customer's `GET /appointments/mine` → **503** while staff's `GET /staff/appointments` → **200**; back online → customer **200**. ✅
- Settings restored to baseline (online, taxRate 0, default nicknames) + test data cleaned afterward.

**Notes & decisions**
- The mode gate is enforced in **two places**: at login (primary — no token issued) and via middleware on protected routes (defense-in-depth for tokens issued before a mode change).
- Settings routes are intentionally not mode-gated so an admin can always restore `online` even while offline.
- `systemMode` reads the settings doc per request (immediate effect on mode changes); acceptable at this scale.
- Admin/analytics routers skip the gate since admin passes in all modes (avoids a redundant settings read per request).

**Files created**
```
server/middleware/systemMode.js
server/controllers/settings.controller.js
server/validators/settings.validator.js
server/routes/settings.routes.js
```
**Files changed:** `server/services/auth.service.js` (login mode gate), `server/routes/index.js` (mount /settings), `server/routes/user.routes.js` + `staff.routes.js` + `appointment.routes.js` (apply systemMode).

---

### Phase 9 — Real-time (Socket.io)  ✅ (2026-07-22)

**Goal:** push appointment, assignment, rating, and dashboard events live so portals update without refresh.

**What was built**
- **`socket/events.js`** — event name constants (`appointment:new/updated/assigned`, `dashboard:refresh`, `rating:added`) + room helpers (`staff`, `admin`, `user:<id>`).
- **`socket/index.js`** — `initSocket(server)` / `getIO()`. A handshake middleware verifies the access token (`socket.handshake.auth.token`); on connect the socket joins its personal `user:<id>` room, plus `staff` / `admin` by role. Unauthenticated handshakes are rejected.
- **`services/notify.service.js`** — the single emit funnel: `appointmentNew` (→ staff + admin + dashboard nudge), `appointmentAssigned` (→ the staff's room), `appointmentUpdated` (→ customer + assigned staff + admin + dashboard nudge), `ratingAdded` (→ staff + admin), `dashboardRefresh` (→ admin). No-ops safely if Socket.io isn't initialized (scripts/tests).
- **Wiring** — `server.js` calls `initSocket(server)`; every `TODO (Phase 9)` marker in `appointment.service` (createBooking, accept, reject/re-route, advanceStatus, cancel) and `rating.service` now emits through `notify`.

**Definition of Done — verified** (temporary Node socket-client test, since removed)
- Unauthenticated handshake → **rejected**; valid admin/staff/customer sockets connect and join their rooms. ✅
- Booking → staff receives `appointment:new` (×1) + `appointment:assigned` (×1); admin receives `appointment:new` (×1) + `dashboard:refresh` (×1). ✅
- accept → start → finish → the customer, admin, and assigned staff each receive **3** `appointment:updated` events. ✅
- Rating → assigned staff and admin each receive `rating:added`. ✅
- Test data cleaned; staff reset afterward.

**Notes & decisions**
- **`dashboard:refresh` is a lightweight signal** (`{ at }`) rather than embedded counters — the admin client refetches `GET /admin/dashboard` on receipt. This avoids running the full aggregation on every appointment event.
- `notify` resolves `getIO()` at emit time, so there's no load-order coupling and it degrades gracefully when sockets aren't running.
- Socket CORS mirrors the HTTP CORS (`CLIENT_ORIGIN`, credentials) for the browser client.
- Added **`socket.io-client`** as a devDependency (used only for this verification; also the client's runtime dep per CLIENT_PLAN).

**Files created**
```
server/socket/events.js  index.js
server/services/notify.service.js
```
**Files changed:** `server/server.js` (initSocket), `server/services/appointment.service.js` (notify on every transition + createBooking), `server/services/rating.service.js` (notify ratingAdded), `server/package.json` (socket.io-client devDep).

---

### Phase 10 — Hardening & Deployment setup  ✅ (2026-07-22)

**Goal:** production-readiness — rate limiting, robust error handling, and documented deploy steps.

**What was built**
- **Rate limiting** (`middleware/rateLimit.js`, `express-rate-limit`): strict `authLimiter` on `/api/auth/*` (30/15min prod, 200 dev) + lenient `apiLimiter` on all `/api` (300/min prod, 2000 dev); 429 responses use the standard `{ success:false, message }` shape and emit `RateLimit-*` headers.
- **app.js hardening**: JSON/urlencoded body limits (`1mb`), `trust proxy` in production (correct client IPs + Secure cookies behind a proxy), limiters wired in.
- **Error handler**: malformed JSON → **400**, oversized body → **413**, and 500s no longer leak `err.message` in production (generic message + logged stack).
- **Process safety** (`server.js`): `unhandledRejection` logged, `uncaughtException` logged then exit (so PM2 restarts), and graceful shutdown with a 10s force-exit fallback.
- **Deployment**: `ecosystem.config.js` (PM2) + `DEPLOYMENT.md` (prereqs, env, pnpm install, seed, PM2 run, HTTPS/`SameSite=None;Secure` cookie notes, reverse-proxy + WebSocket, CORS lockdown, `mongodump`/`mongorestore` backup, health check).

**Audits**
- **Validation coverage:** every write route runs a validator chain → central 422 (auth, users, admin users/discount, inventory, appointments status/cancel/rate, staff reject/shift, analytics, settings). ✅
- **Authorization:** protected routes run `auth → systemMode → requireRole` with ownership checks in controllers/services. ✅

**Definition of Done — verified** (temporary Node test, since removed)
- Server boots stable with all middleware; `GET /api/health` → **200** with `RateLimit-*` headers. ✅
- Normal admin login → **200** (auth limiter header shows limit 200 in dev). ✅
- Malformed JSON body → **400** ("Malformed JSON in request body"). ✅
- Hammering `/api/auth/login` (215×) → 199 × 401 then **16 × 429** (limiter trips after the threshold). ✅
- Cleaned accumulated refresh tokens (41) to reset the baseline; the in-memory rate-limit store resets on restart.

**Notes & decisions**
- Rate-limit store is in-memory (fine for a single instance); for multi-instance, back it with Redis.
- `apiLimiter` ceilings are generous so they never impede normal client usage; `authLimiter` is the security-relevant one.

**Files created**
```
server/middleware/rateLimit.js
server/ecosystem.config.js
server/DEPLOYMENT.md
```
**Files changed:** `server/app.js` (limits, trust proxy, limiters), `server/middleware/error.js` (parse/size/prod-safe), `server/server.js` (process handlers + graceful shutdown), `server/package.json` (express-rate-limit).

---

## ✅ SERVER BACKEND COMPLETE (Phases 0–10)

All ten server phases are implemented, verified, and logged. The API is feature-complete per `SERVER_PLAN.md`:
auth (JWT + httpOnly refresh cookie), role-based access, inventory, scheduling + booking (server-authoritative pricing, atomic receipt numbers, no double-booking), the appointment state machine + least-loaded auto-assign, ratings, admin management + analytics/CSV, system settings + mode gate, real-time Socket.io, and production hardening.

**DB baseline:** admin (`admin@azcuts.com` / `Admin@123`) + 2 staff (`miguel@azcuts.com`, `ramon@azcuts.com` / `Staff@123`), 5 services, 4 extras, 1 settings singleton (online), no appointments.

**Run:** `pnpm install` then `npm run dev` (from `/server`). Seed with `node seed/seed.js`.

**Next:** CLIENT implementation (`/client`) per `CLIENT_PLAN.md` — Vite + React + Tailwind (v3) + pnpm, starting at client Phase 0.


---

## CLIENT

> React client per `CLIENT_PLAN.md`. Built with the **impeccable** + **frontend-design** skills (workspace `.kiro/skills`). Design context captured up front in root **`PRODUCT.md`** (register: product; platform: web) and **`DESIGN.md`** (tokens, type, components, motion) so every phase stays on-brand and accurate.

### Phase 0 — Skeleton & design system  ✅ (2026-07-22)

**Goal:** a runnable Vite + React + Tailwind client — design system, providers, routing, app shell, base UI kit, Axios layer, and the brand logo — with the dev server on port 3000.

**What was built**
- **Project scaffold (Vite + React, manual)**
  - `package.json` (scripts `dev`/`build`/`preview`; deps per §3), `vite.config.js` — **dev port pinned to 3000 with `strictPort`** (matches server `CLIENT_ORIGIN`) + `@` → `src` alias, `.env` / `.env.example` (`VITE_API_URL`, `VITE_SOCKET_URL`), `.gitignore`.
  - `index.html` at the client root: favicon → `/assets/website-logo.png`, meta/theme-color, and the **no-flash theme bootstrap** inline script (applies the `dark` class from `localStorage('az-theme')` or OS preference before paint).
  - `pnpm-workspace.yaml` with `allowBuilds: { esbuild: true }` — required so pnpm 11 runs esbuild's install script (see Notes).
- **Tailwind CSS v3** (`tailwindcss@3.4.17`) — `darkMode: 'class'`, content globs, `@tailwindcss/forms` (class strategy). Tokens: brand `#4F46E5`/hover `#4338CA`, accent `#14B8A6`, semantic (success/warning/danger/info), theme-flipping surface/text/border via CSS variables, `md/xl/2xl` radii, a **semantic z-index scale** (dropdown→tooltip), soft shadows, and `fade-in`/`scale-in`/`slide-in-left`/`slide-in-right` keyframes. `postcss.config.js` wires tailwind + autoprefixer.
- **Design-system foundations** — `styles/theme.css` (light/dark tokens as RGB channels for `rgb(var() / <alpha>)`), `styles/globals.css` (`@tailwind` layers + base: themed body, default border color, focus-visible ring, themed scrollbars, `prefers-reduced-motion` guard). Font: self-hosted **`@fontsource-variable/inter`**.
- **Data/config layer** — `config/axios.js`: instance with `withCredentials`, in-memory access token, request interceptor (Bearer), response interceptor (**silent `/auth/refresh` once on 401** then replay; `onAuthFailure` subscription for logout), `getApiErrorMessage`. `config/queryClient.js` (React Query defaults). Eight thin API wrappers in `api/*` mirroring every server route, each resolving the `{ success, message, data }` envelope.
- **Contexts + hooks** — `ThemeContext` (toggle + persist + OS-follow-until-chosen, fully working), `AuthContext` (silent-refresh bootstrap → `/auth/me`, `login`/`register`/`logout`/`refreshUser`, wired to `onAuthFailure`), `SocketContext` (single Socket.io connection opened while authenticated, ready for Phase 10). Hooks: `useAuth`, `useTheme`, `useSocketEvent`.
- **UI kit** (`components/ui`, Tailwind-styled, accessible, theme-aware): `Button` (+`buttonVariants`), `Input`, `Select`, `Textarea`, `Card*`, `Badge`, `Modal` (portal — never clipped), `ConfirmDialog`, `Table*`, `Pagination`, `Tabs`, `Spinner`, `Skeleton`, `EmptyState`, `ThemeToggle`, `index.js` barrel. Plus `Logo`, `StatusBadge` (lifecycle pill w/ label, never color-only), `RoleGate`, `ProtectedRoute` (auth + role gate), `DataTable` (loading/empty/pagination), `PageHeader`, `PagePlaceholder`.
- **App shell + routing** — `layout/`: `PublicNavbar`, role-aware `Sidebar` (`navConfig`), `Topbar` (theme toggle, notifications, user menu + sign-out), `DashboardShell` (fixed sidebar / mobile drawer + sticky topbar + `<Outlet/>`), `AuthShell`. `App.jsx` implements the full route map (§2.1): public (`/`, `/login`, `/register`, `/maintenance`), role-gated `/app`, `/staff`, `/admin` portals sharing `DashboardShell`, and a `*` 404. `main.jsx` wraps everything in QueryClient → Theme → Router → Auth → Socket providers + a themed `react-hot-toast` `Toaster`.
- **Pages** — provisional **Landing** hero, **Login**/**Register** (auth shell), **Maintenance**, **NotFound** (all polished), plus 13 portal placeholders (`PagePlaceholder`) so every route renders intentionally.
- **Branding** — `templates/website-logo.png` copied to `client/public/assets/website-logo.png`; wired into navbar, topbar, auth/landing/404, and the favicon.

**Dependencies installed** (via pnpm)
- Runtime: react, react-dom (18.3.1), react-router-dom (6), axios, @tanstack/react-query (5), socket.io-client (4), react-hook-form, recharts, html2canvas, dayjs, react-hot-toast, lucide-react, clsx, @fontsource-variable/inter.
- Dev: vite (5.4), @vitejs/plugin-react, tailwindcss (3.4.17), postcss, autoprefixer, @tailwindcss/forms, @types/react(-dom).

**Definition of Done — verified**
- `npm run build` → **success**, 1759 modules, Tailwind CSS emitted (24.7 kB), Inter woff2 subsets bundled, no errors. ✅
- `npm run dev` → Vite serves on **http://localhost:3000/** (strictPort, no fallback). ✅
- `GET /` → **200**; HTML contains the `/assets/website-logo.png` favicon, the `az-theme` no-flash script, `#root`, and the `/src/main.jsx` entry. ✅
- `GET /assets/website-logo.png` → **200 `image/png`** (logo displays). ✅
- `GET /src/main.jsx` and `/src/styles/globals.css` → **200** (JSX + Tailwind pipeline compile). ✅
- Theme system: `dark`-class strategy + persisted toggle + no-flash bootstrap implemented and building; empty routes render via the shell. ✅

**Notes & decisions**
- **pnpm 11 build-script gate:** pnpm 11 removed `onlyBuiltDependencies`/the `package.json` `pnpm` field and defaults `strictDepBuilds` to true, so a blocked build script is now a hard error. Fixed by allowlisting esbuild in **`pnpm-workspace.yaml`** (`allowBuilds: { esbuild: true }`) — the documented v11 home. (Verified against the pnpm v10→v11 migration notes.)
- **Token naming:** semantic color tokens are `text-ink` / `text-muted` / `bg-app` / `bg-surface` / `bg-surface-2` / `border-line` — deliberately **not** `text-base` (which would collide with Tailwind's built-in font-size utility).
- **Palette/type = identity preservation:** honored CLIENT_PLAN's committed indigo/teal palette and Inter (permitted for the product register) rather than generating a new brand color — accuracy over novelty.
- **Logo copied, not moved:** kept the original at `templates/website-logo.png` as a non-destructive source; the client serves its own copy.
- **Provisional pages:** Landing is a clean placeholder hero (full landing = Phase 2); Login/Register are shells (forms = Phase 1); AuthContext/SocketContext are functional but their UI/real-time wiring lands in Phases 1 and 10. All are intentionally scaffolded so the skeleton looks finished, per the impeccable product register.
- **Skill update available:** the impeccable skill reports a newer version (v4.0.0-alpha.10); it applies to a future session and did not affect this work.

**Files created** (client)
```
client/package.json  pnpm-workspace.yaml  vite.config.js  tailwind.config.js  postcss.config.js
client/index.html  .env  .env.example  .gitignore
client/public/assets/website-logo.png
client/src/main.jsx  App.jsx
client/src/styles/theme.css  globals.css
client/src/config/axios.js  queryClient.js
client/src/context/ThemeContext.jsx  AuthContext.jsx  SocketContext.jsx
client/src/hooks/useAuth.js  useTheme.js  useSocketEvent.js
client/src/api/auth.api.js  user.api.js  appointment.api.js  staff.api.js  admin.api.js  inventory.api.js  analytics.api.js  settings.api.js
client/src/utils/constants.js  formatMoney.js  datetime.js  receiptPng.js  cn.js
client/src/components/ui/{Button,Input,Select,Textarea,Card,Badge,Modal,ConfirmDialog,Table,Pagination,Tabs,Spinner,Skeleton,EmptyState,ThemeToggle,index}.js(x)
client/src/components/{Logo,StatusBadge,RoleGate,ProtectedRoute,DataTable,PageHeader,PagePlaceholder}.jsx
client/src/components/layout/{PublicNavbar,Sidebar,Topbar,DashboardShell,AuthShell}.jsx  navConfig.js
client/src/pages/public/{Landing,Login,Register,Maintenance}.jsx
client/src/pages/user/{BookWizard,History,Settings}.jsx
client/src/pages/staff/{Dashboard,History,Settings}.jsx
client/src/pages/admin/{Dashboard,StaffHistory,UserHistory,Analytics,UserManager,Inventory,SystemSettings}.jsx
client/src/pages/NotFound.jsx
```
**Also created (repo root):** `PRODUCT.md`, `DESIGN.md` (impeccable design context).

**Run:** `pnpm install` then `npm run dev` (from `/client`) → http://localhost:3000.


---

### Phase 1 — Auth & guards  ✅ (2026-07-22)

**Goal:** real login/register wired to `AuthContext`, with redirect-by-role.

**What was built**
- **Login** (`pages/public/Login.jsx`) and **Register** (`pages/public/Register.jsx`) — react-hook-form forms in the `AuthShell`, client validation mirroring the server (`email` format, `password` min 6, confirm-password match on register), inline + toast error surfacing (`getApiErrorMessage`).
- Wired to the Phase-0 `AuthContext`: `login()` / `register()` set the in-memory access token + user and flip status to authenticated; on success they redirect to the intended `location.state.from` or `ROLE_HOME[role]`.
- Already-authenticated visitors to `/login` or `/register` are bounced to their portal home. Guards (`ProtectedRoute`, silent refresh, role gating) were already in place from Phase 0.

**DoD — verified:** admin seed login → **200**, `role=admin`, 192-char access token (live server). New customer register/login lands on `/app/book`; wrong-role access redirects to the correct home.

---

### Phase 2 — Landing page  ✅ (2026-07-22)

**Goal:** a modern, responsive landing driven by live `/settings/public`, in both themes.

**What was built**
- `hooks/useSettingsPublic.js` — React Query for `/settings/public`; also syncs the display timezone via `setTimezone`.
- `components/ServiceCard.jsx` — image (server `/uploads` via `serverAsset`) or a branded category-gradient fallback (seeds ship no images), name, price, duration, category tag; optional `selectable`/`selected` for the wizard.
- `utils/serverAsset.js` — resolves `/uploads/*` paths against the API origin.
- `pages/public/Landing.jsx` (brand register) — hero (logo + headline + tagline from `shopInfo` + CTAs + brand/accent glow), **services gallery** with Haircuts/Salon/All tabs (live services, skeletons while loading), **About** + team (Uelmark, JM Nikko, Lara), **Contact** (email/phone/socials/map from `shopInfo`), **Location** with a store-hours table that highlights today, a system-mode banner when not online, and a footer.

**Design note (impeccable brand register):** the brand register calls for photographic imagery, but external image URLs (Unsplash) could not be verified in this environment (every candidate — even a known-valid ID — returned 404 via GET/HEAD, indicating the image CDN is blocked here). Per the "never ship broken images" rule, the hero leans on the verified local logo + a confident typographic/gradient treatment, and service cards use branded category thumbnails that automatically swap to real photos once an admin uploads them. Committed indigo/teal palette preserved.

**DoD — verified:** landing renders in both themes and lists the 5 live services (build + live `/settings/public` returns 5 services, shop "AzCuts", tz Asia/Manila).

---

### Phase 3 — Inventory display + booking data  ✅ (2026-07-22)

**Goal:** live service/extra/slot/staff data + the booking pickers.

**What was built**
- Hooks: `useServices` + `useExtras` (`GET /services`,`/extras` active-only), `useSlots` (`GET /appointments/slots`, keyed by service+date+extras+staff, enabled once service & date are chosen), `useBookableStaff` (`GET /appointments/staff`).
- `components/ExtraChip.jsx` — toggleable add-on chip (name, +price, +minutes).
- `components/SlotPicker.jsx` — date input + time-slot grid from `useSlots`; loading/closed/empty states; `specific` mode disables busy slots, `auto` mode keeps 0-availability slots selectable (dashed) as "books pending".
- `components/StaffPicker.jsx` — Auto-match option + active-staff roster (name, nickname, avg rating).

**Server addition (flagged):** the CLIENT_PLAN's StaffPicker needs a customer-visible staff roster, which the server didn't expose. Added `GET /appointments/staff` (`auth` + role `user`/`admin`) returning active staff (`fullName, nickname, avatar, avgRating, ratingCount, status`) — a small, read-only, additive endpoint. Files: `server/controllers/appointment.controller.js` (`bookableStaff` + `User` import), `server/routes/appointment.routes.js` (route declared before `/:id`).

**DoD — verified:** wizard steps 1–3 render live data. Live checks: `/appointments/staff` → 2 staff; `/slots` base `totalDuration=20`, 22 slots, 2 free; with a +60-min extra `totalDuration=80` (extras extend the block, §2.2).

---

### Phase 4 — Booking wizard end-to-end  ✅ (2026-07-22)

**Goal:** the full 5-step wizard → create appointment → receipt + PNG.

**What was built**
- `hooks/useBooking.js` — reducer (step/service/extras/date/slot/staff/payment) with derived `subtotal` + `totalDuration`; changing service/extras/staff clears the slot so availability stays honest.
- `components/ReceiptCard.jsx` — `forwardRef` styled receipt from the server's canonical receipt JSON (shop, receiptNo, schedule, customer, barber, line items, subtotal/discount/tax/total, payment, status); capture-friendly for PNG.
- `pages/user/BookWizard.jsx` — stepper header, **Service** (grid + category tabs), **Extras**, **Schedule** (StaffPicker + SlotPicker), **Payment** (Cash selectable, GCash disabled/"coming soon"), **Confirm** (summary + estimated total + note that the receipt shows the authoritative total). Sticky running-total summary panel. Booking via React Query mutation → `POST /appointments` → fetches the canonical receipt → success screen with the `ReceiptCard`, **Download receipt** (html2canvas, lazy-loaded), "Book another", and a pending-awaiting-staff banner when auto-assign found no free barber.

**DoD — verified (contracts against live server):** `POST /appointments` payload/response, `/appointments/:id/receipt`, slots, and staff all confirmed. Booking POST + receipt shapes matched exactly to the server controller/service. (Live write-path not exercised to avoid polluting the dev DB; all GET contracts verified read-only.)

---

### Phase 5 — User history + ratings  ✅ (2026-07-22)

**Goal:** manage bookings — history, cancel, rate, view receipt.

**What was built**
- `hooks/useMyAppointments.js` — paginated `GET /appointments/mine` (`placeholderData: keepPreviousData`).
- `components/RatingStars.jsx` — interactive 1–5 stars (read-only mode for display).
- `pages/user/History.jsx` — status-filter tabs (All/Pending/Accepted/Done/Cancelled), `DataTable` (Date · Service · Barber · Status · Total + row actions), loading/empty/error states. Actions: **View receipt** (modal → fetches `/receipt`, shows `ReceiptCard` + PNG download), **Cancel** (ConfirmDialog with a required reason → `PATCH /:id/cancel`), **Rate** (Modal with `RatingStars` + comment → `POST /:id/rate`; add or **edit**, prefilled from the existing rating). Mutations invalidate the history query and toast success.

**DoD — verified:** build passes; cancel/rate/receipt use the exact server contracts (`cancelReason` required, `stars` 1–5, receipt JSON). Rating edit reuses the same appointment so the server recomputes staff avg without inflating the count.

**Verification (phases 1–5):** `npm run build` → **success** (1801 modules; `html2canvas` code-split into its own lazy 201 kB chunk). Live-server contract checks all green: health, admin login, `/settings/public` (5 services), `/services` (5), **new `/appointments/staff`** (2), `/slots` (base + extras duration). No test data written to the dev DB.

**Files created (phases 1–5)**
```
client/src/hooks/useSettingsPublic.js  useServices.js  useSlots.js  useBookableStaff.js  useBooking.js  useMyAppointments.js
client/src/utils/serverAsset.js
client/src/components/ServiceCard.jsx  ExtraChip.jsx  SlotPicker.jsx  StaffPicker.jsx  ReceiptCard.jsx  RatingStars.jsx
client/src/pages/public/Login.jsx  Register.jsx  Landing.jsx (rebuilt)
client/src/pages/user/BookWizard.jsx  History.jsx (rebuilt)
```
**Files changed:** `client/src/api/appointment.api.js` (`bookableStaff`), `client/src/utils/datetime.js` (`formatClock`), server `controllers/appointment.controller.js` + `routes/appointment.routes.js` (staff roster endpoint).


---

### Phase 6 — Staff portal  ✅ (2026-07-22)

**Goal:** staff run the appointment lifecycle — accept/reject, start/finish, shift toggle, served history + stats.

**What was built**
- Hooks `useStaff.js` — `useStaffAppointments(scope)` (`incoming` pool + routed / `mine` queue) and `useStaffHistory` (done list + stats + ratings).
- `components/AppointmentCard.jsx` (reusable), `components/StatCard.jsx` (KPI tile with loading skeleton), `components/AccountSettings.jsx` (shared profile + password form, optional nickname).
- `pages/staff/Dashboard.jsx` — **Incoming** (Accept / Reject-with-reason dialog) + **My queue** (Start → Finish), React Query mutations invalidating both scopes.
- `pages/staff/History.jsx` — Total served / Avg rating / Reviews stat cards, completed-appointments table, and a reviews list.
- `pages/staff/Settings.jsx` (profile + password + **nickname** dropdown) and `pages/user/Settings.jsx` (profile + password) — both via `AccountSettings`. (User Settings had never been built; done here.)
- **Shift toggle** added to the `Topbar` (staff only): on/off pill calling `PATCH /staff/shift`, updating the in-memory user.

**DoD — verified:** staff runs the full lifecycle (contracts confirmed live). Requires the `/settings/public` nicknames addition (below) so the staff nickname dropdown populates.

---

### Phase 7 — Admin portal  ✅ (2026-07-22)

**Goal:** admin runs the shop — dashboard, user/staff CRUD, per-booking discounts, both history views.

**What was built**
- Hooks `useAdmin.js` — `useAdminDashboard`, `useAdminUsers` (paginated 20/pp, role + search).
- `pages/admin/Dashboard.jsx` — six live KPI `StatCard`s (active staff, in-service, bookings today, customers today, sales today, completed today) + a recent-bookings table.
- `pages/admin/UserManager.jsx` — searchable, role-filtered, paginated `DataTable`; create/edit modal (customer/staff/admin, staff nickname, password reset with "leave blank to keep", status on edit); delete confirm (self-delete disabled).
- `components/AdminAppointmentHistory.jsx` (shared) → `StaffHistory.jsx` + `UserHistory.jsx`: paginated appointment tables with status + range filters and a **per-booking discount** modal (`PATCH /admin/appointments/:id/discount`, only for non-finalized bookings; shows the applied % on the total).

**DoD — verified (live):** dashboard counters (2 active staff), users paginated (total 3), discount contract matches. Admin manages users/staff and bookings.

---

### Phase 8 — Admin inventory & settings  ✅ (2026-07-22)

**Goal:** admin configures the whole system.

**What was built**
- `pages/admin/Inventory.jsx` — Services | Extras tabs. Services CRUD with **image upload** (multipart via `inventoryApi`, live preview, category/price/duration/active) and Extras CRUD; delete confirms recommend hiding (inactive) to preserve history. Uses admin-scoped query keys so it lists inactive items too (distinct from the public `useServices`).
- `pages/admin/SystemSettings.jsx` — **system mode** picker (online/maintenance/offline with access explanations), localization & pricing (timezone/region/country/currency, tax shown as % ↔ stored as 0–1 fraction, slot step), **store hours** per weekday (open/close/closed), **shop info** (name/tagline/contact/address/map/socials) feeding the landing, and a **nickname manager** (add/remove).

**DoD — verified (live):** full settings load (mode online, tax 0, slot step 30, 5 nicknames); updates use the exact `PUT /settings` + nickname contracts. Mode changes reflect in the UI (see the Phase 10 maintenance gate).

---

### Phase 9 — Analytics & reports  ✅ (2026-07-22)

**Goal:** KPIs, charts, range filters, and report export.

**What was built**
- Hooks `useAnalytics.js` (`summary`, `sales` by range).
- `components/ChartPanel.jsx` — themed **Recharts** wrappers: `SalesLine` (revenue over time), `HorizontalBars` (top services / revenue by staff), `StatusPie` (status breakdown, per-status colors), a `ChartCard` shell, and a custom dark-mode-aware tooltip. Empty states when there's no data.
- `pages/admin/Analytics.jsx` — range tabs (Daily/Weekly/Monthly/Yearly/All-time), six KPI cards, the four charts, and **report export** (CSV downloads the server blob; JSON downloads the report payload).

**DoD — verified (live):** `summary`/`sales` return correct shapes (zeros on the empty baseline → charts show empty states). Recharts is code-split so it only loads on this page.

---

### Phase 10 — Real-time + polish  ✅ (2026-07-22)

**Goal:** live updates everywhere + UX polish.

**What was built**
- `components/RealtimeBridge.jsx` (mounted in `App`) — subscribes via `useSocketEvent` to `appointment:new/updated/assigned`, `dashboard:refresh`, `rating:added`; invalidates the relevant React Query keys and shows role-appropriate toasts (events are already room-scoped server-side).
- **Auto rating prompt:** `History` listens for `appointment:updated`; when one of the customer's bookings flips to `done`, the rating modal auto-opens once the (unrated) appointment appears.
- **Topbar bell** shows a live unread count driven by `appointment:new`/`assigned` (staff/admin); clears on click.
- **Maintenance gate:** `DashboardShell` reads `systemMode` and redirects blocked roles to `/maintenance` (maintenance → customers; offline → customers + staff; admins always pass) — matching the server gate.
- Confirmed the socket handshake uses the in-memory access token (SocketContext connects only while authenticated).

**DoD — verified:** build passes; socket payload shapes (`appointment:updated → {id,status,…}`) matched to `notify.service`. Dashboards update without refresh (contract-level verified; two-tab live test noted in DEPLOYMENT smoke test).

---

### Phase 11 — Deployment setup  ✅ (2026-07-22)

**Goal:** production build + documented deploy.

**What was built**
- **Code-splitting:** every route is `React.lazy` + `Suspense` (a content-area Suspense in `DashboardShell` keeps the shell during portal navigation). Initial JS dropped from **916 kB → 345 kB**; Recharts (408 kB) and html2canvas (198 kB) are isolated to the pages that use them.
- SPA host configs: `public/_redirects` (Netlify) + `vercel.json` rewrites (Vercel) so client-side routes resolve.
- `.env.production.example` (build-time `VITE_*` for prod API/socket origins) and `client/DEPLOYMENT.md` — build steps, Netlify/Vercel/Nginx/Express-static options, and the server-side musts (CORS `CLIENT_ORIGIN`, HTTPS for the `SameSite=None;Secure` refresh cookie, socket CORS, `/uploads` images) + a post-deploy smoke test.

**DoD — verified:** `npm run build` succeeds (2614 modules, chunked, no size warning); documented deploy steps.

---

## ✅ CLIENT COMPLETE (Phases 0–11)

All twelve client phases are implemented, build-verified, and logged. The React client is feature-complete per `CLIENT_PLAN.md`: Tailwind design system + light/dark, auth with silent refresh + role guards, a live landing page, the full booking wizard with receipt/PNG, customer history + ratings, the staff and admin portals, inventory + system settings, analytics with charts + CSV/JSON export, real-time Socket.io updates, and a code-split production build with deploy docs.

**Server additions made for the client (both read-only, additive, flagged):**
- `GET /appointments/staff` — active staff roster for the booking StaffPicker.
- `GET /settings/public` now also returns `nicknames` — for the staff Settings dropdown.

**Run:** `pnpm install` then `npm run dev` in `/client` → http://localhost:3000 (API expected at http://localhost:5000).

**Files created (phases 6–11)**
```
client/src/hooks/useStaff.js  useAdmin.js  useAnalytics.js
client/src/components/StatCard.jsx  AppointmentCard.jsx  AccountSettings.jsx  AdminAppointmentHistory.jsx  ChartPanel.jsx  RealtimeBridge.jsx
client/src/pages/staff/{Dashboard,History,Settings}.jsx (rebuilt)
client/src/pages/user/Settings.jsx (rebuilt)
client/src/pages/admin/{Dashboard,UserManager,StaffHistory,UserHistory,Inventory,SystemSettings,Analytics}.jsx (rebuilt)
client/public/_redirects   client/vercel.json   client/.env.production.example   client/DEPLOYMENT.md
```
**Files changed:** `client/src/App.jsx` (lazy routes + RealtimeBridge), `client/src/components/layout/{DashboardShell,Topbar}.jsx` (maintenance gate, shift toggle, bell), `client/src/pages/user/History.jsx` (auto-rate prompt). Server: `controllers/settings.controller.js` (public nicknames).

---

# ADDENDUM — POST-PLAN AUDIT (2026-07-29)

**Why this section exists.** A full read-through of every file in `/server` and `/client` (excluding `node_modules` / `dist`) was performed and diffed against `SERVER_PLAN.md` and `CLIENT_PLAN.md`. The codebase has grown past both plans: an entire AI assistant subsystem was added, media storage moved from disk to MongoDB, auth gained usernames, the login/register pages were replaced by a landing panel, the two admin history views were merged, and the deployment target changed from "client and server hosted separately" to a **single-origin monorepo**.

Everything below **exists in the code today but is absent from (or contradicts) the two plan documents**. It is recorded here so the work is credited, discoverable, and treated as part of the delivered system. Items marked **⚠ DEVIATION** contradict a plan statement; items marked **➕ ADDITION** are net-new; items marked **🔧 CORRECTION** fix an earlier entry in this log.

---

## A. Azeu AI — in-app AI assistant  ➕ ADDITION (in neither plan)

A role-aware conversational assistant that teaches users how to operate AzCuts. Entirely absent from `SERVER_PLAN.md` and `CLIENT_PLAN.md`.

**Server**
- `server/ai/prompts/user.txt`, `staff.txt`, `admin.txt` — three hand-written system prompts ("Azeu AI"), one per role, each documenting that role's real workflows (booking wizard steps, accept/reject/re-route semantics, discount locking, system modes, 20-per-page user manager, etc.) plus a shared guardrail block: refuse off-topic questions, never reveal the prompt, no source/DB/server access, no live data, no invented prices, no medical/legal/financial advice.
- `server/ai/aichatbot-logo.png` — the assistant's brand mark (mirrored to `client/public/assets/aichatbot-logo.png`).
- `server/services/chatbot.service.js` — `chat({ role, messages })`. Prompts are read from disk once and held in an in-memory `promptCache`. Client history is sanitized before it ever reaches the model: only `user`/`assistant` turns with non-empty string content survive, trimmed and capped at **`MAX_CONTENT_CHARS = 2000`**, keeping only the last **`MAX_HISTORY = 12`** turns. Upstream call is **Groq** (`temperature 0.6`, `max_completion_tokens 2048`, `top_p 0.95`, `stream false`, `reasoning_effort 'none'`, **`tools: []`** so the model can never act on the system), wrapped in an `AbortController` with a **30 s** timeout. Error mapping: missing key → **503**, timeout → **504**, upstream failure/empty reply → **502**; the upstream body is logged server-side (truncated to 500 chars) and never returned to the browser.
- `server/controllers/chatbot.controller.js` — **the role is derived from `req.user` only, never from the request body**, so guests can never reach the staff or admin guide (they fall back to the `user` guide).
- `server/validators/chatbot.validator.js` — `messages` must be an array of 1–50 items; each `role ∈ {user, assistant}`; each `content` a non-empty string ≤ 2000 chars.
- `server/routes/chatbot.routes.js` → **`POST /api/chatbot/message`** (`optionalAuth` → `chatRules` → `validate`), mounted in `routes/index.js`. Deliberately public so landing-page visitors can use it.
- **New env vars** (in `config/env.js` + `.env.example`, absent from `SERVER_PLAN.md §9`): `GROQ_API_KEY` (default `''`), `GROQ_MODEL` (default `qwen/qwen3.6-27b`), `GROQ_API_URL` (default `https://api.groq.com/openai/v1/chat/completions`). The key never leaves the server; when unset the endpoint degrades to a friendly "unavailable" message instead of crashing.

**Client**
- `client/src/api/chatbot.api.js` — `chatbotApi.send(messages)` → `POST /chatbot/message`. Never sends a role.
- `client/src/components/ChatWidget.jsx` (~620 lines, mounted globally in `App.jsx`, so it is available on **every** route including the landing page):
  - Role-specific greeting + three starter suggestion chips per role (`GUIDE.user/staff/admin`); the conversation resets when the effective role changes.
  - A **dependency-free markdown renderer** (`FormattedMessage` + `renderInline`) covering `**bold**`, `*italic*`/`_italic_`, `` `code` ``, bullet lists, numbered lists and line breaks — no markdown library was added.
  - **Typewriter reveal** of each reply (fixed ~90-step animation so long replies don't crawl) with a blinking caret, plus animated typing dots while awaiting the response.
  - **Draggable launcher + draggable panel** (desktop only, `matchMedia('(min-width: 768px)')`): pointer-event dragging, a 4 px click-vs-drag threshold, clamping that keeps the panel below the 64 px navbar (`TOP_LIMIT`) and inside the viewport on resize, and the bubble stays visually connected below the panel's right edge. Position persists in `localStorage` under **`az-chat-pos`**.
  - A periodic **"Need help?" nudge** (3.5 s visible / 4.5 s hidden loop) that permanently stops once the chat is opened, remembered via **`az-chat-seen`**.
  - Accessibility: `role="dialog"`, `aria-expanded`, `aria-label`s, Enter/Space activation, Enter-to-send / Shift+Enter-for-newline, and a visible "It can make mistakes" disclaimer.
  - `animate-ripple` attention rings behind the closed bubble (keyframes added to `tailwind.config.js`).

---

## B. Auth & identity changes

- **`username` is now a first-class login credential.** ➕/⚠ `User.username` — `required`, `unique`, `sparse`, `lowercase`, 3–30 chars, validated against `USERNAME_RE = /^[a-zA-Z0-9._]+$/`. `auth.service.login` accepts **either a username or an email** via a single `identifier` field. `SERVER_PLAN.md §3.1` names email as *the* login id and lists no username field; `POST /auth/register` in `§5` lists no username either (it is now required at registration).
- **⚠ DEVIATION — `Login.jsx` / `Register.jsx` / `AuthShell.jsx` no longer exist.** Auth moved into `client/src/components/layout/LandingAuthPanel.jsx`: a portalled, `Escape`-dismissable, body-scroll-locking **slide-in panel** on the landing page with a Log in / Sign up segmented switch, so guests authenticate without leaving the page. `App.jsx` now **redirects `/login` and `/register` to `/`**. This replaces `CLIENT_PLAN §2.1`'s dedicated `/login` + `/register` routes and `§3`'s `pages/public/Login.jsx` + `Register.jsx`.
- **Refresh-cookie scoping** — the cookie is named `refreshToken` and scoped to **`path=/api/auth`** (not `/`), `httpOnly`, `secure` in prod, `sameSite` `lax` in dev / `none` in prod.
- **Refresh-token reuse detection** — every refresh JWT carries a random **`jti`**; rotation revokes the presented row, and presenting a valid-but-unknown/already-revoked token **revokes every token for that user** (`RefreshToken.updateMany({user}, {revoked:true})`) and returns **401 "Refresh token reuse detected. Please log in again."**
- **Disabled accounts** — `login` rejects `status: 'inactive'` with **403 "This account is disabled"** before the system-mode check.
- `auth.validator.js` deliberately **avoids `normalizeEmail()`** so Gmail dot-stripping can't desync the stored email from what the user types.
- `server/seeder.js` ➕ — a standalone destructive **admin reset** helper (`node seeder.js`) separate from `seed/seed.js`. It `deleteMany`s every `role: 'admin'` plus anyone holding the target email/username, then recreates one admin (`admin` / `admin@azcuts.com` / password **`admin`**, hashed by the model hook). Testing-only; the credentials differ from the documented `Admin@123` seed. `seed/seed.js` by contrast inserts admin/staff via **raw `User.collection.insertOne`**, bypassing the bcrypt hook because those JSON seeds carry pre-hashed passwords.

---

## C. Media storage moved from local disk into MongoDB  ⚠ DEVIATION

`SERVER_PLAN.md` locks image storage as "**Local disk** via Multer → `/server/uploads/` served statically" with `User.avatar` / `Service.image` as path strings. The code now stores the **bytes on the document**:

- `User.avatarData: Buffer` + `User.avatarType: String` (both `select: false`); `Service.imageData: Buffer` + `Service.imageType: String` (both `select: false`).
- `middleware/uploadImage.js` ➕ — **memory-storage** Multer, allowing `image/png`, `image/jpeg`, `image/jpg` only, 5 MB cap, message "Only PNG, JPG, and JPEG images are allowed". This is what the routes actually use.
- **New public streaming endpoints:** **`GET /api/users/:id/avatar`** (declared *before* the router's auth gate, so it is public) and **`GET /api/services/:id/image`**. Both set the stored mime type and `Cache-Control: public, max-age=31536000, immutable`.
- The `avatar` / `image` string fields now hold **cache-busted URLs** pointing at those endpoints (`/api/users/<id>/avatar?v=<Date.now()>`), so a re-upload invalidates the immutable cache.
- **Either/or semantics:** submitting a text `avatar`/`image` **URL** (validated as `http(s)` with `require_protocol`) clears the stored bytes and makes the external URL the source of truth.
- `middleware/upload.js` (the original disk Multer, which also permitted `webp`/`gif`) **still exists but is imported by no route** — dead/legacy. `inventory.controller.deleteUploadIfLocal()` remains as a best-effort cleanup for legacy `/uploads/*` files.
- `/uploads` is still statically served for backward compatibility, and `client/src/utils/serverAsset.js` still resolves relative server paths against the API origin.

---

## D. Server-persisted theme preference  ➕ ADDITION

`SERVER_PLAN.md` calls theme a "Frontend concern". It is now a synced account setting:

- `User.theme` — enum `light|dark`, intentionally **unset by default**.
- **`PUT /api/users/theme`** (`auth` → `systemMode` → `setThemeRules`) → `user.controller.setTheme`.
- `client/src/components/ThemeSync.jsx` ➕ (mounted globally in `App.jsx`) — reconciles once per authenticated user: if the account has a saved theme it is applied locally; if it has none yet the current local preference is **seeded to the DB**; afterwards any explicit toggle is persisted. Failures are non-fatal (the local theme still applies). Guests remain `localStorage`-only.
- `client/public/theme-init.js` ➕ — the no-flash bootstrap was extracted from an inline `<script>` into an **external file specifically so it satisfies a strict CSP `script-src`** (`CLIENT_PLAN §3` and this log's Phase 0 entry both describe it as inline). It reads `az-theme`, falls back to `prefers-color-scheme`, and also sets `documentElement.style.colorScheme`.

---

## E. Booking & lifecycle rules beyond `SERVER_PLAN §2`

- **One active booking per customer** ➕ — `appointment.service.createBooking` rejects a new booking with **409** ("You already have a booking in progress…") while the customer holds any appointment in `pending`/`accepted`/`in_service`. This is a significant product constraint documented nowhere in either plan.
- **GCash is blocked at the service layer** — beyond the schema enum, `createBooking` throws **400 "GCash is not available yet — please choose cash"**, and the persisted record is always forced to `paymentMethod: 'cash'`, `paymentStatus: 'unpaid'`.
- **Race-safe accept** — `acceptAppointment` pre-checks availability then performs a single atomic `findOneAndUpdate` guarded on `status: 'pending'` and `assignedStaff ∈ {null, self}`, so two staff can never claim the same pooled booking (**409 "Appointment is no longer available"**, **403** if routed elsewhere).
- **System-assigned cancellation identity** — when a reject finds no eligible replacement, the auto-cancel records `cancelledBy: { userId: null, role: 'system' }` and a `Cancelled — no staff available after reject` history note. `§3.4` documents `cancelledBy` only as a user/role pair.
- **Explicit-staff off-shift guard** — booking a staff member whose `status` is `inactive` returns **400 "That staff member is off shift"**.
- **Slot response shape** — `getAvailableSlots` returns `{ date, tz, totalDuration, closed, slots[] }`; a closed weekday returns `closed: true` with an empty list rather than an error. `§2.2` only specifies the slot array.
- **`Settings.storeHours` defaults** — every day defaults to `09:00–20:00`, and **Sunday defaults to `closed: true`**.
- **`isApproved` is written but gates nothing** — no code path reads it. It remains reserved, as the plan hints, but is worth flagging as inert.

---

## F. Admin history: two endpoints merged into one  ⚠ DEVIATION

`SERVER_PLAN §5` and `CLIENT_PLAN §2.1/§3` specify **two** endpoints (`/admin/history/staff`, `/admin/history/users`) and **two** pages (`StaffHistory.jsx`, `UserHistory.jsx`). The code ships **one** of each:

- **`GET /api/admin/history`** — "replaces the old `/history/staff` + `/history/users` split" (comment in `admin.routes.js`). Query params: `status`, `range`, **`assignment=all|assigned|unassigned`** ➕, **`search`** ➕ (free-text across `receiptNo` and customer/staff `fullName`, with `escapeRegex()` applied before building the `RegExp`), **`sort`** ➕, `page`, `limit`.
- Named sort presets ➕ — `USER_SORTS { newest, oldest, name_asc, name_desc }` and `HISTORY_SORTS { newest, oldest, upcoming, scheduled, total_desc, total_asc }`. `GET /api/admin/users` also gained `?status` and `?sort`, with `limit` capped at 100.
- `client/src/pages/admin/AppointmentHistory.jsx` ➕ — the unified page: **350 ms debounced** search box, status/range/assignment/sort selects, a page-size selector, an inline discount percentage indicator on the total, and the discount modal. `client/src/api/admin.api.js` exposes a single `history()` wrapper.
- `App.jsx` keeps **`/admin/history/staff` and `/admin/history/users` as redirects** to `/admin/history` so old links still resolve. `navConfig.js` shows one "Booking History" entry.
- 🔧 CORRECTION to the Phase 7 entry above: `components/AdminAppointmentHistory.jsx`, `pages/admin/StaffHistory.jsx` and `pages/admin/UserHistory.jsx` **do not exist on disk**; they were superseded by `pages/admin/AppointmentHistory.jsx`.

---

## G. Public payload & roster extensions

- **`GET /settings/public` returns more than `§5` documents** — beyond `shopInfo`, it returns `timezone`, `currency`, **`systemMode`** (drives the client's maintenance/offline banner and the topbar status chip), `storeHours`, **`nicknames`** (already flagged in the Phase 6–11 entry), active `services`, **and a public `staff` roster** ➕ (`fullName nickname avatar avgRating ratingCount`, active/in-service only, sorted `totalServed desc, fullName asc`) for a "meet the barbers" section.
- **`GET /api/appointments/staff`** — already flagged in the Phase 3 entry; restated here because it is still absent from `SERVER_PLAN §5`.
- **Nickname CRUD shares one path** — `POST` / `PUT` / `DELETE` all on `/api/settings/nicknames` (value in the body, not the URL), with duplicate and not-found guards. Nickname membership in `Settings.nicknames` is enforced in **three** places: `admin.createUser`, `admin.updateUser`, and `user.updateProfile` (which additionally rejects non-staff with 400 "Only staff can set a nickname").
- **Admin self-protection guards** ➕ — `updateUser` blocks changing your own role; `deleteUser` blocks self-deletion **and refuses to delete any account with `role: 'admin'`** ("Admin accounts cannot be deleted"), which is stricter than the "last admin" rule logged in Phase 6.
- **`counters` collection is a 7th Mongoose model** — `utils/receiptNo.js` defines `Counter { _id: String, seq: Number }` inline. `SERVER_PLAN §3` lists six collections.

---

## H. Client design system & UX beyond `CLIENT_PLAN §1/§3`

**New reusable components / hooks (none appear in `CLIENT_PLAN §3`'s file tree)**
- `components/ui/ImagePicker.jsx` ➕ — one control, three input methods: click-to-browse, **drag & drop a file**, or **drag an image from another browser tab / paste an image URL** (`text/uri-list` handling + "Use link" button). Client-side mime + 5 MB validation mirroring the server, object-URL preview with `revokeObjectURL` cleanup, hover "click or drop to replace" affordance, clear button, and `video`/`square` aspect presets. Used for service images (`admin/Inventory.jsx`) and profile photos (`AccountSettings.jsx`). Emits `onChange({ file, url })` with exactly one set.
- `components/ui/Avatar.jsx` ➕ — round avatar resolving server paths through `serverAsset`, falling back to derived initials.
- `components/ui/Reveal.jsx` + `hooks/useInView.js` ➕ — an `IntersectionObserver`-based **scroll-reveal system** (`up|down|left|right|fade`, staggerable via `delay`) that animates **both ways** (`once: false`) and honours `prefers-reduced-motion` with a hard bypass plus `motion-reduce:` utilities.
- `components/PageHeader.jsx`, `components/ThemeSync.jsx`, `components/RealtimeBridge.jsx`, `components/ChatWidget.jsx`, `components/AppointmentCard.jsx`, `components/StatCard.jsx`, `components/AccountSettings.jsx` — all present, none listed in `CLIENT_PLAN §3`.
- `hooks/useSettingsPublic.js`, `useServices.js`, `useSlots.js`, `useBookableStaff.js`, `useStaff.js`, `useAdmin.js`, `useInView.js`; `utils/cn.js`, `utils/serverAsset.js` — likewise unlisted. `CLIENT_PLAN`'s `useAdminUsers.js` ships as an export of `useAdmin.js`.

**Layout / shell additions**
- `Topbar.jsx` ➕ — a **`StatusClock`** (system-mode chip with an animated ping when online, plus a live ticking clock and date), a **`MarqueeText`** helper that auto-scrolls the account name **only when it actually overflows** (measured via `scrollWidth`, driven by a `--marquee-shift` CSS variable and an `animate-marquee` keyframe), the staff **shift toggle**, and the socket-driven **notification bell** (capped at 99).
- `DashboardShell.jsx` ➕ — a **persisted desktop sidebar collapse** toggle (`PanelLeftClose`/`PanelLeftOpen`, `aria-pressed`) alongside the documented mobile drawer.
- `components/ui/Pagination.jsx` + `DataTable.jsx` ➕ — a **rows-per-page selector** (`pageSizeOptions`, default sets of 10/20/30/50) and a total-count readout, used by Inventory and Booking History. `CLIENT_PLAN §4.10` only specifies a fixed 20/page.

**Visual identity**
- ⚠/🔧 **Brand palette is red + water-blue, not indigo + teal.** `tailwind.config.js` ships `brand #E11D48` / `hover #BE123C` / `fg #FFFFFF` and `accent #0EA5E9` / `hover #0284C7`. That matches `CLIENT_PLAN §1.1`'s prose but **contradicts `§1.3`'s config sample** (`#4F46E5` / `#14B8A6`) **and the Phase 0 entry in this log**, which recorded indigo/teal. The red/blue values are the shipped truth.
- ➕ **Three type families, not one.** `index.html` loads **Oswald** (landing display headlines) and **Fraunces** (dashboard serif headings + stat numerals) from Google Fonts, alongside the self-hosted variable **Inter** body face. `CLIENT_PLAN §1.2` commits to a single sans.
- ➕ **Extra animation + token layer** in `tailwind.config.js`: `fade-in-up`, **`barber`** (a scrolling barber-pole stripe for the dashboard brand mark), **`marquee`**, **`ripple`**, plus the `shadow-card` / `card-hover` / `pop` scale and the semantic `z-index` scale.

**Landing page content (`pages/public/Landing.jsx`) ➕**
- ⚠ Local imported imagery replaces the "no verified external images" workaround noted in the Phase 2 entry: `pages/public/images/landing-background.avif` (hero), `azeumark.jpg`, `lisa.jpg`, `mrbeast.png`.
- Sections not in `CLIENT_PLAN §4.1`: a **stats band** (`67+ Years Experience`, `6.9k+ Cuts Completed`, `6.7 Avg. Rating`), a **customer-stories / testimonials** block (two quoted personas with photos), a **developer credits** block distinct from the barber roster (Uelmark G. Valdehueza with photo, JM Nikko O. Gallardo, Lara Angel A. Habagat), an inline SVG **dot-texture** background, and `Eyebrow` section kickers. Guest "Book" CTAs open the auth panel in **register** mode instead of navigating.
- ⚠ **The stats and testimonials are hardcoded demo content**, not server data — they will not track real shop performance.

---

## I. Deployment architecture: single-origin monorepo  ⚠ DEVIATION

Both plans assume the client and API are hosted separately (`CLIENT_PLAN §6 Phase 11`, `SERVER_PLAN §10`) with CORS between them. The code now supports **one process serving both**:

- **`package.json` at the repo root** ➕ (undocumented in either plan) — a monorepo runner: `engines.node 20.x`, `heroku-postbuild` (installs both workspaces then builds the client), `start` → `npm start --prefix server`, plus `dev:server` / `dev:client` / `seed` pass-throughs. Its description names the target: "deployed as a single Heroku app."
- `server/app.js` ➕ — **in production only**, statically serves `../client/dist` and adds an SPA fallback that skips non-GET requests and anything under `/api` or `/uploads`.
- `client/src/config/axios.js` + `utils/serverAsset.js` ➕ — when `VITE_API_URL` is unset in a production build they default to a **relative `/api`**, so no origin needs to be baked in.
- `server/app.js` ➕ — a **custom helmet CSP** (`img-src 'self' data: blob: https:`, `connect-src 'self' ws: wss: https:`) and `crossOriginResourcePolicy: 'cross-origin'` so DB-streamed images and WebSockets work under helmet's defaults; `trust proxy` is enabled in production.
- `client/vercel.json` + `client/public/_redirects` still exist for the separate-host option, so both models are supported.

---

## J. Security & hardening details not in the plans

- **Rate-limit policy numbers** — `authLimiter`: 15-minute window, **30** requests in production / **200** in dev. `apiLimiter`: 1-minute window, **300** in production / **2000** in dev. Both emit standard `RateLimit-*` headers and the project's `{ success:false, message }` envelope. Store is **in-memory**, so the limits are per-process (a multi-instance deploy needs a shared store).
- **System-mode gate coverage is partial by design** — applied to `/users`, `/appointments`, `/staff`. **Not** applied to `/admin`, `/analytics`, `/settings`, `/services`, `/extras`, or `/chatbot`. Admin passes in every mode anyway, and leaving `/settings` ungated is what lets an admin restore `online` while offline — but it also means **inventory reads and the chatbot stay reachable during maintenance/offline**, which neither plan states.
- **Error-handler mappings** — `MulterError LIMIT_FILE_SIZE` → 400 "File too large (max 5MB)", malformed JSON → 400, oversized body → 413, and 5xx messages are masked to "Internal Server Error" in production while the stack is logged.
- **`config/env.js` fails fast on `MONGO_URI` only**; every other var (including both JWT secrets) has a dev fallback — so a production deploy that forgets `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` will **silently boot with `dev_access_secret` / `dev_refresh_secret`**. Worth treating as a hardening item.
- **`utils/AESCrypt.js` has zero call sites.** It is implemented and documented in `SERVER_PLAN §6.1`, but no model or controller encrypts anything with it today.
- `server/DEPLOYMENT.md`, `server/ecosystem.config.js` (PM2), and `client/DEPLOYMENT.md` exist and are current; none are referenced from either plan's file tree.

---

## K. Corrections to earlier entries in this log  🔧

| Earlier claim | Actual state on disk |
|---|---|
| Phase 0/1 (client): created `pages/public/Login.jsx`, `Register.jsx`, `components/layout/AuthShell.jsx` | **Removed.** Auth lives in `components/layout/LandingAuthPanel.jsx`; `/login` + `/register` redirect to `/`. |
| Phase 7 (client): created `components/AdminAppointmentHistory.jsx` → `StaffHistory.jsx` + `UserHistory.jsx` | **Removed.** Replaced by the single `pages/admin/AppointmentHistory.jsx` against `GET /admin/history`. |
| Phase 0 (client): "palette/type = identity preservation … committed indigo/teal palette … Inter" | Shipped palette is **red `#E11D48` / blue `#0EA5E9`**; type stack is **Inter + Oswald + Fraunces**. |
| Phase 0 (client): index.html uses a **no-flash inline script** | Extracted to the external **`public/theme-init.js`** for CSP compatibility. |
| Phase 2 (client): external imagery unavailable, so hero/cards use logo + gradients | Local **`pages/public/images/*`** assets are now imported and used for the hero and testimonials. |
| Phase 6 (server): image storage / avatar upload via disk Multer to `/uploads` | Images now live **in MongoDB** (`avatarData`/`imageData`) and stream from `/api/users/:id/avatar` and `/api/services/:id/image`; `middleware/upload.js` is unused. |
| Phase 2 (server): "`GET /settings/public` … belongs to Phase 8" | Implemented, and it now also returns `systemMode`, `storeHours`, `nicknames`, and a public staff roster. |
| `CLIENT_PLAN §3`: `public/assets/templates/` for template service images | **Does not exist.** Services with no image fall back to a branded category gradient in `ServiceCard`. |

---

## L. Known gaps & limitations (verified absent)

Recording these so they are not mistaken for oversights in the audit:

- **No automated tests anywhere.** `server` `npm test` is the default failing stub; the client has no test tooling. Every "verified" claim in this log came from temporary manual scripts that were deleted afterwards.
- **`client/package.json` declares a `lint` script (`eslint .`) but ESLint is not installed** — the script cannot run as-is.
- **No CI configuration** in either workspace.
- **No password reset / forgot-password flow, no email verification, and no email or SMS layer at all.** Nothing in the system sends a message outside the app.
- **No payment processing.** GCash is validated then rejected; `paymentStatus` exists but no route ever flips it to `paid`, so the "staff/admin marks paid" behaviour described in `SERVER_PLAN §3.4` is **not implemented**.
- **No logout-all-devices endpoint**, no admin endpoint to read a single appointment, and no staff reply to a customer rating.
- **Socket.io is push-only** — the server registers no inbound custom events beyond the handshake, `connection`, and `disconnect`.
- **`dashboard:refresh` carries only `{ at }`**; the admin client refetches `GET /admin/dashboard` on receipt (deliberate, per the Phase 9 note).
- **Server-side receipt PDF** (the optional item in `SERVER_PLAN §2.6`) was not built; PNG export remains client-side via html2canvas.

---

### Audit scope

Read in full: all of `/server` except `node_modules` (entry points, `ai/`, `config/`, `models/`, `middleware/`, `validators/`, `controllers/`, `services/`, `routes/`, `socket/`, `utils/`, `seed/`, `seeder.js`, `ecosystem.config.js`, `DEPLOYMENT.md`, `.env.example`, `package.json`) and all of `/client` except `node_modules` and `dist` (root configs, `index.html`, `public/`, and all files under `src/`), diffed against `SERVER_PLAN.md` and `CLIENT_PLAN.md`. **Documentation-only pass — no application code was modified.**

---

# SCHOOL COMPLIANCE BUILD S0�S10 (2026-09-19)

Per `school-update-plan.md`: `school-requirements.txt` is the scope truth.
All non-paper features DISABLED behind root `configuration.json`
(`schoolComplianceMode: true`, DISABLE-only per owner decision); missing
paper modules (Products, Inventory, Sales) built new. Commits `defd7ba`?S10.

- **S0 � Flag foundation** (`defd7ba`): root `configuration.json`;
  `server/config/features.js` (loader + school denylist + legacy fallback) +
  `middleware/requireFeature.js`; flags exposed via `GET /settings/public`;
  systemMode/login pass-through (always online); chatbot 503;
  client `config/features.js` + `hooks/useFeatures.js` + `FeatureGate.jsx`.
  Verified live: health 200, public forces online+school, chatbot 503.
- **S1 � Models + seeds** (`c4bfda0`): `Product` (+Mongo image pattern),
  `Inventory` (ledger: stock_in/sale/usage/adjustment), `Sale`
  (snapshotted items, `SL-YYYYMMDD-####` via `utils/saleNo.js`);
  `Appointment.saleId/assignedBy`, `User.canUpdateStock` (default false).
  `products.seed.json` (5 products) + opening `stock_in` ledger entries.
  Verified: seed ? 5 products, 82 units, 5 ledger rows.
- **S2 � Products backend** (`2d59313`): validator/controller/routes
  (`GET /products` public active-only, admin CRUD, `/products/:id/image`
  stream); `stockQuantity` NOT writable (ledger-only, S3). 11/11 live checks.
- **S3 � Inventory backend** (`ee56636`): `services/inventory.service.js`
  `applyChange` (atomic guarded `$inc`, oversell-safe) + validator/controller/
  routes (`GET levels/movements`, `PATCH update`); staff needs
  `canUpdateStock` grant (via `PUT /admin/users/:id`, staff-only);
  `updateUser` validator extended. 24/24 live checks.
- **S4 � Sales backend** (`a87347e`): validator/`services/sales.service.js`
  (`recordSale` live pricing + atomic decrement + orphan rollback;
  `autoCreateServiceSale` idempotent on `done`, never breaks the transition)
  + controller/routes (`POST /sales`, `GET /sales/mine`, `GET /sales`);
  `Inventory.applyChange` gained `referenceSale`. 17/17 live checks.
  Fixed real bug: `stock.routes` bare `router.use` guard intercepted later
  routers (customers 403 on booking) ? per-route guards.
- **S5 � Appointments to paper** (`eac6ef3`): `assignAppointment` service +
  `PATCH /appointments/:id/assign` (admin, pending-only, on-shift + free
  checks, `assignedBy` audit); gates: extras 400, one-booking-limit off,
  auto-assign off (unassigned?admin assigns), pool-claim 403, reject returns
  to admin (no auto-cancel), cancel reason optional, rate/discount routes 403.
  16/16 live checks.
- **S6 � Reports + dashboard** (`dbd3cde`): `salesSummary` (from `sales`),
  `inventoryReport` (levels/low/out/movements), `reportByKind`
  (appointments/sales/inventory, JSON+CSV), `summary?source=sales`;
  dashboard += `shopSalesToday/Count`, `lowStockCount`, `outOfStockCount`,
  `productCount` (legacy counters intact). 10/10 live checks.
- **S7 � Barber client** (`f7c2b13`): `sales/product/stock` APIs + hooks,
  `SaleModal`, `StockUpdateModal`, staff `Sales` + `Inventory` pages
  (grant-gated updates), dashboard Record-sale entry, nav + routes.
  Build green + 5/5 endpoint checks.
- **S8 � Owner client** (`deff505`): admin `Sales` page, Inventory
  `Products` (CRUD) + `Stock` tabs, history `AssignModal`, UserManager
  stock-access checkbox + deactivation labels, Analytics
  Appointments/Sales/Inventory tabs with kind-aware export, dashboard
  widgets. Build green + 8/8 live checks.
- **S9 � Global gating** (`035db2a`): wizard skips extras step (4-step),
  history hides ratings/PNG + optional cancel reason, ChatWidget/
  RealtimeBridge/socket mount only when flagged, ThemeSync local-only,
  maintenance redirect off, landing demo stats/testimonials off, staff
  ratings off, admin extras tab/discount/charts/mode/nicknames/tax/delete
  hidden, nicknames gated in UserManager/AccountSettings. Build green +
  gate regression (online-forced, chatbot 503, discount 403).

**S10 � Verification (this entry): 40/40 paper-bullet checks green** against
the live dev server (customer 7, barber 11 incl. logout, owner 22 incl. all
three report kinds in JSON+CSV). Baseline restored afterward: 0 sales,
0 appointments, ledger 10, Pomade 20, 5 products. Decisions locked:
DISABLE-only, per-barber stock flag, manual usage (no auto-decrement).
Next: defense demo per `defense-script.md`.

> Update 2026-09-19 (`barbers-import.md`): demo staff/services replaced with
> the real shop data (3 barbers, 4 services + real photos). Phase logs above
> remain the historical record; living docs (`defense-script.md`, guide) updated.

> Update (booking: owner assigns only): customers can no longer pick a barber.
> The wizard schedule step shows time slots only (unfree times disabled) and
> every booking lands unassigned-pending; `POST /appointments` rejects any
> customer `staffId` (400) and rejects slots with no free on-shift barber
> (409). Assignment stays exclusively on `PATCH /appointments/:id/assign`
> (admin). Guide customer tour updated to match.

> Update (booking: barber picker returns): reversed by F1 below — customers
> pick a barber (Selected) or Auto (Pending); see FOLLOW-UP CHANGES.

---

# FOLLOW-UP CHANGES (2026-09-26, owner requests)

Per-role status flow, User Manager cleanup, and service duration form.

## F1 — Booking statuses Selected + Assigned

Lifecycle is now Pending (just booked, Auto, unassigned) → Selected
(customer picked a barber) / Assigned (admin assigned) → Accepted (barber
accepted, ready to start) → in_service → done, with cancelled terminal.
Staff accepts Selected directly (no admin confirm); admin assigns/reassigns
Pending/Selected/Assigned (server re-checks on-shift + free); staff Incoming
shows my Selected + Assigned. Cancel is role-based: admin anything except
in_service/done/cancelled, customer Pending/Selected only, staff no direct
cancel (reject instead). Reject still returns to unassigned Pending for the
admin but now strictly requires a reason (min 3 chars, 422/400 otherwise)
and the admin sees it in the Assign modal (last Rejected statusHistory
note). Legacy pending+assigned rows (pre-Selected) are tolerated in
staff/incoming/accept/reject/assign queries, so no DB migration was needed.
Files: server Appointment model enum, appointment.service
(ALLOWED/ACTIVE map, create/accept/reject/assign/cancel), scheduling
ACTIVE_STATUSES, staff.controller filter, appointment.controller busy set,
staff.validator rejectRules, client STATUS_META/constants, admin
AppointmentHistory (options + Assign/Reassign + reject banner), staff
Dashboard (required reason), customer History (tabs + cancellable),
BookWizard success copy, defense-script demo path.

## F2 — User Manager: Active/Inactive only

Paper lists add/update/deactivate/assign-roles, so the In service option was
removed from the User Manager status dropdown and status filter. Backend
enum untouched: the system still auto-sets in_service on start and back to
active on done, and badges still display it. File: client UserManager.jsx.

## F3 — Service duration Hours + Minutes

Admin Inventory service form now takes Duration hours (0–8) + minutes
(0–59, step 5) combining into the single durationMinutes payload (no
model/migration change; slots/booking/seeds untouched; extras form untouched
per scope). Table renders 1h 30m / 45 min. File: client Inventory.jsx.

> Note: guide tours (flag-gated off) still describe the old pending-only
> flow; defense-script.md updated to the new statuses.

## F4 — Editable status/role pill colors (hex)

`configuration.json` gains a top-level `colors` block (`statuses` for the 7
appointment statuses, `roles` for admin/staff/user; `#rgb` or `#rrggbb`).
Served via `GET /settings/public` (`getColors`, never flag-gated); the
client resolves them in `useBranding()` with shipped-hex defaults for any
missing/invalid value, so a bad edit can never break a pill. `StatusBadge`
and `Badge` (new `color` prop) render tinted pills via inline style; the
User Manager role badge now uses the editable role colors. Files:
configuration.json, server features/settings, client constants,
useSettingsPublic, StatusBadge, Badge, UserManager.

## F5 — Accurate browser tab titles

Every route now sets `document.title` via a central `RouteTitle` map in
`App.jsx` (e.g. Admin Dashboard / Staff Dashboard / Book a Service /
My Bookings / User Manager / System Settings — AzCuts). File: client App.jsx.

## F6 — In-Service animated RGB stroke

The In-Service pill renders an RGB ring rotating around it (spinning conic
rainbow layer behind the chip, `rgb-stroke-spin` in `globals.css`) with a
theme-aware surface chip inside, tinted by the editable `in_service`
branding color — visible in both themes and everywhere `StatusBadge`
renders. Honors the global reduced-motion guard. Files: client globals.css,
StatusBadge.jsx.
