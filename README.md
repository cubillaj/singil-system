<p align="center">
  <img src="client/src/assets/singil-favicon-green.svg" alt="Singil logo" width="96" height="96" />
</p>

<h1 align="center">Singil</h1>

Singil is a full-stack, multi-tenant invoicing platform for freelancers and small teams. It brings client management, product catalogs, invoices, payments, recurring billing, subscriptions, and team administration into one role-aware workspace.

This project demonstrates more than CRUD: tenant isolation, authorization, background jobs, payment webhooks, subscription entitlements, audit trails, secure sessions, and distributed rate limiting are built into the application architecture.

## Highlights

- **Multi-tenant workspaces** — organization-scoped data and workflows keep each team's clients, invoices, products, and payments isolated.
- **Role-based access control** — system admin, owner, admin, and member roles are enforced in both the React router and Express API.
- **Complete invoicing workflow** — create itemized invoices, track lifecycle states and payments, and export invoices as PDF or structured data.
- **Recurring billing** — BullMQ schedules invoice generation and subscription expiration work with retries and exponential backoff.
- **SaaS subscriptions** — Free, Pro, and Business plans enforce limits for members, clients, products, monthly invoices, recurring invoices, and audit logs.
- **PayMongo integration** — hosted checkout, webhook verification, payment reconciliation, cancellation, and subscription resumption.
- **Security-focused authentication** — Redis-backed sessions, bcrypt password hashing, generic authentication errors, Helmet, input validation, and role-aware endpoints.
- **Layered abuse protection** — failed-login limits by hashed email and IP, progressive delays, `Retry-After` responses, and separate read, write, upload, export, webhook, and sensitive-action limits.
- **Operational visibility** — organization audit logs capture actor, action, entity, request IP, user agent, and metadata.

## Architecture

```mermaid
flowchart LR
    Browser[React + Vite client] -->|JSON / session cookie| API[Express + TypeScript API]
    API --> Postgres[(PostgreSQL / Neon)]
    API --> Redis[(Redis)]
    API --> PayMongo[PayMongo API]
    PayMongo -->|signed webhook| API
    API --> Cloudinary[Cloudinary]
    API --> Queue[BullMQ queues]
    Queue --> Worker[Recurring invoice worker]
    Worker --> Postgres
```

The API follows a route → middleware → controller → service structure. Drizzle ORM owns the relational schema and migration history, while Redis supports sessions, distributed rate limits, and BullMQ jobs.

## Core Features

### Invoicing and finance

- Client and product management
- Itemized invoices with tax, discounts, notes, due dates, and multiple currencies
- Draft, sent, viewed, paid, overdue, and cancelled invoice states
- Payment recording and invoice balance tracking
- PDF and data export
- Weekly, monthly, quarterly, and yearly recurring invoice templates
- Role-specific dashboard summaries

### Teams and subscriptions

- Organization creation and invitation-based onboarding
- Owner, admin, member, and system-administrator permissions
- Member and organization profile management
- Plan entitlements enforced server-side
- Paid-plan checkout and webhook-driven subscription updates
- End-of-period cancellation and resumption
- Owner-only audit history

### Security and reliability

- Server-side session authentication stored in Redis
- Session regeneration on login and secure production cookies
- bcrypt password hashing and Zod request validation
- Per-user API limits with IP fallback for unauthenticated traffic
- Login protection: 10 failed attempts per hashed email and 100 per IP every 15 minutes
- Progressive login delay after repeated failures
- Generic rate-limit responses with accurate `Retry-After` headers
- Transactional database operations for sensitive multi-step workflows
- Background-job retries with exponential backoff

## Technology Stack

| Area | Technologies |
| --- | --- |
| Frontend | React 19, React Router, Vite, Tailwind CSS, Lucide React |
| Backend | Node.js, Express 5, TypeScript, Zod |
| Data | PostgreSQL, Neon, Drizzle ORM |
| Sessions and jobs | Redis, connect-redis, BullMQ |
| Integrations | PayMongo, Cloudinary, PDFKit |
| Security and observability | bcrypt, Helmet, rate-limiter-flexible, Morgan, audit logging |

## Repository Structure

```text
singil-system/
├── client/                    # React single-page application
│   └── src/
│       ├── components/        # Shared UI primitives
│       ├── hooks/             # Authentication and reusable state
│       ├── layouts/           # Authenticated dashboard shell
│       ├── pages/             # Product-facing screens
│       └── services/          # API client
├── server/
│   ├── drizzle/               # Versioned SQL migrations
│   ├── scripts/               # Administrative utilities
│   ├── server.ts              # API composition and startup
│   └── src/
│       ├── controller/        # HTTP request handling
│       ├── db/                # Drizzle schema and database client
│       ├── middleware/        # Auth, rate limits, uploads, audit logs
│       ├── queues/            # BullMQ queue definitions and schedules
│       ├── routes/            # API endpoints and authorization rules
│       ├── services/          # Domain and integration logic
│       ├── validation/        # Zod schemas
│       └── workers/           # Background processors
└── README.md
```

## Local Development

### Prerequisites

- Node.js 22.12 or newer
- PostgreSQL database (the project is configured for Neon)
- Redis
- PayMongo and Cloudinary credentials for their respective features

### 1. Clone and install

```bash
git clone https://github.com/cubillaj/singil-system.git
cd singil-system

cd client
npm install

cd ../server
npm install
```

### 2. Configure the environment

Create `client/.env`:

```env
VITE_API_URL=http://localhost:5000
```

Create `server/.env`:

```env
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173

DATABASE_URL=postgresql://user:password@host/database?sslmode=require
REDIS_URL=redis://localhost:6379
SESSION_SECRET=replace-with-a-long-random-secret

# Required for organization and profile image uploads
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Required for paid subscription checkout and webhook processing
PAYMONGO_SECRET_KEY=
PAYMONGO_WEBHOOK_SECRET=
```

Do not commit either `.env` file. Use different secrets and service credentials for development and production.

### 3. Apply database migrations

From `server/`:

```bash
npm run db:migrate
```

### 4. Start the application

Run each process in a separate terminal:

```bash
# Terminal 1 — API
cd server
npm run dev

# Terminal 2 — background worker
cd server
npm run worker:recurring

# Terminal 3 — frontend
cd client
npm run dev
```

The client runs at `http://localhost:5173` and the API at `http://localhost:5000` by default.

## Useful Commands

| Location | Command | Purpose |
| --- | --- | --- |
| `client/` | `npm run dev` | Start the Vite development server |
| `client/` | `npm run build` | Create a production frontend build |
| `client/` | `npm run lint` | Run ESLint |
| `server/` | `npm run dev` | Start the API with file watching |
| `server/` | `npm run build` | Compile TypeScript to `dist/` |
| `server/` | `npm run worker:recurring` | Process scheduled background jobs |
| `server/` | `npm run db:generate` | Generate a migration after schema changes |
| `server/` | `npm run db:migrate` | Apply pending migrations |
| `server/` | `npm run db:studio` | Open Drizzle Studio |
| `server/` | `npm run create:system-admin -- --email=admin@example.com --password="..."` | Provision a system administrator |

## Production Notes

- Run the API and recurring worker as separate processes against the same PostgreSQL and Redis services.
- Set `NODE_ENV=production`, a strong `SESSION_SECRET`, and the deployed `CLIENT_URL`.
- The API currently trusts one reverse-proxy hop. Match `trust proxy` to the topology of the deployment before going live.
- Configure PayMongo to send signed events to `POST /api/webhooks/paymongo`.
- Use the server Dockerfile's `production` target when building the API container.

## Engineering Focus

Singil was built to explore the concerns that turn a typical dashboard into a production-oriented SaaS application: tenant boundaries, authorization at multiple layers, transactional workflows, third-party payment state, asynchronous processing, plan enforcement, and abuse resistance.

## License

The server package is currently licensed under ISC. See the repository's package metadata for details.
