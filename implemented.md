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
