# AzCuts API — Deployment Guide

The AzCuts backend is a stateless Express + Socket.io API backed by MongoDB.

## 1. Prerequisites
- **Node.js** 18+ (developed on Node 24)
- **MongoDB** 6+ reachable at your `MONGO_URI`
- **pnpm** for installs (`npm i -g pnpm` or `corepack enable pnpm`)
- **PM2** for process management in production (`npm i -g pm2`)

## 2. Configure environment
Copy the template and fill in real values:

```bash
cp .env.example .env
```

| Var | Notes |
|---|---|
| `PORT` | API port (default 5000) |
| `MONGO_URI` | e.g. `mongodb://127.0.0.1:27017/azeubarbersalondb` |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | **Long random strings** — change from the dev placeholders |
| `ACCESS_TOKEN_TTL` / `REFRESH_TOKEN_TTL` | e.g. `15m` / `7d` |
| `CLIENT_ORIGIN` | The deployed client origin (used by CORS + Socket.io) |
| `DEFAULT_TZ` | `Asia/Manila` |
| `AES_SECRET_KEY` | **Change** from the `azeumark` placeholder |
| `NODE_ENV` | `production` in prod |

## 3. Install & seed
```bash
pnpm install            # install dependencies (pnpm only)
node seed/seed.js       # settings singleton + admin + sample staff/services/extras
```
Default admin: `admin@azcuts.com` / `Admin@123` — **change the password after first login.**

## 4. Run
- Development: `npm run dev` (nodemon)
- Production: `pm2 start ecosystem.config.js --env production`
  - `pm2 logs azcuts-api` · `pm2 restart azcuts-api` · `pm2 save && pm2 startup`

## 5. Production checklist
- **Secrets:** rotate `JWT_*` and `AES_SECRET_KEY`; never commit `.env`.
- **HTTPS + cookies:** the refresh token is an `httpOnly` cookie. In production
  (client and API on different domains) it is sent as `SameSite=None; Secure`,
  which **requires HTTPS**. Terminate TLS at your reverse proxy.
- **Reverse proxy:** put Nginx/Caddy in front; the app sets `trust proxy` in
  production so client IPs (rate limiting) and Secure cookies work correctly.
  Proxy WebSocket upgrades so Socket.io works (`/socket.io/`).
- **CORS:** `CLIENT_ORIGIN` must exactly match the client origin; credentials
  are enabled, so a wildcard origin is not allowed.
- **Rate limiting:** `/api/auth/*` is strictly limited; the rest of `/api` has a
  lenient ceiling. Tune in `middleware/rateLimit.js`.
- **Uploads:** `/uploads` is local disk. Persist/back it up (or move to object
  storage) since it holds service images and avatars.

## 6. MongoDB backup & restore
```bash
# Backup
mongodump --uri="$MONGO_URI" --out=backup/$(date +%F)

# Restore
mongorestore --uri="$MONGO_URI" backup/<date>/azeubarbersalondb
```
Schedule `mongodump` via cron and keep the `/uploads` folder in the same backup.

## 7. Health
`GET /api/health` returns `200` with uptime — use it for load-balancer/PM2 health checks.
