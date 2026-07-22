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
