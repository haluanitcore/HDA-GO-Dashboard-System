# src/app — Next.js App Router

## OVERVIEW
Two route groups: **`(auth)`** (public) and **`(dashboard)`** (role-gated). Parentheses are stripped from URL — `(dashboard)/cm/pipeline` → `/cm/pipeline`. **No `app/layout.tsx` is locally present** — the global root layout lives on `origin/main` (sparse-excluded).

## ROUTE MAP
```
/login                       → (auth)/login/page.tsx
/admin                       → (dashboard)/admin/page.tsx           (role: ADMIN)
/brand, /brand/campaigns, /brand/analytics
                             → (dashboard)/brand/**                  (role: BRAND)
/cm, /cm/pipeline, /cm/campaigns, /cm/monitoring
                             → (dashboard)/cm/**                     (role: CM)
/creator/overview, /creator/campaign, /creator/analytics, /creator/rewards
                             → (dashboard)/creator/**                (role: CREATOR)
/executive, /executive/kpi   → (dashboard)/executive/**              (role: EXECUTIVE)
```

Sidebar menus reference some routes that DO NOT exist locally (`/admin/users`, `/cm/qc`, `/creator/submissions`, `/settings`, `/register`) — those pages are on `origin/main` or are deliberate TODOs. Cross-check [Sidebar.tsx](file:///D:/Dashboard%20HDA%20GO/Dashboard%20HDA%20GO/hda-go-frontend/src/components/shared/Sidebar.tsx) menu items before assuming a 404 is a bug.

## LAYOUT = AUTH GUARD (pattern used by ALL dashboard role folders)
Every `(dashboard)/<role>/layout.tsx` does **the same thing**:
1. Reads `useAuthStore()` → `{ user, isAuthenticated }`
2. `useEffect`: if `!isAuthenticated` → `router.push('/login')`; else if `user.role !== '<ROLE>'` → `router.push('/' + user.role.toLowerCase())`
3. While gating: renders centered `Loader2` spinner on `bg-[#0a0a0a]`
4. On pass: renders `<Sidebar /> <Navbar /> {children}` inside `glass-bg`

Reference: [cm/layout.tsx](file:///D:/Dashboard%20HDA%20GO/Dashboard%20HDA%20GO/hda-go-frontend/src/app/(dashboard)/cm/layout.tsx). Copy this verbatim for any new role folder, only changing the role string.

## PAGE PATTERN
1. `'use client'` first line, ALWAYS.
2. `useEffect(() => { fetchX() }, [fetchX])` to trigger Zustand fetch on mount.
3. Loading guard: `if (isLoading || !data) return <SkeletonPulse />;`
4. Destructure store data, render. Heavy use of `glass-card`, `glass-panel` classes (defined in [globals.css](file:///D:/Dashboard%20HDA%20GO/Dashboard%20HDA%20GO/hda-go-frontend/src/app/globals.css#L132-L241)).
5. Tables follow a uniform header style: `text-xs font-bold text-gray-500 uppercase tracking-widest`. Match this exactly.

## CONVENTIONS
- **Status badge colors**: `ACTIVE → emerald`, `NEAR_LEVEL_UP → blue`, `DORMANT → red`, `LOW_ACTIVITY → amber`. Replicate the ternary in [cm/page.tsx#L141-L144](file:///D:/Dashboard%20HDA%20GO/Dashboard%20HDA%20GO/hda-go-frontend/src/app/(dashboard)/cm/page.tsx#L141-L144) when adding new tables.
- **Status display**: `status.replace(/_/g, ' ')` before render — backend sends `NEAR_LEVEL_UP`, UI shows `NEAR LEVEL UP`.
- **Currency**: `Rp ${value.toLocaleString()}` — never `$`, never `,` manually.
- **Filter pills**: `text-[10px] font-black px-3 py-1.5 rounded-full border` with active state swapping to `bg-white text-black border-white`. Match exactly when adding filters.

## ANTI-PATTERNS
- **DO NOT remove `'use client'`** — every page reads Zustand.
- **DO NOT add a `app/layout.tsx`** locally — it exists on remote; a stub here will conflict.
- **DO NOT redirect with full URLs** — use `router.push('/cm')`, not `window.location.href`.
- **DO NOT compare role with `toLowerCase()`** — backend sends uppercase (`'CM'`, `'ADMIN'`); compare uppercase: `user.role === 'CM'`. The only lowercase use is for URL routing inside redirects.
- **DO NOT replace inline `alert(...)`** placeholder UX without a modal-system PR (see parent AGENTS.md).

## NOTES
- **Untracked routes** (`git status`): `(dashboard)/brand/analytics/`, `(dashboard)/brand/campaigns/`, `(dashboard)/cm/campaigns/`, `(dashboard)/executive/kpi/`. These are new pages, ready to commit when paired with their feature work.
- **Login page hard-codes test creds** at [login/page.tsx#L13-L14](file:///D:/Dashboard%20HDA%20GO/Dashboard%20HDA%20GO/hda-go-frontend/src/app/(auth)/login/page.tsx#L13-L14) — useful for dev, MUST be cleared before any prod build.
