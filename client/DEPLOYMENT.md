# AzCuts Client — Deployment

The client is a static Vite/React SPA. It talks to the AzCuts API (see `server/DEPLOYMENT.md`) over HTTPS and opens a Socket.io connection for live updates.

## 1. Prerequisites
- Node.js 18+ (Node 22/24 fine)
- pnpm (install deps) — run scripts with npm

## 2. Configure environment (build-time)
Vite inlines `VITE_*` variables **at build time**, so they must be set before `npm run build`. Copy `.env.production.example` → `.env.production` (or set them in your host's build settings):

```
VITE_API_URL=https://api.your-domain.com/api
VITE_SOCKET_URL=https://api.your-domain.com
```

## 3. Build
```bash
pnpm install
npm run build      # outputs static assets to dist/
npm run preview    # optional: preview the production build on :3000
```

## 4. Deploy the `dist/` folder
It's a single-page app, so the host must **fall back to `index.html`** for unknown paths (client-side routing). Config for the common hosts is included:

- **Netlify** — build command `npm run build`, publish directory `dist`. SPA fallback via `public/_redirects` (copied into `dist`).
- **Vercel** — framework preset "Vite". SPA fallback via `vercel.json` rewrites.
- **Nginx** — serve `dist` and add the fallback:
  ```nginx
  location / {
    root   /var/www/azcuts/dist;
    try_files $uri $uri/ /index.html;
  }
  ```
- **Served by the Express API** — copy `dist/` into the server and add (after the API routes, before the error handler):
  ```js
  const clientDir = path.join(__dirname, 'client-dist');
  app.use(express.static(clientDir));
  app.get('*', (req, res) => res.sendFile(path.join(clientDir, 'index.html')));
  ```

## 5. Server-side requirements (must match)
- **CORS**: set the server's `CLIENT_ORIGIN` to the exact deployed client origin (scheme + host + port). CORS runs with `credentials: true`.
- **Refresh cookie**: in production the refresh token cookie is `SameSite=None; Secure`, so **both** the client and API must be served over **HTTPS**. Without HTTPS the browser drops the cookie and silent refresh fails.
- **Socket.io**: the server's socket CORS mirrors `CLIENT_ORIGIN`; `VITE_SOCKET_URL` must point at the API origin.
- **Uploaded images** are served by the API at `/uploads/*`; the client resolves them against `VITE_API_URL`'s origin.

## 6. Post-deploy smoke test
1. Landing page loads and lists live services (`GET /settings/public`).
2. Register/login works and lands on the right portal (silent refresh keeps you signed in on reload).
3. A booking completes and the receipt downloads as PNG.
4. Dashboards update live (open two tabs: book as a customer, watch the staff/admin dashboard react).
