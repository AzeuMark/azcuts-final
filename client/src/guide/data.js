// Paper-bullet → where-it-lives maps. Source: school-requirements.txt.
// `where` is the in-app route; `steps` is the click path a classmate follows.

export const CUSTOMER_FEATURES = [
  {
    bullet: 'Register Account',
    where: '/ (landing page)',
    steps: ['Click "Book Appointment"', 'The slide-in panel opens in Sign up mode', 'Fill Full name, Username, Email, Password → Create account', 'You land on /app/book'],
    endpoint: 'POST /api/auth/register',
  },
  {
    bullet: 'Log In',
    where: '/ (landing page)',
    steps: ['Click "Log in" (top bar)', 'Enter email (or username) + password', 'Role decides the landing page: customer → /app/book'],
    endpoint: 'POST /api/auth/login',
  },
  {
    bullet: 'View Available Services',
    where: '/ → #services, /app/book',
    steps: ['Scroll the landing page to Services, or open Book → live list with price + duration'],
    endpoint: 'GET /api/services, GET /api/settings/public',
  },
  {
    bullet: 'Select Service',
    where: '/app/book → step 1',
    steps: ['Click a service card → Select', 'Running total appears on the right'],
    endpoint: '— (client state)',
  },
  {
    bullet: 'Select Preferred Date and Time',
    where: '/app/book → step 2 (Schedule)',
    steps: ['Pick a date → free time slots come from the server (only times with a free barber)', 'The owner assigns your barber after you book — customers never pick one', 'Past hours and closed days are excluded automatically'],
    endpoint: 'GET /api/appointments/slots',
  },
  {
    bullet: 'Book Appointment',
    where: '/app/book → step 4 (Confirm)',
    steps: ['Payment is Cash (pay at the shop)', 'Review → Confirm booking → receipt screen with receipt number'],
    endpoint: 'POST /api/appointments',
  },
  {
    bullet: 'View Appointment Information',
    where: '/app/history → Receipt',
    steps: ['Any row → Receipt button → full receipt (shop, schedule, items, totals, payment, status)'],
    endpoint: 'GET /api/appointments/:id/receipt',
  },
  {
    bullet: 'View Appointment Status',
    where: '/app/history',
    steps: ['Status badge on every row (pending → accepted → in_service → done)', 'Filter tabs: All / Pending / Accepted / Done / Cancelled'],
    endpoint: 'GET /api/appointments/mine',
  },
  {
    bullet: 'View Appointment History',
    where: '/app/history',
    steps: ['Same table — every past and current booking, newest first', 'Cancel (pending/accepted) with optional reason'],
    endpoint: 'GET /api/appointments/mine, PATCH /api/appointments/:id/cancel',
  },
  {
    bullet: 'Log Out',
    where: 'Top bar → account menu',
    steps: ['Click your name → Log out → back to the landing page'],
    endpoint: 'POST /api/auth/logout',
  },
];

export const BARBER_FEATURES = [
  {
    bullet: 'Log In',
    where: '/ (landing page)',
    steps: ['Log in with a staff account (ask the admin to create one, or use cristiano@azcuts.com / Staff@123)', 'You land on /staff/dashboard'],
    endpoint: 'POST /api/auth/login',
  },
  {
    bullet: 'View Assigned Appointments',
    where: '/staff/dashboard → Incoming',
    steps: ['Bookings the owner assigned to you appear here with customer + service + time'],
    endpoint: 'GET /api/staff/appointments?scope=incoming',
  },
  {
    bullet: 'View Assigned Schedules',
    where: '/staff/dashboard → My queue',
    steps: ['Everything you accepted, ordered by schedule — this is your day plan'],
    endpoint: 'GET /api/staff/appointments?scope=mine',
  },
  {
    bullet: 'Review Appointment Details',
    where: '/staff/dashboard (cards)',
    steps: ['Each card shows receipt no., customer, service, schedule, and status'],
    endpoint: 'GET /api/appointments/:id',
  },
  {
    bullet: 'Confirm Appointment',
    where: '/staff/dashboard → Accept',
    steps: ['Incoming → Accept → moves to My queue (status: accepted)', 'Unassigned bookings cannot be claimed — the owner assigns them'],
    endpoint: 'PATCH /api/staff/appointments/:id/accept',
  },
  {
    bullet: 'Update Appointment Status',
    where: '/staff/dashboard → My queue',
    steps: ['Accepted → Start service (in_service) → Finish (done)', 'Finishing auto-creates the service sale + frees you for the next client'],
    endpoint: 'PATCH /api/appointments/:id/status',
  },
  {
    bullet: 'Record Sales Transactions (Services)',
    where: '/staff/dashboard → Record sale, /staff/sales',
    steps: ['Record sale → Type: Service → pick one → Add → Record', 'Service sales are also auto-created when you finish a booking'],
    endpoint: 'POST /api/sales',
  },
  {
    bullet: 'Record Sales Transactions (Products)',
    where: '/staff/dashboard → Record sale',
    steps: ['Record sale → Type: Product → pick (live stock shown) → Qty → Add → Record', 'Stock drops automatically; overselling is blocked with a clear error'],
    endpoint: 'POST /api/sales (+ atomic stock decrement)',
  },
  {
    bullet: 'View Relevant Sales Records',
    where: '/staff/sales',
    steps: ['Every sale you recorded or performed, with a Booking/Counter badge', 'Date, sale no., items, customer, total'],
    endpoint: 'GET /api/sales/mine',
  },
  {
    bullet: 'Update Product Usage / Stock (when authorized)',
    where: '/staff/inventory',
    steps: ['Ask the admin to tick "Can update stock" on your account first', 'Inventory → Update → Usage/Sale/Stock-in/Adjustment + quantity', 'Low & out filter shows what needs attention'],
    endpoint: 'GET /api/inventory/levels, PATCH /api/inventory/update',
  },
  {
    bullet: 'Log Out',
    where: 'Top bar → account menu',
    steps: ['Click your name → Log out'],
    endpoint: 'POST /api/auth/logout',
  },
];

export const OWNER_FEATURES = [
  {
    bullet: 'Log In + Owner Dashboard',
    where: '/admin/dashboard',
    steps: ['Log in as admin → live counters: staff, bookings, customers, sales today, products, low stock', 'Recent bookings table underneath'],
    endpoint: 'GET /api/admin/dashboard',
  },
  {
    bullet: 'Manage User Accounts (add / update / deactivate / roles)',
    where: '/admin/users',
    steps: ['Add user → pick role (Customer / Staff / Admin)', 'Edit → change details, reset password, set Active/Inactive (= deactivate), change role', 'Staff edit → tick "Can update stock" to authorize inventory updates', 'Search + role/status filters, 20 per page'],
    endpoint: 'GET/POST /api/admin/users, PUT /api/admin/users/:id',
  },
  {
    bullet: 'Manage Services',
    where: '/admin/inventory → Services',
    steps: ['Add service → name, category, price, duration, photo, active toggle', 'Hide (inactive) instead of deleting to protect history'],
    endpoint: 'GET/POST /api/services, PUT/DELETE /api/services/:id',
  },
  {
    bullet: 'Manage Appointments (view / monitor / assign)',
    where: '/admin/history',
    steps: ['All bookings with search + status/date/assignment/sort filters', 'Rows with no barber show "—" → Assign button → pick an available barber', 'The server re-checks the slot so double-booking is impossible'],
    endpoint: 'GET /api/admin/history, PATCH /api/appointments/:id/assign',
  },
  {
    bullet: 'Manage Sales Records',
    where: '/admin/sales',
    steps: ['Every transaction: date, sale no., items, customer, barber, total', 'Revenue header sums exactly what is listed'],
    endpoint: 'GET /api/sales',
  },
  {
    bullet: 'Manage Products',
    where: '/admin/inventory → Products',
    steps: ['Add product → name, price, low-stock threshold, photo', 'Quantities are read-only here — stock moves only through the Stock tab (audit trail)'],
    endpoint: 'GET/POST /api/products, PUT/DELETE /api/products/:id',
  },
  {
    bullet: 'Manage Inventory (levels / availability / update)',
    where: '/admin/inventory → Stock',
    steps: ['Levels table: on-hand, threshold, in/low/out status', 'Update → stock-in / sale / usage / adjustment (reason required for corrections)', 'Recent movements ledger below shows who changed what and when'],
    endpoint: 'GET /api/inventory/levels, GET /api/inventory/movements, PATCH /api/inventory/update',
  },
  {
    bullet: 'Manage Customer Records',
    where: '/admin/users (role = Customer) + /admin/history (search)',
    steps: ['Filter users by Customer → full profiles', 'Search any name in Booking History for their appointments'],
    endpoint: 'GET /api/admin/users?role=user',
  },
  {
    bullet: 'Generate Reports (appointment / sales / inventory)',
    where: '/admin/analytics',
    steps: ['Top tabs switch the report kind; date tabs filter Appointments + Sales', 'Tables for top services/staff/products/barbers + stock levels', 'CSV + JSON export buttons download the exact rows on screen'],
    endpoint: 'GET /api/analytics/report?kind=&format=',
  },
  {
    bullet: 'Log Out',
    where: 'Top bar → account menu',
    steps: ['Click your name → Log out'],
    endpoint: 'POST /api/auth/logout',
  },
];

export const DEMO_ACCOUNTS = [
  { role: 'Owner', email: 'admin@azcuts.com', password: 'admin (change in prod)', lands: '/admin/dashboard' },
  { role: 'Stylist', email: 'cristiano@azcuts.com', password: 'Staff@123', lands: '/staff/dashboard' },
  { role: 'Barber', email: 'joshua@azcuts.com', password: 'Staff@123', lands: '/staff/dashboard' },
  { role: 'Hairstylist', email: 'zayn@azcuts.com', password: 'Staff@123', lands: '/staff/dashboard' },
  { role: 'Customer', email: '— (register on the landing page)', password: 'min. 6 characters', lands: '/app/book' },
];
