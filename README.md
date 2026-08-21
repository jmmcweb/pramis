# MediTrack

A production-ready **Next.js 16** full-stack CRUD boilerplate. Built for teams who need a solid foundation with authentication, user management, file uploads, and email — all deployed on Vercel with Neon PostgreSQL and Vercel Blob.

---

## Features

- **Authentication** — Email/password login via NextAuth.js v4 (Credentials provider, JWT sessions)
- **User management** — Role-based access control (`SUPERADMIN`, `ADMIN`, `USER`), soft-delete, paginated user table
- **Profile management** — Users update their own name, email, avatar image, and password
- **File uploads** — Avatar images stored on Vercel Blob
- **Email** — Password reset via Nodemailer + Brevo SMTP
- **Data tables** — Paginated, server-side sorted user list
- **UI** — Tailwind CSS 4, Lucide icons, Sonner toasts, responsive layouts (desktop + mobile)

---

## Tech Stack

| Layer | Package |
|---|---|
| Framework | Next.js 16 (App Router) |
| Auth | NextAuth.js v4 |
| Database | Neon PostgreSQL via Prisma 7 |
| File storage | Vercel Blob |
| Email | Nodemailer + Brevo SMTP |
| State (client) | Zustand 5 |
| Toasts | Sonner |
| Icons | Lucide React |
| CSS | Tailwind CSS 4 (PostCSS, no config file) |
| Language | TypeScript (strict mode OFF) |

*Exact versions are documented in `AGENTS.md` for CI/CD reproducibility.*

---

## Terminology & Conventions

### Role hierarchy

```
SUPERADMIN  →  ADMIN  →  USER
```

- `SUPERADMIN` has full access (can manage all users, including admins).
- `ADMIN` can manage regular users.
- `USER` has no admin access — profile and security only.

### Soft delete

Users are never hard-deleted. When deleted, their `deletedAt` field is set to the current timestamp. Every query for active users must filter `deletedAt: null`. This is the single most important convention in the codebase.

### Template system

Pages use layouts defined in `templates/`:

| Template | Layout | Used for |
|---|---|---|
| `Default` | Header + main + Footer | Public pages (home, etc.) |
| `Blank` | Main only | Auth pages (login, signup, password reset) |
| `Dashboard` | Aside + HeaderDashboard + main + Footer | All `/dashboard/*` routes |

Route protection is done per-page using `getServerSession()` — there is no middleware.

### Authentication model

JWT sessions (no database session table). Session max age is 1 day. The session user object contains `id`, `name`, `email`, `role`, and `image`. The JWT is refreshed when the user updates their profile (you must call `update()` on the client after mutation).

### Caching (two distinct mechanisms)

1. **`'use cache'`** — Persistent, tag-based caching for read queries (list and detail). Tags like `users` and `user-{id}` are invalidated after mutations.
2. **`react cache()`** — Per-request deduplication only (used by `getMe()`). Lives for one HTTP request, not shared across requests.

Do not mix the two up. See `AGENTS.md` for exact code patterns.

### Zustand — client UI state only

Zustand stores hold purely presentational state (sidebar minimized, mobile drawer open). They **never** store server data. A `<HydrationZustand>` wrapper prevents SSR hydration mismatches.

---

## Architecture Overview

### Auth flow

```
Browser                  Next.js Server                 Neon DB
   │                         │                            │
   │── POST /login ──────────┤                            │
   │    { email, password }  │                            │
   │                         │── findUnique(email) ───────┤
   │                         │◄── { id, name, role, … } ──┤
   │                         │                            │
   │                         │── bcrypt.compare(password)  │
   │                         │── update loggedInAt ───────┤
   │                         │                            │
   │                         │── Sign JWT (id, name,      │
   │                         │    email, image, role)      │
   │◄── Set httpOnly cookie ──┤                            │
```

### Data flow (server actions)

All mutations go through server actions in `lib/actions/`. They follow this pattern:

1. Client form calls server action via `useActionState`
2. Server action validates session (`getServerSession`)
3. Mutates database via Prisma
4. Revalidates cache tags if needed
5. Returns `{ success: boolean, message: string, payload?: any }`

Read queries use `'use cache'` with tags for automatic deduplication and manual invalidation. `getMe()` uses `react cache()` for per-request dedup only.

### Directory layout

```
app/                        # Next.js App Router
  api/auth/[...nextauth]/   # NextAuth API handler
  dashboard/                # Protected pages (users, profile, security)
  login/                    # Public auth pages
  signup/
  forgot-password/
  reset-password/

components/
  forms/                    # Login, Signup, Profile, Security forms
  globals/                  # Header, Footer, Aside, Drawer
  users/UsersTable.tsx      # Paginated user list

config/constants.ts         # APP_NAME, APP_BASE_URL, SMTP constants, USERS_PER_PAGE

lib/
  authOptions.ts            # NextAuth config
  prisma.ts                 # Prisma singleton (Neon adapter)
  actions/                  # Server actions (user.ts, me.ts, media.ts, util.ts)

prisma/
  schema.prisma             # Database schema
  seed.ts                   # Seeds default admin user
  migrations/               # Migration history

store/                      # Zustand stores (useAside, useDrawer)

templates/                  # Layout templates (Default, Dashboard, Blank)

types/                      # Shared TypeScript types
```

---

## Setup

### Prerequisites

- **Node.js v22.14.x** (use `nvm`)
- **Vercel CLI** (`npm i -g vercel`)
- **Vercel account** (hobby tier is fine)

### Installation

```bash
git clone https://github.com/reginpv/next-crud-boilerplate.git .
npm install
vercel env pull .env.local
npm run db:push            # Push schema to Neon
npm run db:seed            # Create default admin account
npm run dev                # Start dev server on :3000
```

### Default admin credentials

```
email:    admin@domain.com
password: defaultpass
role:     SUPERADMIN
```

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Jest tests |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:migrate` | Create + apply migration (add `--name <name>`) |
| `npm run db:push` | Push schema without migration (dev only) |
| `npm run db:reset` | Drop DB, re-run migrations + seed |
| `npm run db:seed` | Seed default admin user |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:deploy` | Apply pending migrations (production) |

---

## Environment Variables

All loaded from `.env.local` (pulled via `vercel env pull`):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Pooled Neon connection (runtime) |
| `DATABASE_URL_UNPOOLED` | Direct Neon connection (migrations) |
| `NEXTAUTH_SECRET` | JWT signing key |
| `NEXTAUTH_URL` | Base URL for auth callbacks |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob API token |
| `SMTP_HOST` | Brevo SMTP host |
| `SMTP_KEY` | Brevo SMTP API key |

---

## Deployment (Vercel)

1. Connect the repo to Vercel
2. Set **build command** to: `prisma generate && next build`
3. Add all environment variables in Vercel dashboard
4. Deploy

The Vercel Blob storage domain is allowlisted in `next.config.ts` for use with `<Image>`.

---

## For AI Agents

If you're an AI agent working on this codebase, read `AGENTS.md` for the full technical reference — exact import paths, caching gotchas, auth callback internals, and code conventions that are critical for correct code generation.
