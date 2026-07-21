# AzCuts — CLIENT PLAN (Frontend / React)

> **Project:** AzCuts — Barber Shop & Salon Management System
> **Stack:** MERN (this document = the **React** client)
> **Head Developer:** Uelmark G. Valdehueza · **Assistants:** JM Nikko O. Gallardo · Lara Angel A. Habagat
> **Run command:** `npm start` (Create React App / Vite dev server on `http://localhost:3000`)
> **Talks to:** the API in `SERVER_PLAN.md` at `http://localhost:5000/api` + Socket.io. **Read both plans together — they share ONE API contract and data model.**

---

## 0. LOCKED DECISIONS (client-relevant)
| Area | Decision |
|---|---|
| **Auth** | JWT access+refresh; access token in memory + refresh handled via `/auth/refresh`; auto-attach via Axios interceptor |
| **Roles → routing** | `user`, `staff`, `admin` each get their own dashboard shell + side panel; protected + role-gated routes |
| **Booking** | Multi-step wizard: Service → Extras → Schedule (slot + staff/auto) → Payment → Confirm → Receipt |
| **Scheduling UI** | Fixed **time-slot picker** (server returns available slots) |
| **Images** | Served from server `/uploads/*`; template images used until real ones uploaded |
| **Ratings** | Modal prompt after a booking turns **Done** + editable star control in Booking History |
| **Discounts** | Shown on receipt/summary; **set by admin** (client just displays the server-computed number) |
| **Real-time** | Socket.io client → live dashboard + status updates, toast notifications |
| **Theme** | Clean, aesthetic, modern design system + **Light/Dark theme toggle** (persisted) |
| **Styling** | **Tailwind CSS** (`darkMode: 'class'`) — the committed styling framework for the whole client |
| **Timezone** | Render all times in `Asia/Manila` (from `/settings/public`) |
| **Payments** | Cash selectable; **GCash shown but disabled** (greyed, "coming soon") |

---

## 1. DESIGN SYSTEM ("clean, aesthetic, modern" + light/dark)

> **Styling framework: Tailwind CSS** is the committed choice for the entire client. All components use Tailwind utility classes; the light/dark theme is driven by Tailwind's `darkMode: 'class'` strategy. See §1.3 for setup/install.

### 1.1 Theme tokens (Tailwind theme + CSS variables, toggled by the `dark` class on `<html>`)
- **Light:** background `#F7F8FA`, surface `#FFFFFF`, text `#111827`, muted `#6B7280`, border `#E5E7EB`.
- **Dark:** background `#0F1115`, surface `#171A21`, text `#F3F4F6`, muted `#9CA3AF`, border `#232733`.
- **Brand accent:** a single confident accent (e.g. teal/indigo `#4F46E5` / `#14B8A6`) used for primary buttons, active nav, highlights — consistent across both themes.
- **Semantic:** success `#16A34A`, warning `#D97706`, danger `#DC2626`, info `#2563EB`.
- **Status colors** (badges): pending=amber, accepted=blue, in_service=indigo, done=green, cancelled=red.

### 1.2 Foundations
- Typography: one modern sans (Inter/Poppins via `@fontsource` or Google Fonts), clear type scale, generous spacing, Tailwind's 4px/8px spacing scale.
- Cards with soft radius (`rounded-xl`/`rounded-2xl`) + subtle shadow (light) / subtle border (dark). Smooth `transition` (150–200ms).
- **Theme toggle** in the top bar: toggles the `dark` class on `<html>`; preference saved to `localStorage` (`az-theme`) and applied before paint (inline script in `index.html`) to avoid flash. Respects `prefers-color-scheme` on first visit.
- Fully **responsive** (mobile-first) using Tailwind breakpoints (`sm: md: lg:`): collapsible side panel → hamburger drawer on small screens.
- Accessible: focus rings (`focus-visible:`), aria labels, keyboard-navigable wizard & tables.

### 1.3 Tailwind setup & installation (Phase 0)
Install Tailwind + peers, then generate config:
```bash
# from /AzCuts/client
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p          # creates tailwind.config.js + postcss.config.js
```
Configure `tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',                                  // theme toggle via <html class="dark">
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // map the §1.1 tokens so classes like bg-brand / text-muted work in both themes
        brand:   { DEFAULT: '#4F46E5', hover: '#4338CA' },
        accent:  '#14B8A6',
        success: '#16A34A', warning: '#D97706', danger: '#DC2626', info: '#2563EB',
      },
      borderRadius: { xl: '12px', '2xl': '16px' },
    },
  },
  plugins: [
    // optional but recommended:
    // require('@tailwindcss/forms'),   // nicer default form controls
  ],
};
```
Add the Tailwind directives at the top of `src/styles/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```
Then import `./styles/globals.css` once in `src/index.js`.
- **Vite users:** `postcss.config.js` is auto-picked up — no extra step.
- **CRA users:** the generated `postcss.config.js` works out of the box; just keep the import in `index.js`.
- Semantic surface/text/border colors that must flip per theme are expressed with Tailwind `dark:` variants (e.g. `bg-white dark:bg-[#171A21] text-gray-900 dark:text-gray-100`). Optionally back them with CSS variables in `theme.css` for a single source of truth.

---

## 2. APP ARCHITECTURE & ROUTING

### 2.1 Route map
```
PUBLIC
  /                         Landing page (hero, services gallery, about, contact, location)
  /login                    Login (all roles)
  /register                 Customer sign-up
PROTECTED (role-gated via <ProtectedRoute role=...>)
  USER (customer)
    /app                    → redirect to /app/book
    /app/book               Booking wizard (main dashboard)
    /app/history            Appointment/Booking history (table)
    /app/settings           Profile + security settings
  STAFF
    /staff                  → /staff/dashboard
    /staff/dashboard        Incoming appointments (accept/reject) + active queue
    /staff/history          Served history + totalServed + ratings
    /staff/settings         Profile + security + nickname (from allowed list)
  ADMIN
    /admin                  → /admin/dashboard
    /admin/dashboard        System overview (live counters)
    /admin/history/staff    Staff appointment history
    /admin/history/users    User appointment history
    /admin/analytics        Store analytics + charts + report export (range filter)
    /admin/users            User Manager (paginated 20/pp, CRUD, discounts)
    /admin/inventory        Services/Extras/Prices CRUD (+image upload)
    /admin/settings         System mode, timezone/region, hours, nicknames, shop info
  /maintenance              Shown when systemMode blocks the role
  *                         404
```
Auth guard reads role from the decoded user; wrong role → redirect to that role's home. Offline/maintenance → `/maintenance` screen (except allowed roles).

### 2.2 State & data layer
- **Auth context** (`AuthContext`): current user, tokens, login/logout, refresh. Access token in memory; silent refresh on 401 via Axios interceptor.
- **Theme context** (`ThemeContext`): light/dark toggle + persistence.
- **Socket context** (`SocketContext`): single Socket.io connection (auth via token), exposes subscribe helpers.
- **Server data**: **React Query (TanStack Query)** for fetching/caching (`useServices`, `useMyAppointments`, `useSlots`, `useAdminUsers`, `useAnalytics`, …). Socket events invalidate/patch the relevant queries for live updates.
- **Booking wizard state**: local reducer (`useBooking`) holding step, chosen service, extras, slot, staff, payment; only submits to server at Confirm.
- **Forms**: React Hook Form + client validation mirroring server validators (server is still source of truth).

---

## 3. CLIENT FILE STRUCTURE (every file's purpose)

```
/AzCuts
└── /client
    ├── package.json                 # Deps + scripts ("start", "build"). Deps: react-router-dom, axios, @tanstack/react-query, socket.io-client, react-hook-form, recharts, html2canvas, dayjs, react-hot-toast, lucide-react (icons). devDeps: tailwindcss, postcss, autoprefixer (see §1.3).
    ├── tailwind.config.js           # Tailwind config: darkMode:'class', content globs, brand/semantic color tokens (§1.3).
    ├── postcss.config.js            # PostCSS pipeline (tailwindcss + autoprefixer) generated by `npx tailwindcss init -p`.
    ├── .env                         # REACT_APP_API_URL=http://localhost:5000/api, REACT_APP_SOCKET_URL=http://localhost:5000
    ├── .env.example                 # Template for teammates.
    ├── /public
    │   ├── index.html               # Root HTML; sets initial [data-theme] before paint (no-flash script).
    │   └── /assets/templates        # Template haircut/service images used until real ones uploaded.
    └── /src
        ├── index.js                 # React root; wraps App in QueryClient, Router, Auth/Theme/Socket providers.
        ├── App.jsx                   # Route table (§2.1) + layout selection per role.
        │
        ├── /config
        │   ├── axios.js             # Axios instance + interceptors: attach Bearer, auto-refresh on 401, base URL.
        │   └── queryClient.js       # React Query client config (staleTime, retry).
        │
        ├── /context
        │   ├── AuthContext.jsx      # user/tokens, login(), logout(), register(), refresh(), role helpers.
        │   ├── ThemeContext.jsx     # theme state, toggleTheme(), persist to localStorage, apply [data-theme].
        │   └── SocketContext.jsx    # connect socket with token, expose on()/off() + auto-reconnect.
        │
        ├── /api  (thin API wrappers — one per domain, mirrors server routes)
        │   ├── auth.api.js          # register, login, refresh, logout, me.
        │   ├── user.api.js          # profile, password, avatar.
        │   ├── appointment.api.js   # slots, create, mine, getOne, cancel, rate, receipt.
        │   ├── staff.api.js         # incoming/mine, accept, reject, status, history, shift.
        │   ├── admin.api.js         # dashboard, users CRUD, discount, histories.
        │   ├── inventory.api.js     # services + extras CRUD, public list.
        │   ├── analytics.api.js     # summary, sales, report export.
        │   └── settings.api.js      # public settings, admin settings, nicknames.
        │
        ├── /hooks
        │   ├── useAuth.js           # consume AuthContext.
        │   ├── useTheme.js          # consume ThemeContext.
        │   ├── useSocketEvent.js    # subscribe to a socket event with cleanup.
        │   ├── useServices.js       # React Query: active services/extras.
        │   ├── useSlots.js          # React Query: available slots for service+date+staff.
        │   ├── useMyAppointments.js # customer history.
        │   ├── useBooking.js        # wizard reducer (step/service/extras/slot/staff/payment).
        │   ├── useAdminUsers.js     # paginated users (20/pp) + search.
        │   └── useAnalytics.js      # KPIs/series by range.
        │
        ├── /components  (reusable UI)
        │   ├── /ui                  # Button, Input, Select, Modal, Card, Badge, Table, Pagination, Tabs, Spinner, EmptyState, Toast, ThemeToggle, ConfirmDialog.
        │   ├── /layout
        │   │   ├── PublicNavbar.jsx # Landing top nav + theme toggle + login/register.
        │   │   ├── Sidebar.jsx      # Role-aware side panel (links vary by role).
        │   │   ├── Topbar.jsx       # Dashboard top bar: user menu, theme toggle, notifications bell.
        │   │   └── DashboardShell.jsx # Sidebar + Topbar + <Outlet/> wrapper used by all 3 portals.
        │   ├── ProtectedRoute.jsx   # Auth + role gate; redirects appropriately.
        │   ├── RoleGate.jsx         # Conditionally render by role.
        │   ├── StatusBadge.jsx      # Colored appointment status pill.
        │   ├── ServiceCard.jsx      # Image + name + price + Select button (booking/landing).
        │   ├── ExtraChip.jsx        # Toggleable additional (bleaching, etc.).
        │   ├── SlotPicker.jsx       # Date + time-slot grid from /slots.
        │   ├── StaffPicker.jsx      # Choose staff or "Auto (least loaded)".
        │   ├── ReceiptCard.jsx      # Styled receipt; export to PNG (html2canvas).
        │   ├── RatingStars.jsx      # 1–5 interactive stars.
        │   ├── DataTable.jsx        # Generic table + sorting + pagination.
        │   └── ChartPanel.jsx       # Recharts wrappers (line/bar/pie) for analytics.
        │
        ├── /pages
        │   ├── /public
        │   │   ├── Landing.jsx      # Hero + Services gallery + About + Contact + Location sections.
        │   │   ├── Login.jsx        # Login form (all roles) — handles mode-block messages.
        │   │   ├── Register.jsx     # Customer registration.
        │   │   └── Maintenance.jsx  # Offline/maintenance screen.
        │   ├── /user
        │   │   ├── BookWizard.jsx   # Main dashboard: 5-step booking wizard + confirmation + receipt.
        │   │   ├── History.jsx      # Booking history table (date, service, staff, status) + rate/cancel actions.
        │   │   └── Settings.jsx     # Profile info + change password.
        │   ├── /staff
        │   │   ├── Dashboard.jsx    # Incoming appointments (accept/reject) + active queue (start/finish).
        │   │   ├── History.jsx      # Served history + totalServed + avgRating + ratings list.
        │   │   └── Settings.jsx     # Profile + password + nickname (dropdown from allowed list).
        │   └── /admin
        │       ├── Dashboard.jsx    # Live counters (active staff, in-service, customers today, sales today).
        │       ├── StaffHistory.jsx # All staff appointment history.
        │       ├── UserHistory.jsx  # All user appointment history.
        │       ├── Analytics.jsx    # KPIs + charts + range filter + report export (CSV).
        │       ├── UserManager.jsx  # Paginated users/staff CRUD + per-booking discount control.
        │       ├── Inventory.jsx    # Services/Extras/Prices CRUD + image upload.
        │       └── SystemSettings.jsx # Mode (online/maintenance/offline), timezone/region, hours, nicknames, shop info.
        │
        ├── /utils
        │   ├── formatMoney.js       # PHP currency formatting.
        │   ├── datetime.js          # Asia/Manila formatting via dayjs.
        │   ├── receiptPng.js        # html2canvas → PNG download helper.
        │   └── constants.js         # Status enums, role enums, payment methods (mirrors server).
        │
        └── /styles
            ├── globals.css          # Tailwind directives (@tailwind base/components/utilities) + base/reset + typography. Imported once in index.js.
            └── theme.css            # Optional CSS variables mirroring the §1.1 tokens (single source of truth backing the Tailwind color tokens).
```

> **Styling choice (committed): Tailwind CSS** with `darkMode: 'class'`. Install + config in **§1.3**; `tailwind.config.js` + `postcss.config.js` live at the client root. All components use Tailwind utilities; theme flips via the `dark` class on `<html>`.

---

## 4. PAGE-BY-PAGE SPEC

### 4.1 Landing (`/`) — must be very appealing & modern
- **Hero:** full-width, bold headline ("AzCuts — Sharp Looks, Effortless Booking"), subtext, primary CTA "Book Now" (→ login/register), background image/gradient, theme-aware.
- **Services gallery:** responsive grid of `ServiceCard`s pulled from `/settings/public` (image, name, price) — hover lift, category tabs (Haircuts / Salon).
- **About:** brand story + the AzCuts team (Head dev Uelmark G. Valdehueza; assistants JM Nikko O. Gallardo, Lara Angel A. Habagat).
- **Contact:** phone, email, socials (from `shopInfo`), simple contact form (optional email later).
- **Location:** address + embedded map (`shopInfo.mapEmbedUrl`) + store hours.
- Sticky navbar with anchor links + theme toggle + Login/Register.

### 4.2 User — Booking Wizard (`/app/book`, main dashboard)
Five steps with a progress indicator, back/next, live running total:
1. **Service** — grid of `ServiceCard`s (image, name, price, **Select**). Filter by category.
2. **Extras** — `ExtraChip`s (bleaching, treatments…); multi-select, can be none; updates total + duration.
3. **Schedule** — `SlotPicker` (date → available time slots from `/appointments/slots`) + `StaffPicker` (specific staff or **Auto = least-loaded**; shows "may be pending if none available").
4. **Payment** — Cash (selectable) · GCash (disabled/"coming soon").
5. **Confirm** — summary card (service, extras, staff/auto, slot, subtotal, discount if any, total) → **Book** → server creates appointment → **ReceiptCard** shown with **Download PNG** button.
Live updates: if auto-assign couldn't place staff, the confirmation clearly states "Pending — awaiting staff acceptance".

### 4.3 User — History (`/app/history`)
- `DataTable`: Date · Service · Staff (name or "—") · Status badge · Total.
- Row actions: **Cancel** (if pending/accepted, opens reason dialog) · **Rate** (if done — `RatingStars` modal, editable) · **View receipt**.
- Live status updates via socket (`appointment:updated`) with a toast + auto row refresh; **rating prompt modal** auto-opens when a booking flips to Done.

### 4.4 User — Settings (`/app/settings`)
- Profile form: Full Name, Address (optional), Phone, Email.
- Security: change password (current + new + confirm).

### 4.5 Staff — Dashboard (`/staff/dashboard`)
- **Incoming** panel: pending appointments (pool + auto-routed to me) with **Accept** / **Reject (reason)**.
- **Active queue:** accepted → **Start** (in_service) → **Finish** (done).
- **Shift toggle** (active/inactive) in topbar. Live new-appointment toasts via `appointment:new`.

### 4.6 Staff — History (`/staff/history`)
- Served appointments table + summary cards: **Total Served**, **Avg Rating (stars)**, ratings/comments list.

### 4.7 Staff — Settings (`/staff/settings`)
- Same profile/security as user **plus Nickname** dropdown limited to `Settings.nicknames` (admin-managed list).

### 4.8 Admin — Dashboard (`/admin/dashboard`)
- Live counter cards: Active/In-service staff, Customers in service, **Total sales today**, appointments by status. Recent activity feed. All refresh via `dashboard:refresh` socket event.

### 4.9 Admin — Analytics (`/admin/analytics`)
- Range filter tabs: **Daily / Weekly / Monthly / Yearly / All-time**.
- KPI cards + `ChartPanel` charts (sales over time = line, top services = bar, status split = pie, revenue by staff = bar). **Report export** (CSV/JSON) button → `/analytics/report`.

### 4.10 Admin — User Manager (`/admin/users`)
- `DataTable` with **pagination (20 rows/page)** + search + role filter.
- Add/Edit/Delete users **and staff** (create-staff form sets role + nickname + temp password).
- **Discount control:** set/remove per-booking discount % (opens on a chosen appointment / user's latest booking) → server recomputes totals.

### 4.11 Admin — Inventory (`/admin/inventory`)
- Tabs: **Services** | **Extras**. CRUD with image upload (services), price, duration, active toggle. Uses `inventory.api`.

### 4.12 Admin — System Settings (`/admin/settings`)
- **System mode:** Online / Maintenance / Offline (with explanation of who can access each).
- Timezone/Region/Country (default Asia/Manila), store hours per weekday, slot step, tax rate.
- **Nickname manager:** add/edit/remove staff nickname options.
- Shop info (name, tagline, contact, address, map, socials) that feeds the landing page.

### 4.13 Receipt (component `ReceiptCard` + `receiptPng.js`)
- Shows: AzCuts header/logo, receipt no., datetime (Asia/Manila), customer, service, extras[], staff name, subtotal, discount (% + amount), tax, **total**, payment method, status.
- **Download PNG** via html2canvas (optional for the user, always available).

---

## 5. REAL-TIME (Socket.io client)
- Connect once (in `SocketContext`) with the access token; join happens server-side by role.
- Subscriptions (via `useSocketEvent`):
  - `appointment:new` → staff/admin dashboards: prepend card + toast.
  - `appointment:updated` → invalidate `useMyAppointments`/staff/admin lists; if status became `done` for the current user → open rating modal.
  - `appointment:assigned` → staff queue refresh.
  - `dashboard:refresh` → admin counters update.
  - `rating:added` → staff stats refresh.
- Reconnect + token refresh handled gracefully.

---

## 6. IMPLEMENTATION PHASES (client) — log each in `/AzCuts/implemented.md`
Kept **in lockstep with the server phases** so features are testable end-to-end.

- **Phase 0 — Skeleton & design system:** CRA/Vite init, install deps, **install + configure Tailwind CSS** (`npm i -D tailwindcss postcss autoprefixer` → `npx tailwindcss init -p` → set `darkMode:'class'`, content globs, color tokens, add `@tailwind` directives to `globals.css` — see §1.3), Router, providers, **light/dark toggle** (`dark` class on `<html>`), `/ui` base components (Tailwind-styled), DashboardShell/Sidebar/Topbar, Axios instance. **DoD:** app runs, Tailwind classes apply, theme toggle flips light/dark, empty routes render.
- **Phase 1 — Auth & guards:** Login/Register, AuthContext, protected + role-gated routes, silent refresh, redirect-by-role. **DoD:** admin (seed) + new customer can log in and land on the right portal.
- **Phase 2 — Landing page:** hero, services gallery (from `/settings/public`), about, contact, location — polished & responsive. **DoD:** landing looks modern in both themes and lists live services.
- **Phase 3 — Inventory display + Booking data:** service/extra fetching, `ServiceCard`, `SlotPicker`, `StaffPicker`. **DoD:** wizard steps 1–3 render live data.
- **Phase 4 — Booking wizard end-to-end:** full 5 steps → create appointment → `ReceiptCard` + PNG download. **DoD:** customer books and gets a correct receipt.
- **Phase 5 — User history + ratings:** history table, cancel dialog, rating modal (prompt after done + edit). **DoD:** customer manages bookings and rates staff.
- **Phase 6 — Staff portal:** dashboard (accept/reject/start/finish), shift toggle, history + stats. **DoD:** staff runs the full appointment lifecycle.
- **Phase 7 — Admin portal:** dashboard counters, User Manager (paginated CRUD + discounts), both history views. **DoD:** admin manages users/staff and bookings.
- **Phase 8 — Admin inventory & settings:** inventory CRUD + image upload, system settings (mode/timezone/hours/nicknames/shop info). **DoD:** admin configures the whole system; mode changes reflected in UI.
- **Phase 9 — Analytics & reports:** KPI cards, charts (Recharts), range filters, CSV/JSON export. **DoD:** analytics match server data.
- **Phase 10 — Real-time + polish:** Socket.io wiring, toasts, live updates everywhere; accessibility + responsive audit; empty/error/loading states. **DoD:** dashboards update live; UX polished.
- **Phase 11 — Deployment setup:** `npm run build`, environment config, serve build (Nginx/Netlify/Vercel or served by Express), point to production API/socket, CORS. **DoD:** documented client deploy steps.

---

## 7. CLIENT ENV (`.env`)
```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

## 8. HOW CLIENT ↔ SERVER CONNECT (quick reference)
- Every data call goes through `/src/api/*` → Axios instance (`REACT_APP_API_URL`) with Bearer token.
- Enums/status/roles/payment constants in `/utils/constants.js` **must match** the server enums in `SERVER_PLAN.md §3`.
- Money & status come **computed from the server** — the client only displays them.
- Times displayed in `Asia/Manila` using the timezone from `/settings/public`.
- Real-time via Socket.io at `REACT_APP_SOCKET_URL` — event names match `SERVER_PLAN.md §7`.
