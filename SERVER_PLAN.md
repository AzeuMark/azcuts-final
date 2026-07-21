# AzCuts — SERVER PLAN (Backend / API)

> **Project:** AzCuts — Barber Shop & Salon Management System
> **Stack:** MERN (this document = the **Node.js + Express + MongoDB** side)
> **Head Developer:** Uelmark G. Valdehueza
> **Assistant Developers:** JM Nikko O. Gallardo · Lara Angel A. Habagat
> **Database:** MongoDB @ `mongodb://localhost:27017` · DB name: `azeubarbersalondb` (auto-created on first write)
> **Run command:** `node server.js` or `nodemon server.js`
> **Companion document:** `CLIENT_PLAN.md` (frontend). Both plans share ONE data model and ONE API contract — read them together.

---

## 0. LOCKED DECISIONS (source of truth for both plans)

| Area | Decision |
|---|---|
| **Auth** | JWT — short-lived **access token** + long-lived **refresh token** |
| **Roles** | `user` (customer), `staff`, `admin` |
| **Staff accounts** | Created by **Admin only** (no staff self-registration) |
| **Scheduling** | **Fixed time slots**; every service has a `durationMinutes`; store has open/close hours |
| **Image storage** | **Local disk** via Multer → `/server/uploads/` served statically |
| **Ratings** | Customer is **prompted after "Done"** AND can **edit later** from Booking History |
| **Discounts** | **Per-booking manual %** — admin sets the % on an individual appointment |
| **Real-time** | **Socket.io** — live push of appointment status + dashboard counters |
| **Least-loaded staff** | Fewest **active** appointments (status `pending` + `in_service`) |
| **Theme** | Frontend concern — clean/modern with **light/dark toggle** (see client plan) |
| **Timezone** | Default **Asia/Manila**; configurable in Admin > Settings |
| **Payment** | `cash` implemented. `gcash` = field exists but **disabled** (never processed) |

---

## 1. HIGH-LEVEL CONTEXT & PURPOSE

AzCuts is a full management platform for a single barber shop & salon branch. It replaces walk-in guesswork and paper logs with:

- A **public landing page** to attract customers (services, gallery, about, contact, location).
- A **customer portal** to book a haircut/service + extras, pick a staff (or auto-assign), pick a time slot, choose payment, and receive a **downloadable receipt**.
- A **staff portal** to accept/reject incoming appointments and track their served history + ratings.
- An **admin portal** to run the whole shop: analytics, user/staff management, inventory (services/extras/prices), per-booking discounts, and system mode (online/maintenance/offline).

The **server** is a stateless REST API (plus a Socket.io channel) that owns ALL business rules: authentication, role permissions, slot availability, the auto-assign algorithm, pricing math (extras + discount + tax), status-transition rules, and analytics aggregation. The client never computes money or trusts its own role — the server decides everything.

### 1.1 Core value the backend must guarantee
1. **No double-booking** — a staff member can never hold two overlapping appointments in the same slot.
2. **Money is always correct** — final price is computed **server-side** from live inventory prices, never from numbers sent by the browser.
3. **Legal status transitions only** — the appointment lifecycle is enforced as a state machine.
4. **Role isolation** — a user can never read another user's data; staff can't touch admin endpoints; etc.
5. **System mode gate** — offline/maintenance mode blocks logins/actions per the rules below.

---

## 2. THE CORE ALGORITHMS (write these first, in Phase 1–4)

### 2.1 Appointment State Machine (the heart of the system)
```
                 ┌─────────── cancel (reason + cancelledBy) ──────────┐
                 v                                                     |
   [ pending ] ──accept(staff)──> [ accepted ] ──start──> [ in_service ] ──finish──> [ done ]
        |                              |
        └────── cancel ───────────────┘
   ( done  = TERMINAL — cannot cancel )
   ( cancelled = TERMINAL )
```
Rules enforced in `appointment.service.js`:
- **pending → accepted**: only `staff` (self) or `admin`. Sets `assignedStaff`, `acceptedAt`.
- **accepted → in_service**: staff/admin. Sets `startedAt`.
- **in_service → done**: staff/admin. Sets `finishedAt`, freezes final price, unlocks the rating prompt for the customer.
- **pending/accepted → cancelled**: user (own booking), staff (assigned), or admin. **Requires** `cancelReason` + records `cancelledBy` (userId + role). Sets `cancelledAt`.
- **done / cancelled**: TERMINAL — any transition attempt returns `409 Conflict`.
- Every transition emits a Socket.io event (see §7) and appends to the appointment's `statusHistory[]` audit array.

A single guard function validates transitions from a constant map:
```js
const ALLOWED = {
  pending:    ['accepted', 'cancelled'],
  accepted:   ['in_service', 'cancelled'],
  in_service: ['done'],
  done:       [],
  cancelled:  [],
};
```

### 2.2 Slot Availability Algorithm
Inputs: `serviceId` (→ `durationMinutes`), `date`, optional `staffId`.
1. Load store hours for that weekday from `Settings.storeHours` (e.g. 09:00–20:00) + `slotStepMinutes` (e.g. 30).
2. Generate candidate start times: `open, open+step, … until (close - duration)`.
3. For each candidate `[start, start+duration)`:
   - If `staffId` given → mark **available** only if that staff has NO appointment (status ∈ pending/accepted/in_service) overlapping the interval.
   - If no `staffId` (auto) → mark **available** if **at least one** active staff is free in that interval.
4. Return the list of slots with `{ start, end, availableStaffCount }`. Past slots (already elapsed today, in Asia/Manila) are excluded.

Overlap test: `existing.start < candidate.end && existing.end > candidate.start`.

### 2.3 Auto-Assign "Least-Loaded" Algorithm
Triggered when the customer chooses **Auto** OR books without picking staff.
1. Get all `staff` with `status = active` who are **free** for the chosen slot (via §2.2 overlap test).
2. If the free set is empty → create the appointment with `assignedStaff = null` and `status = pending` (flagged "awaiting staff"), notify all staff via Socket.io.
3. Otherwise compute each free staff's **load = count of appointments where status ∈ {pending, in_service}** (per the locked definition). Pick the **minimum load**; break ties by **lowest avgRating count / earliest createdAt** (deterministic). Assign them, set `status = pending` (staff still must accept) — the appointment is routed but not yet confirmed.

> Note: auto-assign **routes** the booking to the best staff; the staff still explicitly **accepts** on their dashboard, keeping a human in the loop.

### 2.4 Pricing Engine (server-authoritative)
```
base        = service.price
extrasTotal = Σ extra.price   (for each selected extra id, looked up live)
subtotal    = base + extrasTotal
discountAmt = round(subtotal * (discountPercent / 100))     // per-booking %, admin-set, default 0
taxAmt      = round((subtotal - discountAmt) * taxRate)      // taxRate from Settings (default 0)
total       = subtotal - discountAmt + taxAmt
```
- All money stored as **numbers in the store's currency (PHP)**, rounded to 2 decimals at boundaries.
- Prices are **snapshotted** onto the appointment at creation (`priceSnapshot`) so later inventory edits never rewrite historical receipts.
- `discountPercent` can be applied/edited by admin (User Manager or appointment view) **before** the appointment is `done`; recompute totals on change while not terminal.

### 2.5 System Mode Gate (middleware `systemMode.js`)
Reads `Settings.systemMode` ∈ `online | maintenance | offline`:
- **online** → everyone allowed.
- **maintenance** → only `admin` + `staff` may log in / use protected routes. `user` gets `503` with a friendly message.
- **offline** → only `admin`. `staff` + `user` get `503`.
- The **login** route itself must check mode AFTER verifying credentials + role so the right people can still get in.

### 2.6 Receipt Generation
- Receipt **data** is assembled server-side (`receipt.service.js`) into a canonical JSON: shop info, receipt no., datetime (Asia/Manila), customer, service, extras[], staff name, subtotal, discount %, discount amount, tax, total, payment method, status.
- The **PNG render happens on the client** (html2canvas of a styled receipt component) — the server just guarantees the numbers. A `GET /appointments/:id/receipt` endpoint returns that canonical JSON. (Optional Phase: server-side PDF via `pdfkit` if you later want emailed receipts.)

---

## 3. DATABASE DESIGN (MongoDB — `azeubarbersalondb`)

> Mongoose auto-creates the DB + collections on first insert. `timestamps: true` adds `createdAt`/`updatedAt` to every model.

### 3.1 `users` — customers, staff, and admin (single collection, role-discriminated)
| Field | Type | Purpose |
|---|---|---|
| `_id` | ObjectId | PK |
| `fullName` | String, required | Display + receipts |
| `nickname` | String | Staff title (e.g. "Barber", "Hairstylist") — value picked from `Settings.nicknames`. For users/admin it's free/label |
| `email` | String, required, **unique**, lowercased | Login id |
| `phone` | String | Contact; shown on receipt/profile |
| `address` | String, optional | Profile |
| `password` | String (bcrypt hash) | Never returned by API (`select:false`) |
| `role` | Enum `user\|staff\|admin`, default `user` | Authorization |
| `status` | Enum `active\|inactive\|in_service`, default `active` | For staff: shows on/off shift & currently serving; for users: enable/disable account |
| `isApproved` | Boolean, default true | Reserved; admin-created staff are pre-approved |
| `avatar` | String (path) | Optional profile image (Multer) |
| `totalServed` | Number, default 0 | (staff) lifetime completed appointments — denormalized counter |
| `avgRating` | Number, default 0 | (staff) rolling average of ratings |
| `ratingCount` | Number, default 0 | (staff) number of ratings — used to recompute avg |
| `createdAt/updatedAt` | Date | Audit |

Indexes: `{ email: 1 }` unique, `{ role: 1, status: 1 }`.

### 3.2 `services` — haircuts & salon services (the "Inventory" main items)
| Field | Type | Purpose |
|---|---|---|
| `_id` | ObjectId | PK |
| `name` | String, required | e.g. "Skin Fade", "Hair Color" |
| `category` | Enum `haircut\|salon`, default `haircut` | Grouping on landing + booking |
| `description` | String | Card + landing detail |
| `price` | Number, required | Base price (PHP) |
| `durationMinutes` | Number, required, default 30 | Drives slot generation |
| `image` | String (path) | Card image (template now, real later) |
| `isActive` | Boolean, default true | Hide without deleting (keeps history intact) |
| timestamps | Date | Audit |

Index: `{ category: 1, isActive: 1 }`.

### 3.3 `extras` — additionals (bleaching, treatments, etc.)
| Field | Type | Purpose |
|---|---|---|
| `_id` | ObjectId | PK |
| `name` | String, required | e.g. "Bleaching", "Hot Towel" |
| `price` | Number, required | Added to subtotal |
| `durationMinutes` | Number, default 0 | Optionally extends slot length |
| `isActive` | Boolean, default true | Soft-hide |
| timestamps | Date | Audit |

### 3.4 `appointments` — the central transactional collection
| Field | Type | Purpose |
|---|---|---|
| `_id` | ObjectId | PK |
| `receiptNo` | String, unique | Human id e.g. `AZ-20260715-0007` (date + daily counter) |
| `customer` | ObjectId → users | Who booked |
| `assignedStaff` | ObjectId → users, nullable | Serving staff (null = awaiting staff / pending pool) |
| `service` | ObjectId → services | Chosen main service |
| `extras` | [ObjectId → extras] | Selected add-ons |
| `priceSnapshot` | Object | `{ base, extras:[{id,name,price}], subtotal, discountPercent, discountAmount, taxRate, taxAmount, total, currency }` frozen at booking |
| `scheduledStart` | Date | Slot start (UTC in DB, rendered Asia/Manila) |
| `scheduledEnd` | Date | Slot end (= start + total duration) |
| `status` | Enum `pending\|accepted\|in_service\|done\|cancelled` | State machine (§2.1) |
| `statusHistory` | [ `{ status, at, byUser, byRole, note }` ] | Full audit trail |
| `paymentMethod` | Enum `cash\|gcash`, default `cash` | gcash stored but disabled |
| `paymentStatus` | Enum `unpaid\|paid`, default `unpaid` | Staff/admin marks paid |
| `cancelReason` | String | Required when cancelled |
| `cancelledBy` | `{ userId, role }` | Who cancelled |
| `rating` | `{ stars (1–5), comment, ratedAt }`, nullable | Customer rating (after done) |
| `autoAssigned` | Boolean | Whether §2.3 picked the staff |
| `acceptedAt/startedAt/finishedAt/cancelledAt` | Date | Milestone timestamps for analytics |
| timestamps | Date | Audit |

Indexes: `{ customer:1, createdAt:-1 }`, `{ assignedStaff:1, scheduledStart:1 }`, `{ status:1, scheduledStart:1 }`, `{ receiptNo:1 }` unique.

### 3.5 `settings` — single-document system config (`_id: "system"`)
| Field | Type | Purpose |
|---|---|---|
| `systemMode` | Enum `online\|maintenance\|offline`, default `online` | §2.5 gate |
| `timezone` | String, default `Asia/Manila` | Display + slot math |
| `region` / `country` | String, default `PH` | Admin-editable |
| `currency` | String, default `PHP` | Money label |
| `taxRate` | Number, default 0 | Pricing engine |
| `storeHours` | `{ mon:{open,close,closed}, …, sun:{…} }` | Slot generation per weekday |
| `slotStepMinutes` | Number, default 30 | Slot granularity |
| `nicknames` | [String] | Staff title options (admin add/edit/remove) e.g. `["Barber","Hairstylist","Hairdresser","Stylist","No Input"]` |
| `shopInfo` | `{ name:"AzCuts", tagline, phone, email, address, mapEmbedUrl, socials{} }` | Landing About/Contact/Location |
| timestamps | Date | Audit |

> Seeded automatically on first boot if missing (`seed/settings.seed` logic in `config/bootstrap.js`).

### 3.6 `refreshtokens` (optional but recommended)
| Field | Type | Purpose |
|---|---|---|
| `token` | String, unique | Stored (hashed) refresh token for rotation/revocation |
| `user` | ObjectId → users | Owner |
| `expiresAt` | Date (TTL index) | Auto-expire |
| `revoked` | Boolean | Logout / force sign-out |

TTL index on `expiresAt` auto-cleans expired tokens.

### 3.7 Relationships (ER summary)
```
users(1) ───< appointments >─── (1)services
   │  (customer / assignedStaff)         │
   │                                     └──< extras (many via array)
   └──< refreshtokens
settings = 1 singleton doc
```

---

## 4. SERVER FILE STRUCTURE (every file's purpose)

```
/AzCuts
└── /server
    ├── server.js                      # Entry point. Loads env, connects DB, mounts app, starts HTTP + Socket.io, prints ready log.
    ├── app.js                         # Builds the Express app: global middleware (cors, json, helmet, morgan), static /uploads, route mounting, error handler. Exported for testing.
    ├── package.json                   # Deps + scripts ("start":"node server.js", "dev":"nodemon server.js").
    ├── .env                           # PORT, MONGO_URI, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, token TTLs, CLIENT_ORIGIN. (gitignored)
    ├── .env.example                   # Template of the above with dummy values for teammates.
    ├── .gitignore                     # node_modules, .env, /uploads/* (keep .gitkeep).
    │
    ├── /config
    │   ├── db.js                      # Mongoose connect() to azeubarbersalondb, connection event logs, retry.
    │   ├── env.js                     # Centralized, validated env access (throws if a required var is missing).
    │   └── bootstrap.js               # On boot: ensure Settings singleton + default nicknames exist; ensure /uploads dir exists.
    │
    ├── /models
    │   ├── User.js                    # users schema (§3.1) + password hash pre-save hook + comparePassword() + hidden password.
    │   ├── Service.js                 # services schema (§3.2).
    │   ├── Extra.js                   # extras schema (§3.3).
    │   ├── Appointment.js             # appointments schema (§3.4) + statusHistory + indexes.
    │   ├── Settings.js                # settings singleton schema (§3.5).
    │   └── RefreshToken.js            # refresh token store (§3.6) with TTL index.
    │
    ├── /middleware
    │   ├── auth.js                    # verifyAccessToken → attaches req.user {id, role}. 401 if invalid.
    │   ├── roles.js                   # requireRole('admin'|'staff'|...) authorization guard. 403 if wrong role.
    │   ├── systemMode.js              # §2.5 gate applied to protected routes.
    │   ├── upload.js                  # Multer config: disk storage → /uploads, filename hashing, mime/size limits (images only, e.g. 5MB).
    │   ├── validate.js                # Runs express-validator chains, returns 422 with field errors.
    │   └── error.js                   # Central error handler → consistent JSON { success:false, message, errors? }.
    │
    ├── /validators
    │   ├── auth.validator.js          # register/login/refresh body rules.
    │   ├── user.validator.js          # profile update, password change, admin create-staff rules.
    │   ├── appointment.validator.js   # booking payload, status-change, rating, cancel(reason) rules.
    │   ├── inventory.validator.js     # service/extra create+update rules.
    │   └── settings.validator.js      # mode/timezone/hours/nicknames rules.
    │
    ├── /controllers
    │   ├── auth.controller.js         # register(user), login, refresh, logout, me.
    │   ├── user.controller.js         # getProfile, updateProfile, changePassword, avatar upload.
    │   ├── staff.controller.js        # staff dashboard feed, accept/reject, my history + stats, set on/off shift.
    │   ├── admin.controller.js        # dashboard summary, list/create/edit/delete users+staff, per-booking discount, both history views.
    │   ├── appointment.controller.js  # createBooking, listMine, getOne, changeStatus, cancel, rateAppointment, availableSlots, receipt.
    │   ├── inventory.controller.js    # services + extras CRUD (+image upload).
    │   ├── analytics.controller.js    # aggregation endpoints with daily/weekly/monthly/yearly/all-time filters + report export.
    │   └── settings.controller.js     # get/update system settings, nickname add/edit/remove, mode switch.
    │
    ├── /services  (business logic layer — controllers stay thin)
    │   ├── auth.service.js            # token signing/rotation, credential checks, mode-aware login.
    │   ├── appointment.service.js     # STATE MACHINE (§2.1), createBooking orchestration, receiptNo generator.
    │   ├── scheduling.service.js      # slot generation (§2.2) + overlap checks.
    │   ├── assignment.service.js      # least-loaded auto-assign (§2.3).
    │   ├── pricing.service.js         # pricing engine (§2.4) + snapshot builder.
    │   ├── rating.service.js          # apply/update rating → recompute staff avgRating/ratingCount.
    │   ├── analytics.service.js       # Mongo aggregation pipelines (sales, counts, charts, top services/staff).
    │   ├── receipt.service.js         # canonical receipt JSON builder.
    │   └── notify.service.js          # thin wrapper over Socket.io emits (single place for all events).
    │
    ├── /routes
    │   ├── index.js                   # Mounts all routers under /api (e.g. /api/auth, /api/appointments …).
    │   ├── auth.routes.js             # POST /register /login /refresh /logout · GET /me
    │   ├── user.routes.js             # GET/PUT /profile · PUT /password · POST /avatar
    │   ├── staff.routes.js            # GET /staff/appointments · PATCH /staff/appointments/:id/accept|reject · GET /staff/history · PATCH /staff/shift
    │   ├── appointment.routes.js      # POST / · GET /mine · GET /:id · GET /slots · PATCH /:id/status · PATCH /:id/cancel · POST /:id/rate · GET /:id/receipt
    │   ├── inventory.routes.js        # CRUD /services · CRUD /extras (admin)
    │   ├── admin.routes.js            # /admin/dashboard · /admin/users (CRUD) · /admin/discount · /admin/history/staff · /admin/history/users
    │   ├── analytics.routes.js        # /analytics/summary · /analytics/sales · /analytics/report (admin)
    │   └── settings.routes.js         # GET /settings (public shopInfo subset) · PUT /settings (admin) · nickname routes
    │
    ├── /socket
    │   ├── index.js                   # Socket.io init, JWT handshake auth, room joining (user:<id>, staff room, admin room).
    │   └── events.js                  # Event name constants + emit helpers (appointment:new, :updated, dashboard:refresh).
    │
    ├── /utils
    │   ├── ApiError.js                # Typed error class (statusCode + message).
    │   ├── asyncHandler.js            # try/catch wrapper for async controllers.
    │   ├── response.js                # Uniform success/error JSON shapers.
    │   ├── receiptNo.js               # Daily-counter receipt number generator.
    │   ├── datetime.js                # Asia/Manila-aware helpers (day boundaries, week/month ranges) using Luxon/dayjs.
    │   └── logger.js                  # Console/file logger.
    │
    ├── /uploads                       # Multer-written images (services, avatars). Static-served at /uploads/*. .gitkeep only.
    │
    └── /seed
        ├── admin.seed.json            # ADMIN account for Compass import (email admin@azcuts.com / pass Admin@123). Already generated.
        ├── settings.seed.json         # Default settings doc (mode online, Asia/Manila, hours, nicknames, shopInfo).
        ├── services.seed.json         # Sample haircuts/services (template images) for demo.
        ├── extras.seed.json           # Sample additionals (bleaching, etc.).
        └── seed.js                    # Optional: `node seed/seed.js` to bulk-load all seeds programmatically.
```

---

## 5. API CONTRACT (shared with client — endpoint → purpose → who)

> Base URL: `http://localhost:5000/api`. All protected routes require `Authorization: Bearer <accessToken>`.
> Standard response: `{ success, data, message }` or `{ success:false, message, errors }`.

### Auth
| Method | Path | Body / Params | Access | Purpose |
|---|---|---|---|---|
| POST | `/auth/register` | fullName,email,phone,password | public | Customer self-register (role forced to `user`) |
| POST | `/auth/login` | email,password | public (mode-gated) | Returns access+refresh + user profile |
| POST | `/auth/refresh` | refreshToken | public | Rotate access token |
| POST | `/auth/logout` | refreshToken | auth | Revoke refresh token |
| GET | `/auth/me` | — | auth | Current user profile |

### Profile / Settings (self)
| PUT | `/users/profile` | fullName,address,phone,email,nickname* | auth | Update own profile (*nickname only for staff, value must be in Settings.nicknames) |
| PUT | `/users/password` | currentPassword,newPassword | auth | Change password |
| POST | `/users/avatar` | file | auth | Upload avatar |

### Booking (customer)
| GET | `/appointments/slots` | serviceId,date,staffId? | auth(user) | Available slots (§2.2) |
| POST | `/appointments` | serviceId,extras[],scheduledStart,staffId?|auto,paymentMethod | auth(user) | Create booking (server computes price, assigns/routes staff, generates receiptNo) |
| GET | `/appointments/mine` | ?status,page | auth(user) | Booking history (table) |
| GET | `/appointments/:id` | — | auth(owner/staff/admin) | Single appointment |
| GET | `/appointments/:id/receipt` | — | auth(owner/staff/admin) | Canonical receipt JSON (client renders PNG) |
| PATCH | `/appointments/:id/cancel` | cancelReason | auth(owner/assigned staff/admin) | Cancel (blocked if done/accepted-by-rule) |
| POST | `/appointments/:id/rate` | stars,comment | auth(owner, status done) | Add/edit rating (§ rating flow) |

### Staff
| GET | `/staff/appointments` | ?scope=incoming\|mine | auth(staff) | Pending pool + own accepted queue |
| PATCH | `/staff/appointments/:id/accept` | — | auth(staff) | pending→accepted (self) |
| PATCH | `/staff/appointments/:id/reject` | reason | auth(staff) | Decline (returns to pool / cancel per policy) |
| PATCH | `/appointments/:id/status` | status(in_service\|done) | auth(assigned staff/admin) | Advance state machine |
| GET | `/staff/history` | ?filter | auth(staff) | Served history + totalServed + avgRating + ratings list |
| PATCH | `/staff/shift` | status(active\|inactive) | auth(staff) | On/off shift toggle |

### Admin
| GET | `/admin/dashboard` | — | auth(admin) | Live counters: active staff, in-service, customers today, sales today |
| GET | `/admin/users` | ?role,page(20/pp),search | auth(admin) | Paginated users+staff table |
| POST | `/admin/users` | fullName,email,phone,role,password,nickname | auth(admin) | Create user OR **staff** |
| PUT | `/admin/users/:id` | any editable field | auth(admin) | Edit user/staff info |
| DELETE | `/admin/users/:id` | — | auth(admin) | Delete user/staff |
| PATCH | `/admin/appointments/:id/discount` | discountPercent | auth(admin) | Set per-booking discount % → recompute totals |
| GET | `/admin/history/staff` | ?filter,page | auth(admin) | All staff appointment history |
| GET | `/admin/history/users` | ?filter,page | auth(admin) | All user appointment history |

### Inventory (admin)
| GET/POST | `/services` · `/services/:id`(PUT,DELETE) | fields+image | admin (GET public for landing) | Manage services |
| GET/POST | `/extras` · `/extras/:id`(PUT,DELETE) | fields | admin (GET public) | Manage extras |

### Analytics (admin)
| GET | `/analytics/summary` | ?range=daily\|weekly\|monthly\|yearly\|all | admin | KPIs |
| GET | `/analytics/sales` | ?range | admin | Time-series for charts |
| GET | `/analytics/report` | ?range,format=json\|csv | admin | Report generation/export |

### System Settings
| GET | `/settings/public` | — | public | shopInfo + services for landing |
| GET | `/settings` | — | admin | Full settings |
| PUT | `/settings` | mode,timezone,region,hours,tax,... | admin | Update system config |
| POST/PUT/DELETE | `/settings/nicknames` | value | admin | Manage staff nickname options |

---

## 6. SECURITY & VALIDATION RULES
- Passwords hashed with **bcryptjs** (cost 10). Never returned (`select:false`).
- **JWT**: access token TTL ~15m, refresh ~7d, stored/rotated in `refreshtokens`; refresh rotation + reuse detection.
- **helmet**, **cors** (restricted to `CLIENT_ORIGIN`), **express-rate-limit** on `/auth/*`.
- **express-validator** on every write route; central 422 formatter.
- File uploads: Multer restricts to image mime types + size cap; randomized filenames.
- Authorization: every non-public route runs `auth` → `systemMode` → `requireRole` (as needed) → controller.
- Ownership checks in controllers (a user can only read/modify their own appointment/profile).
- Never trust client money/role/status — recompute/verify server-side.

---

## 7. SOCKET.IO EVENTS (real-time contract, shared with client)
Handshake: client sends access token → server verifies → joins rooms `user:<id>`, plus `staff` room (if staff) and `admin` room (if admin).

| Event | Emitted when | Sent to | Payload |
|---|---|---|---|
| `appointment:new` | Customer books | `staff` room + `admin` | minimal appointment card |
| `appointment:updated` | Any status change | `user:<customerId>`, assigned `staff`, `admin` | id, status, timestamps |
| `appointment:assigned` | Auto/accept sets staff | that `user:<staffId>` | appointment |
| `dashboard:refresh` | Any event affecting counters | `admin` | {activeStaff,inService,salesToday,...} |
| `rating:added` | Customer rates | assigned `staff`, `admin` | staffId, newAvg |

All emits funnel through `notify.service.js` so business logic never touches sockets directly.

---

## 8. IMPLEMENTATION PHASES (server) — log each in `/AzCuts/implemented.md`

- **Phase 0 — Project skeleton:** init `/server`, install deps (express, mongoose, jsonwebtoken, bcryptjs, dotenv, cors, helmet, morgan, multer, express-validator, socket.io, dayjs/luxon), scaffold folders, `app.js`+`server.js`, `config/db.js`, `bootstrap.js`, health route. **DoD:** `nodemon server.js` connects to `azeubarbersalondb` and `/api/health` returns 200.
- **Phase 1 — Models & Auth:** all Mongoose models, JWT register/login/refresh/logout/me, `auth` + `roles` middleware, refresh-token store. **DoD:** admin (from seed) can log in; customer can register+login.
- **Phase 2 — Inventory:** services + extras CRUD + image upload (Multer) + public GET for landing/booking. **DoD:** admin manages inventory; public can fetch active services.
- **Phase 3 — Scheduling & Booking core:** `scheduling.service` (slots), `pricing.service`, `appointment.service` create + receiptNo, `POST /appointments`, `GET /slots`, `GET /mine`, receipt JSON. **DoD:** customer completes a full booking; totals correct; receipt data returned.
- **Phase 4 — State machine & Staff flow:** status transitions, staff dashboard feed, accept/reject/start/finish, auto-assign (`assignment.service`), cancel with reason. **DoD:** full lifecycle Pending→…→Done + Cancelled enforced; auto-assign picks least-loaded.
- **Phase 5 — Ratings:** rate after done + edit; recompute staff avg. **DoD:** rating updates staff stats.
- **Phase 6 — Admin management:** dashboard summary, user/staff CRUD (paginated 20/pp), per-booking discount, both history views. **DoD:** admin runs the shop.
- **Phase 7 — Analytics & Reports:** aggregation pipelines + range filters + CSV/JSON export. **DoD:** analytics endpoints return correct KPIs & series.
- **Phase 8 — System settings & mode gate:** settings CRUD, nickname management, `systemMode` middleware, timezone/region. **DoD:** offline/maintenance modes correctly restrict logins.
- **Phase 9 — Real-time:** Socket.io wiring + all events. **DoD:** dashboards update live without refresh.
- **Phase 10 — Hardening & Deployment setup:** rate limiting, validation coverage, error handling audit, `.env.example`, PM2/process config, production build notes, CORS lockdown, Mongo backup note. **DoD:** documented deploy steps; server runs stable.

---

## 9. ENV VARS (`.env`)
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/azeubarbersalondb
JWT_ACCESS_SECRET=change_me_access
JWT_REFRESH_SECRET=change_me_refresh
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=7d
CLIENT_ORIGIN=http://localhost:3000
DEFAULT_TZ=Asia/Manila
```

## 10. ADMIN SEED (Compass import)
Import `/AzCuts/seed/admin.seed.json` into DB `azeubarbersalondb` → collection `users`.
- **Login:** `admin@azcuts.com` · **Password:** `Admin@123` (bcrypt-hashed in the file). **Change it after first login.**
