# hda-go-backend (NestJS)

## OVERVIEW
NestJS server. **Locally: 99% sparse-excluded.** Only [cm.service.ts](file:///D:/Dashboard%20HDA%20GO/Dashboard%20HDA%20GO/hda-go-backend/src/modules/cm/cm.service.ts) is present; the rest (`package.json`, `tsconfig.json`, Prisma schema, all other modules) is on `origin/main`.

## SPARSE STATUS — What's missing locally
```
src/
├── config/                         # empty locally
├── modules/
│   ├── cm/cm.service.ts            # ✅ ONLY LOCAL FILE
│   ├── users/                      # empty locally
│   ├── auth/        ← sparse (login, register, JWT issuance)
│   ├── creators/    ← sparse (Creator entity CRUD, /creators/dashboard)
│   ├── campaigns/   ← sparse (/campaigns, /campaigns/hub, /campaigns/join)
│   ├── submissions/ ← sparse (SOW, QC, /submissions/sow/:id, /submissions/qc-queue)
│   ├── notifications/ ← sparse — `events.gateway.ts` imported by cm.service
│   ├── gmv/         ← sparse
│   ├── levels/      ← sparse (level-up progress tracking)
│   ├── leaderboard/ ← sparse
│   ├── rewards/     ← sparse
│   └── analytics/   ← sparse (Executive KPI feed)
└── prisma/prisma.service.ts ← sparse (imported by cm.service)
```

Frontend service contracts in [services/index.ts](file:///D:/Dashboard%20HDA%20GO/Dashboard%20HDA%20GO/hda-go-frontend/src/services/index.ts) drive backend route surface.

## WHERE TO LOOK
| Symbol | File / Line | Notes |
|--------|-------------|-------|
| `classifyCreatorStatus` | [cm.service.ts#L81-L99](file:///D:/Dashboard%20HDA%20GO/Dashboard%20HDA%20GO/hda-go-backend/src/modules/cm/cm.service.ts#L81-L99) | Pipeline thresholds: `gmv_monthly < 500_000` OR `streak_days < 3` → `LOW_ACTIVITY`; `progress >= 80%` → `NEAR_LEVEL_UP` |
| `pushCampaignRecommendation` | [cm.service.ts#L134-L166](file:///D:/Dashboard%20HDA%20GO/Dashboard%20HDA%20GO/hda-go-backend/src/modules/cm/cm.service.ts#L134-L166) | DB write + Socket.io emit. Indonesian-language `message` field. |
| `generateSmartRecommendations` | [cm.service.ts#L171-L202](file:///D:/Dashboard%20HDA%20GO/Dashboard%20HDA%20GO/hda-go-backend/src/modules/cm/cm.service.ts#L171-L202) | Eligibility: `c.min_level <= creator.level && (c.slot === 0 || count < c.slot)` |

## CONVENTIONS (Prisma-driven)
- All DB columns are `snake_case`. Service methods return objects mixing both: `gmvMonthly` (camelCase remap) AND raw `creator.user_id` passthrough. Keep this dual style — frontend depends on it.
- `slot === 0` means **unlimited** ([cm.service.ts#L184](file:///D:/Dashboard%20HDA%20GO/Dashboard%20HDA%20GO/hda-go-backend/src/modules/cm/cm.service.ts#L184)) — not "no slots".
- DB enum values: `'QC_REVIEW'`, `'ACTIVE'`, `'PUSH'` — exact-case strings.

## ANTI-PATTERNS
- **NEVER stub `PrismaService` / `EventsGateway`** to "fix" the missing-import error — they exist on remote. Pull or sparse-checkout.
- **NEVER rename** `cm_id`, `user_id`, `gmv_monthly`, etc. — they map to Prisma schema columns NOT visible locally.
- **NEVER edit `setup_backend.py`** — already-run scaffolder, `*.py` gitignored.
- **NEVER strip the Indonesian `message` strings** in [cm.service.ts#L148](file:///D:/Dashboard%20HDA%20GO/Dashboard%20HDA%20GO/hda-go-backend/src/modules/cm/cm.service.ts#L148) — they are user-facing copy in Bahasa Indonesia.

## NOTES
- `.env` has `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `PORT`. UTF-8 BOM corrupted (line headers garbled).
- `dev.db` (~140KB) is a populated SQLite dev fixture — do NOT regenerate without backing up.
- `node_modules` IS present locally (~1.3GB), so dependencies are installed — but `package.json` itself is sparse-excluded. `npm run` commands won't work until you pull or hand-write the script set.
