# AGENTS.md

Read this before making any changes. This is the canonical reference for AI agents working on this codebase. It is self-contained — do not assume knowledge from README.md.

---

## TL;DR — Don't Miss These

- **Soft-delete is mandatory.** Every `User` query needs `where: { deletedAt: null }`.
- **next-auth v4 only.** Do NOT use v5/Auth.js APIs.
- **No middleware.ts.** Each dashboard page calls `getServerSession()` itself.
- **Prisma 7 with Neon adapter.** Always use the singleton at `@/lib/prisma.ts`.
- **Two caching mechanisms** — do not confuse them:
  - `'use cache'` (persistent, tag-based) for list/detail reads
  - `react cache()` (per-request dedup) for `getMe()`
- **`@/` maps to repo root**, not `src/`.
- **Tailwind 4 has no config file.** Classes resolved via PostCSS.
- **Session update needs `update()` call on client** after `updateMe` mutation.
- **Password hashing:** 12 rounds in all server actions, 10 rounds in seed.
- **TypeScript strict mode is OFF** — do not add `!` assertions or defensive types.

---

## Project Identity

**meditrack** — Next.js 16 full-stack CRUD boilerplate.
Deployed to Vercel. Data on Neon PostgreSQL. Media on Vercel Blob.

Features: JWT auth (Credentials), role-based user management, soft-delete, file uploads, email (password reset), paginated data tables, responsive layout with sidebar/drawer.

---

## Tech Stack (exact versions)

| Layer | Package | Version |
|---|---|---|
| Framework | `next` | 16.2.4 |
| React | `react` / `react-dom` | 19.2.x |
| Auth | `next-auth` | 4.24.x |
| ORM | `prisma` / `@prisma/client` | 7.x |
| DB driver | `@neondatabase/serverless` | 1.x |
| Prisma adapter | `@prisma/adapter-neon` | 7.x |
| File storage | `@vercel/blob` | 2.x |
| State | `zustand` | 5.x |
| Email | `nodemailer` | 7.x |
| Toasts | `sonner` | 2.x |
| Icons | `lucide-react` | 1.x |
| CSS | `tailwindcss` | 4.x (PostCSS, no config file) |
| TypeScript | `typescript` | 6.x |

**TypeScript strict mode is OFF** — `"strict": false` in tsconfig.

---

## Repository Layout

```
app/
  api/auth/[...nextauth]/route.ts   # NextAuth handler (GET + POST)
  dashboard/                         # Protected — requires session
    layout.tsx                       # Uses Dashboard template
    page.tsx                         # Dashboard home
    users/page.tsx                   # Paginated user management
    user/
      profile/page.tsx               # Edit own profile
      security/page.tsx              # Change own password
  login/                             # Public auth pages
  signup/
  forgot-password/
  reset-password/
  layout.tsx                         # Root layout (fonts, Sonner, Providers, HydrationZustand)
  providers.tsx                      # <SessionProvider>

components/
  forms/                             # Login, Signup, Profile, Security forms
  globals/                           # Header, Footer, Aside, Drawer
  users/UsersTable.tsx               # Paginated user table
  ButtonsAuth.tsx
  Icons.tsx
  ui/ButtonDrawer.tsx

config/
  constants.ts                       # APP_NAME, APP_BASE_URL, SMTP constants, USERS_PER_PAGE

lib/
  authOptions.ts                     # NextAuth config (Credentials, JWT, callbacks)
  prisma.ts                          # Prisma singleton with Neon adapter
  helper.tsx                         # isValidEmail()
  actions/
    user.ts                          # Admin user CRUD
    me.ts                            # Current user operations
    media.ts                         # Vercel Blob upload/delete
    util.ts                          # Password reset + email

prisma/
  schema.prisma                      # DB schema
  seed.ts                            # Seeds default admin
  migrations/

store/
  useAside.ts                        # Sidebar minimized (Zustand)
  useDrawer.ts                       # Mobile drawer open (Zustand)

templates/
  Default.tsx                        # Public: Header + main + Footer
  Dashboard.tsx                      # Protected: Aside + HeaderDashboard + main + Footer
  Blank.tsx                          # Auth pages: main only
  hydrationZustand.tsx               # SSR fix for Zustand

types/                               # Shared TypeScript types
```

---

## Database Schema

### User

```prisma
model User {
  id          Int       @id @default(autoincrement())
  name        String?
  email       String    @unique
  image       String?
  role        Role      @default(USER)
  password    String?
  activatedAt DateTime?
  loggedInAt  DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?

  @@index([email, deletedAt])
}

enum Role {
  SUPERADMIN
  ADMIN
  USER
}
```

### ResetPasswordToken

```prisma
model ResetPasswordToken {
  id         Int      @id @default(autoincrement())
  email      String
  token      String   @unique
  expires    DateTime
  created_at DateTime @default(now())

  @@unique([email, token])
}
```

### Critical conventions

- **Always** query with `where: { deletedAt: null }` unless intentionally querying deleted users.
- Role hierarchy: `SUPERADMIN` > `ADMIN` > `USER`.
- Passwords: `bcrypt`, 12 rounds in server actions, 10 rounds in seed.

---

## Authentication

**Library:** NextAuth.js v4 (NOT v5 / Auth.js — APIs differ).
**Strategy:** Credentials provider, JWT sessions (no DB session table).
**Session max age:** 1 day.
**Sign-in page:** `/login`.

### Auth data flow (exact)

1. `FormLogin` calls `signIn('credentials', { email, password, redirect: false })`
2. NextAuth calls `authorize(credentials, req)` in `lib/authOptions.ts`:
   - `prisma.user.findFirst({ where: { email, deletedAt: null } })`
   - `bcrypt.compare(password, user.password)`
   - On success: `prisma.user.update({ where: { id }, data: { loggedInAt: new Date() } })`
   - Returns `{ id: user.id, name: user.name, email: user.email }` or `null`
3. `jwt` callback (`token.user = { id, name, email, image, role }`) — fetches full user from DB
4. `session` callback maps `token` fields to `session.user`
5. Client: `useSession()` — requires `<SessionProvider>` from `app/providers.tsx`
6. Server: `getServerSession(authOptions)` — redirect on failure

### Session update flow

When user updates their own profile (`updateMe` in `lib/actions/me.ts`), the client form calls `update()` from `next-auth/react`. The `jwt` callback checks `trigger === 'update'` and overwrites the token with `session.user` values.

### Server-side session access

```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'

const session = await getServerSession(authOptions)
if (!session?.user?.id) redirect('/login')
```

### Client-side session access

```typescript
'use client'
import { useSession } from 'next-auth/react'

const { data: session, update } = useSession()
```

---

## Server Actions

All actions: `'use server'`, in `lib/actions/`.

### Response shape

```typescript
{ success: boolean; message: string; payload?: any }
```

Form-bound actions accept `(_prevState: any, formData: FormData)`.

### user.ts — Admin CRUD

| Function | Signature | Cache |
|---|---|---|
| `getUser(id)` | `async (id: number) => User \| null` | `'use cache'`, tag `user-${id}` |
| `getUsers(page?, perPage?)` | `async (page?, perPage?) => { users, totalPages, ... }` | `'use cache'`, tag `users` |
| `createUser(_prev, formData)` | mutation | revalidates tag `users` |
| `softDeleteUser(id)` | `async (id: number)` | revalidates tag `users` |
| `updateUser(_prev, formData)` | mutation | revalidates tag `users` |

All queries filter `deletedAt: null`. `getUser` throws `NotFoundError` if no match.

### me.ts — Current user

| Function | Purpose | Cache |
|---|---|---|
| `getMe()` | Fetch authenticated user | `react cache()` (per-request dedup) |
| `updateMe(_prev, formData)` | Update name/email/image | mutation (client calls `update()`) |
| `updateMePassword(_prev, formData)` | Verify current password, set new hash | mutation |

`getMe()` uses `react cache()` — NOT `'use cache'`. It is deduplicated per HTTP request only.

```typescript
import { cache } from 'react'

export const getMe = cache(async () => {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  return prisma.user.findFirst({ where: { id: session.user.id, deletedAt: null } })
})
```

### media.ts — File storage

| Function | Purpose |
|---|---|
| `uploadMedia(userId: number, imageFile: File)` | Uploads to Blob at `user/{userId}/{random}-{filename}`, returns URL |
| `deleteMedia(_prev, formData)` | Deletes blob URL from formData |

Blob domain allowlisted in `next.config.ts`: `tosysoik0rjt4ojn.public.blob.vercel-storage.com`

### util.ts — Auth utilities

| Function | Purpose |
|---|---|
| `forgotPassword(_prev, formData)` | Creates `ResetPasswordToken`, sends email via Nodemailer/Brevo |
| `resetPassword(_prev, formData)` | Validates token, hashes new password (12 rounds), deletes used token |

---

## Caching Strategy

**Project config:** `cacheComponents: true` in `next.config.ts`.

### `'use cache'` — persistent, tag-based

For read queries that return list/detail data:

```typescript
'use server'
import { unstable_cacheTag as cacheTag, unstable_cacheLife as cacheLife } from 'next/cache'

export async function getUsers(page = 1, perPage = USERS_PER_PAGE) {
  'use cache'
  cacheTag('users')
  cacheLife('max')
  // ... prisma query
}
```

Invalidate after mutations:

```typescript
import { revalidateTag } from 'next/cache'
revalidateTag('users')
revalidateTag(`user-${id}`)
```

### `react cache()` — per-request dedup

For `getMe()` only. Lives for one HTTP request. Not shared across requests.

```typescript
import { cache } from 'react'
export const getMe = cache(async () => { ... })
```

**Do NOT mix up these two mechanisms.**

---

## State Management (Zustand)

Client-only UI state. Never stores server data.

| Store | State | Used by |
|---|---|---|
| `useAside` | `minimized: boolean` + `toggleMinimized()` | Sidebar collapse |
| `useDrawer` | `isOpen: boolean` + `open()` + `close()` | Mobile drawer |

Wrap components reading Zustand state in `<HydrationZustand>` (from `templates/hydrationZustand.tsx`) to prevent SSR mismatch. Dashboard layout handles this at the template level.

---

## Routing & Templates

| Route | Protection | Template | Notes |
|---|---|---|---|
| `/` | Public | `Default` | |
| `/login`, `/signup`, `/forgot-password`, `/reset-password` | Public (redirect if authed) | `Blank` | |
| `/dashboard/*` | Auth required | `Dashboard` | Each page checks `getServerSession()` |

**No middleware.ts exists.** Do not create one. Route protection is per-page.

### Pattern: adding a new protected page

```typescript
// app/dashboard/something/page.tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { redirect } from 'next/navigation'

export default async function SomethingPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  // fetch data, render
}
```

### Pattern: adding a new server action

```typescript
'use server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'

export async function myAction(_prevState: any, formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { success: false, message: 'Unauthorized' }

  // ... logic

  return { success: true, message: 'Done' }
}
```

### Pattern: form with server action (client)

```typescript
'use client'
import { useActionState } from 'react'
import { myAction } from '@/lib/actions/something'

const [state, formAction, isPending] = useActionState(myAction, null)
```

### Pattern: querying active users

```typescript
await prisma.user.findMany({
  where: { deletedAt: null },
})
```

---

## Environment Variables

All from `.env.local` (pulled via `vercel env pull .env.local`).

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Pooled Neon — Prisma runtime |
| `DATABASE_URL_UNPOOLED` | Direct Neon — Prisma CLI migrations |
| `NEXTAUTH_SECRET` | JWT signing key |
| `NEXTAUTH_URL` | Base URL for auth callbacks |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob API token |
| `SMTP_HOST` | Brevo SMTP host |
| `SMTP_KEY` | Brevo SMTP API key |

Derived constants in `config/constants.ts`: `APP_NAME`, `APP_BASE_URL`, `SMTP_FROM_NAME`, `SMTP_FROM_EMAIL`, `USERS_PER_PAGE`.

---

## Seed Defaults

```
email:    admin@domain.com
password: defaultpass
role:     SUPERADMIN
```

Run `npm run db:seed`. The seed script uses `new PrismaClient()` directly (not the singleton from `lib/prisma.ts`) because it runs outside Next.js runtime.

---

## Build & Deployment

- **Build command (Vercel):** `prisma generate && next build`
- **Dev:** `npm run dev` (Turbopack)
- **Server Actions body limit:** 2 MB (`next.config.ts`)
- **Node.js:** 22.14.x required

---

## Key Gotchas

1. **Soft deletes are mandatory.** Every Prisma `User` query needs `where: { deletedAt: null }`. This is the most common mistake.
2. **next-auth v4 only.** Do NOT use v5/Auth.js APIs. `authOptions` is imported from `@/lib/authOptions`, not auto-discovered.
3. **Tailwind 4 has no config file.** No `tailwind.config.js/ts`.
4. **`@/` resolves to repo root.** Imports: `@/lib/...`, `@/components/...`, not `@/src/...`.
5. **Session update requires `update()` call on client** after `updateMe` — JWT is not auto-refreshed.
6. **`react cache()` vs `'use cache'`:** `getMe()` uses `react cache()` (request-level). List/detail queries use `'use cache'` (persistent, tag-based). Do not confuse.
7. **Prisma singleton** at `@/lib/prisma.ts` — never instantiate `PrismaClient` directly in components or actions.
8. **No middleware.ts** — no global route guard. Each dashboard page must call `getServerSession()`.
9. **Password rounds:** 12 in all server actions, 10 in seed.
10. **Server action responses** are plain objects — never throw. Pattern: `{ success, message, payload? }`.
