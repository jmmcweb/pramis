# CLAUDE.md

This file provides Claude Code with project context. For the full technical reference, read `AGENTS.md` before making changes.

## Commands

```bash
npm run dev          # dev server (Turbopack)
npm run build        # production build
npm run lint         # ESLint
npm run test         # Jest

# Database (Prisma 7 + Neon)
npm run db:generate  # regenerate Prisma client
npm run db:migrate   # create + apply migration (--name <name>)
npm run db:push      # push schema without migration (dev only)
npm run db:reset     # drop + recreate + seed
npm run db:seed      # seed default admin
npm run db:studio    # Prisma Studio
npm run db:deploy    # apply pending migrations (prod)
```

> **See `AGENTS.md`** for: auth flow, caching strategy, server action patterns, soft-delete conventions, exact import paths, and all key gotchas.
