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
