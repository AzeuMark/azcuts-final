// Diagrams drawn from THIS build (school mode: service-only booking, manual
// assign, sales + inventory live, extras/ratings/AI/chat hidden).

export const HIPO_CHART = `flowchart TD
  SYS["AzCuts Barbershop System"]
  SYS --> CUST["1. Customer Portal"]
  SYS --> BARB["2. Barber Portal"]
  SYS --> OWN["3. Owner Portal"]

  CUST --> C1["1.1 Account\\nregister · login · logout"]
  CUST --> C2["1.2 Services\\nview · select"]
  CUST --> C3["1.3 Booking\\ndate/time slots · book · receipt"]
  CUST --> C4["1.4 My bookings\\ninfo · status · history · cancel"]

  BARB --> B1["2.1 Queue\\nassigned · schedules · details"]
  BARB --> B2["2.2 Confirm & status\\naccept · start · finish"]
  BARB --> B3["2.3 Sales\\nrecord service/product · view mine"]
  BARB --> B4["2.4 Stock\\nlevels · update when authorized"]

  OWN --> O1["3.1 Dashboard\\ncounters · today"]
  OWN --> O2["3.2 Users\\nadd · update · deactivate · roles"]
  OWN --> O3["3.3 Catalog\\nservices · products"]
  OWN --> O4["3.4 Appointments\\nview · monitor · assign barber"]
  OWN --> O5["3.5 Sales & stock\\nreview sales · levels · update"]
  OWN --> O6["3.6 Reports\\nappointment · sales · inventory + CSV/JSON"]`;

export const ERD_CHART = `erDiagram
  users ||--o{ appointments : "books (customer)"
  users ||--o{ appointments : "serves (assignedStaff)"
  services ||--o{ appointments : "booked as"
  appointments ||--o| sales : "auto-creates on done"
  users ||--o{ sales : "records (recordedBy)"
  users ||--o{ sales : "performs (barber)"
  users ||--o{ sales : "buys (customer)"
  products ||--o{ inventory : "tracked by"
  products ||--o{ sales : "sold in (snapshot)"
  services ||--o{ sales : "sold in (snapshot)"
  sales ||--o{ inventory : "decrements (referenceSale)"
  users ||--o{ inventory : "moves stock (byUser)"
  users ||--o{ refreshtokens : "sessions"

  users {
    ObjectId _id PK
    string fullName
    string username UK
    string email UK
    string role "user|staff|admin"
    string status "active|inactive|in_service"
    boolean canUpdateStock
  }
  services {
    ObjectId _id PK
    string name
    string category
    number price
    number durationMinutes
    boolean isActive
  }
  appointments {
    ObjectId _id PK
    string receiptNo UK
    ObjectId customer FK
    ObjectId assignedStaff FK "nullable"
    ObjectId service FK
    string status
    ObjectId saleId FK "nullable"
  }
  sales {
    ObjectId _id PK
    string saleNo UK
    ObjectId customer FK "nullable"
    ObjectId barber FK "nullable"
    ObjectId recordedBy FK
    ObjectId appointment FK "nullable"
    number total
  }
  products {
    ObjectId _id PK
    string name
    number price
    number stockQuantity
    number lowStockThreshold
    boolean isActive
  }
  inventory {
    ObjectId _id PK
    ObjectId product FK
    number change
    string type "in|sale|usage|adjust"
    ObjectId referenceSale FK "nullable"
  }
  settings {
    string _id PK "system"
    string systemMode
    string timezone
    object storeHours
  }
  refreshtokens {
    string token UK "hashed"
    ObjectId user FK
  }`;

// IPO tables live in HipoIpo.jsx (clearer as tables than as a diagram).
export const IPO_ROWS = [
  {
    process: 'P1 · Book appointment',
    input: 'serviceId, date, optional staffId, Cash',
    proc: 'Validate future + open hours → check staff free (or leave unassigned) → freeze price snapshot + receipt no.',
    output: 'Pending appointment (+ receipt). Unassigned ones wait for owner assign.',
  },
  {
    process: 'P2 · Assign barber (owner)',
    input: 'appointmentId (pending) + staffId',
    proc: 'Verify staff on-shift + free for the block (overlap test) → set assignedStaff + assignedBy + history note.',
    output: 'Routed pending booking; barber sees it in Incoming.',
  },
  {
    process: 'P3 · Serve (barber)',
    input: 'Accept → Start → Finish taps',
    proc: 'State machine pending→accepted→in_service→done; done bumps totalServed and auto-creates the service sale.',
    output: 'Done appointment + Sale row linked by saleId.',
  },
  {
    process: 'P4 · Record counter sale (barber)',
    input: 'items [{ kind: service|product, refId, qty }]',
    proc: 'Live price lookup → saleNo → create sale → atomic stock decrement per product line (rollback sale on race loss).',
    output: 'Sale (SL-…) + inventory sale movements.',
  },
  {
    process: 'P5 · Update stock',
    input: 'productId + change + type (in|sale|usage|adjust) + reason?',
    proc: 'Direction rules per type → atomic guarded $inc (no oversell) → ledger row with actor.',
    output: 'New level + movement entry (admin: all; barber: needs grant).',
  },
  {
    process: 'P6 · Reports (owner)',
    input: 'kind (appointments|sales|inventory) + range + format (screen|CSV|JSON)',
    proc: 'Appointments/sales aggregate by range; inventory reads live levels + ledger.',
    output: 'KPI tables on screen or a downloaded file of the same rows.',
  },
];
