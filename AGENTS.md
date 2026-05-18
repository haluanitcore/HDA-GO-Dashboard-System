# HDA GO — Creator Growth OS

**Generated:** 2026-05-13 | **Commit:** `aa264da` | **Branch:** `main`

## OVERVIEW
Two-package monorepo for a TikTok/Shopee Live creator growth platform (Indonesia). Backend: **NestJS + Prisma + SQLite + Socket.io**. Frontend: **Next.js 16 (App Router) + React 19 + Tailwind v4 + Zustand**. Role-based dashboards: `ADMIN`, `CM` (Creator Manager), `CREATOR`, `BRAND`, `EXECUTIVE`.

## ⚠️ SPARSE CHECKOUT (CRITICAL)
This worktree is a **sparse checkout — 21% of tracked files present** (`git status` confirms). Missing locally but EXISTS in `origin/main`:
- `hda-go-backend/`: `package.json`, `tsconfig.json`, `prisma/`, all modules except `cm/cm.service.ts`
- `hda-go-frontend/`: `tsconfig.json`, `next.config.*`, `components/ui/*`, `store/auth.store.ts`, `store/notification.store.ts`, `store/creator.store.ts`, `services/api.ts`
- Code that **imports** missing files (e.g. `cm.service.ts` imports `PrismaService`, pages import `@/components/ui/card`) — **DO NOT "fix" the imports**. The targets exist on the remote.

Before editing anything unfamiliar: run `git ls-tree -r HEAD --name-only | rg <pattern>` to confirm whether the file exists on the remote vs locally.

## STRUCTURE
```
./
├── hda-go-backend/      # NestJS + Prisma + SQLite (mostly sparse)
├── hda-go-frontend/     # Next.js 16 App Router
├── .sisyphus/           # Agent runtime state (DO NOT edit)
└── .gitignore           # NOTE: ignores *.py (scaffold scripts are local-only)
```

## WHERE TO LOOK
| Task | Location |
|------|----------|
| API contracts (frontend ↔ backend) | [services/index.ts](file:///D:/Dashboard%20HDA%20GO/Dashboard%20HDA%20GO/hda-go-frontend/src/services/index.ts) |
| Role routing logic | [Sidebar.tsx](file:///D:/Dashboard%20HDA%20GO/Dashboard%20HDA%20GO/hda-go-frontend/src/components/shared/Sidebar.tsx#L33-L71) |
| Auth guard pattern | Any `(dashboard)/*/layout.tsx` (e.g. [cm/layout.tsx](file:///D:/Dashboard%20HDA%20GO/Dashboard%20HDA%20GO/hda-go-frontend/src/app/(dashboard)/cm/layout.tsx)) |
| Glassmorphism utilities | [globals.css](file:///D:/Dashboard%20HDA%20GO/Dashboard%20HDA%20GO/hda-go-frontend/src/app/globals.css#L132-L241) |
| CM domain logic (only backend file local) | [cm.service.ts](file:///D:/Dashboard%20HDA%20GO/Dashboard%20HDA%20GO/hda-go-backend/src/modules/cm/cm.service.ts) |
| Creator pipeline status rules | [cm.service.ts#L81-L99](file:///D:/Dashboard%20HDA%20GO/Dashboard%20HDA%20GO/hda-go-backend/src/modules/cm/cm.service.ts#L81-L99) |
| Dev DB | `hda-go-backend/dev.db` (SQLite, ~140KB, committed to local only — `.gitignore` excludes `*.db`) |

## DOMAIN VOCABULARY (Indonesian context)
- **GMV** = Gross Merchandise Value, displayed `Rp <amount>` with `toLocaleString()`
- **SOW** = Statement of Work (post count per campaign)
- **CM** = Creator Manager (the human who manages creators)
- **Pipeline statuses**: `ACTIVE | LOW_ACTIVITY | DORMANT | NEAR_LEVEL_UP` (rules in [cm.service.ts#L81-L99](file:///D:/Dashboard%20HDA%20GO/Dashboard%20HDA%20GO/hda-go-backend/src/modules/cm/cm.service.ts#L81-L99))
- **QC** = Quality Check (submission review state `QC_REVIEW`)
- **Notification title format**: `CAMPAIGN_REC::<campaign_id>` — embedded ID, frontend parses ([cm.service.ts#L147](file:///D:/Dashboard%20HDA%20GO/Dashboard%20HDA%20GO/hda-go-backend/src/modules/cm/cm.service.ts#L147))

## CONVENTIONS
- **Backend keys**: `snake_case` in Prisma (`cm_id`, `gmv_monthly`, `progress_percentage`) — preserved as-is in JSON responses.
- **Frontend code**: `camelCase` for TS, `PascalCase` for components/files in `components/`.
- **Frontend pages**: lowercase `page.tsx` (Next.js requirement).
- **Route groups**: `(auth)` and `(dashboard)` — parentheses do NOT appear in URL. Roles routed by **lowercase role name** (`/cm`, `/creator`, `/brand`, `/admin`, `/executive`).
- **Numbers in UI**: always `toLocaleString()` with `Rp` prefix for currency.
- **`any` is rampant** in services + stores. Tightening types is out-of-scope for bug fixes.

## ANTI-PATTERNS (THIS PROJECT)
- **DO NOT delete/recreate** files that look "missing" — they exist on `origin/main` (sparse checkout).
- **DO NOT commit `*.py`** scaffold scripts ([create_routes.py](file:///D:/Dashboard%20HDA%20GO/Dashboard%20HDA%20GO/hda-go-frontend/create_routes.py), [create_ui.py](file:///D:/Dashboard%20HDA%20GO/Dashboard%20HDA%20GO/hda-go-frontend/create_ui.py), [setup_backend.py](file:///D:/Dashboard%20HDA%20GO/Dashboard%20HDA%20GO/hda-go-backend/setup_backend.py)) — `.gitignore` excludes them. They are local-only generators, already-run.
- **DO NOT commit `dev.db`** — also gitignored.
- **DO NOT add a `tests/` dir** without asking — project has zero tests by design (this stage).
- **DO NOT swap `'use client'` away** from dashboard pages — they all rely on Zustand stores which require client.
- **DO NOT change** the role-comparison strings (`'ADMIN'`, `'CM'`, etc.) — they match backend enum casing.

## UNIQUE STYLES — Glassmorphism Design System
Defined in [globals.css#L132-L241](file:///D:/Dashboard%20HDA%20GO/Dashboard%20HDA%20GO/hda-go-frontend/src/app/globals.css#L132-L241). Use these classes for dashboard chrome:
- `glass-bg` — atmospheric `#050508` background with animated radial-gradient orbs
- `glass-panel` / `glass-panel-solid` — translucent containers (the solid variant for modals/login card)
- `glass-card` — interactive cards with hover lift
- `glass-sidebar` / `glass-navbar` — chrome surfaces
- `glow-blue | glow-emerald | glow-amber | glow-purple` — colored box-shadow halos

Tailwind v4 theme variables (oklch palette) live in `:root` and `.dark` blocks. Shadcn registry imported via `@import "shadcn/tailwind.css"`.

## COMMANDS
```bash
# Frontend (cwd: hda-go-frontend/)
npm run dev        # next dev
npm run build      # next build
npm run start      # next start (prod)
npm run lint       # eslint

# Backend (cwd: hda-go-backend/)
# package.json is sparse-excluded locally — pull or check origin/main for actual scripts
```
No CI workflows, no test runner, no Docker config in repo.

## NOTES
- **Git remote drift**: local is **2 commits behind `origin/main`**. Pull before non-trivial work, especially when adding files the remote may already have.
- **Currency / locale**: `id-ID`, IDR (`Rp`). Dates rendered with `toLocaleDateString('id-ID')` ([cm.service.ts#L148](file:///D:/Dashboard%20HDA%20GO/Dashboard%20HDA%20GO/hda-go-backend/src/modules/cm/cm.service.ts#L148)).
- **WebSocket events**: `eventsGateway.emitCampaignPush(creatorId, payload)` — Socket.io, `socket.io-client` on frontend.
- **No barrel from `@/components/ui`** locally — those primitives (Card, Button, Avatar, Progress) live on remote.
- **Login defaults are hard-coded**: `alex@creator.com / password123` ([login/page.tsx#L13-L14](file:///D:/Dashboard%20HDA%20GO/Dashboard%20HDA%20GO/hda-go-frontend/src/app/(auth)/login/page.tsx#L13-L14)). Demo seed data only — do NOT ship this default to production.
