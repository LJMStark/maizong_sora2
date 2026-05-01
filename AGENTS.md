# AGENTS.md

This file provides guidance to Antigravity, Claude Code, Cursor and other AI coding agents working in this repository.

## Project Overview

**小象万象** -- AI 图像与视频创作工作台。支持多模型生图/生视频、提示词模板、积分套餐和作品管理。

- Production URL: `https://sora2.681023.xyz`

## Commands

```bash
pnpm dev              # Dev server (Turbopack)
pnpm build            # Production build (Turbopack)
pnpm start            # Start production server
pnpm lint             # ESLint
pnpm db:generate      # Generate Drizzle migrations
pnpm db:migrate       # Push schema to database (see Known Issues)
pnpm db:studio        # Open Drizzle Studio
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Auth | Better Auth (username plugin) |
| ORM | Drizzle ORM + PostgreSQL (Supabase) |
| Storage | Supabase Storage |
| Styling | Tailwind CSS 4 + Headless UI + Radix UI Slot |
| i18n | next-intl (Chinese only, `zh-CN`) |
| Validation | Zod 4 |
| Forms | React Hook Form + @hookform/resolvers |
| Rate Limit | Upstash Redis + @upstash/ratelimit |
| AI APIs | Duomi (image/video), Google Generative AI (prompt enhance), Kie (video), Veo (video) |
| Deploy | Vercel |

## Architecture

```
src/
  app/
    (routes)/
      (auth)/          # Sign in, sign up, forgot/reset password
      (home)/          # Landing page
      studio/          # Main app (image/video workshops, assets, subscription, profile)
    api/
      admin/           # Admin CRUD (settings, users, orders, announcements, redemption-codes)
      auth/            # Better Auth handler
      callback/        # Webhook receivers (Duomi, Kie)
      credits/         # Credit balance & redeem
      cron/            # Vercel Cron (daily credit grants)
      enhance-prompt/  # AI prompt enhancement (Gemini)
      image/           # Image generation & task queries
      orders/          # Credit package orders
      packages/        # Credit packages (public)
      redeem/          # Redemption code API
      studio/          # Studio session management
      video/           # Video generation & task queries
  components/ui/       # Shared UI primitives (Button, Dialog, Form, Input, Sheet, etc.)
  db/
    schema/
      auth/            # Auth tables (user, session, account, verification)
      studio/          # Business tables (video/image tasks, credits, packages, subscriptions, etc.)
  features/studio/
    components/        # Feature components (workshops, galleries, admin panels)
    context/           # StudioContext (global client state)
    data/              # Static data (showcase examples)
    hooks/             # Custom hooks (polling, simulated progress)
    services/          # Business logic (credit, storage, duomi, kie, veo, task CRUD)
    utils/             # Helpers (file, prompt library, user)
    types.ts           # Shared TypeScript types
  i18n/                # next-intl config & locale files (zh-CN)
  lib/
    api/               # API utilities
    auth/              # Auth config, helpers (server, client, admin check)
    security/          # Error handler, SSRF protection
    validations/       # Zod schemas, auth messages
  middleware.ts        # Route protection middleware
  routes.ts            # Route definitions (public, auth, API)
  providers/           # Root providers (theme, etc.)
```

## Key Patterns

### Authentication

```typescript
// Server-side (API routes, Server Components)
import { getServerSession } from "@/lib/auth/get-session";
const session = await getServerSession();

// Client-side
import { useSession } from "@/lib/auth/client";

// Admin check (API routes)
import { checkAdmin, isAdminError, adminErrorResponse } from "@/lib/auth/check-admin";
```

### API Routes (Next.js 16 async params)

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
}
```

### i18n

```typescript
// Server Components
const t = await getTranslations("namespace");

// Client Components
const t = useTranslations("namespace");
```

### Hydration Safety

```typescript
// WRONG: Causes hydration mismatch
const items = useMemo(() => shuffle(data), []);

// CORRECT: Randomize only on client side
const [items, setItems] = useState(data);
useEffect(() => { setItems(shuffle(data)); }, []);
```

### External API Flow

| API | Mode | Flow |
|-----|------|------|
| Duomi Video | Callback-only | POST -> webhook at `/api/callback` -> frontend polls DB |
| Duomi Image | Polling | POST -> poll Duomi API for status |
| Kie Video | Callback | POST -> webhook at `/api/callback/kie` -> frontend polls DB |

**Task lifecycle**: Create DB task -> Deduct credits -> Call external API -> Save result to Supabase Storage -> Auto-refund on failure

### Route Protection

Configured in `src/routes.ts`:

- `publicRoutes` -- No auth required
- `publicApiRoutes` -- Public API endpoints (webhooks, cron)
- `authRoutes` -- Redirect to home if already logged in

### Credit System

| Action | Credits |
|--------|---------|
| Image generation | 10 |
| Video (Fast/sora-2-temporary) | 30 |
| Video (Quality/sora-2-pro) | 100 |

- Credits deducted before task, auto-refund on failure
- Redemption codes in `redemption_code` table
- Daily video limits in `system_config` table (user-level overrides available)
- Vercel Cron job grants daily credits at 00:05 UTC

## Environment Variables

**Required**: `DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET`, `NEXT_PUBLIC_BASE_URL`, `DUOMI_API`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`

**Optional**: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (rate limiting), `DUOMI_CALLBACK_SECRET` (HMAC callback verification)

See `env.example` for connection string format.

## Known Issues

1. **`pnpm db:migrate` bug**: drizzle-kit 0.31.8 fails with Supabase CHECK constraints. Workaround: run SQL directly via Supabase dashboard or use `npx tsx scripts/migrate-enum.ts`.
2. **Video callback delay**: Video tasks show "处理中 0%" for 10-30+ min. This is by design -- callback-only API, no polling. Debug with server log: `[Callback] Received callback request`.

## Conventions

- Path alias: `@/*` maps to `./src/*`
- Single language app (zh-CN), no locale routing
- UI primitives in `src/components/ui/`, feature components in `src/features/`
- Services encapsulate all external API calls and DB operations
- All API routes validate session before processing (except public routes)
