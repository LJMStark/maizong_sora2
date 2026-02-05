# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Interaction Rules

1. **称呼**：所有回复必须以 "B哥" 开头
2. **语言**：所有回复必须使用中文（简体）

## Commands

```bash
pnpm dev              # Start dev server with Turbopack
pnpm build            # Production build
pnpm start            # Start production server
pnpm lint             # ESLint
pnpm db:generate      # Generate Drizzle migrations
pnpm db:migrate       # Push schema to database (has known bug, see below)
pnpm db:studio        # Open Drizzle Studio
```

## Testing

- **Production URL**: https://sora2.681023.xyz
- Test credentials available in environment or ask maintainer

## Architecture

### Tech Stack
- Next.js 16 (App Router, Turbopack)
- Better Auth (authentication with username plugin)
- Drizzle ORM + PostgreSQL (Supabase)
- Supabase Storage (file uploads)
- Tailwind CSS 4 + Headless UI (Dialog, Sheet, RadioGroup)
- Radix UI Slot (仅用于 Button/Form 组件)
- next-intl (Chinese as default, single-language app)

### Key Directories
- `src/app/api/` - API routes (video, image, callback, credits)
- `src/db/schema/` - Drizzle schema (auth tables, studio tables)
- `src/features/studio/` - Main app components, hooks, services
- `src/i18n/locales/zh-CN/` - Translation files
- `src/lib/auth/` - Better Auth config and helpers
- `src/routes.ts` - Route protection definitions

### Key Patterns

**Authentication**:
```typescript
// API routes
const session = await getServerSession(); // from @/lib/auth/get-session

// Client components
import { useSession } from '@/lib/auth/client';
```

**API Routes** (Next.js 16 async params):
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
}
```

**i18n Usage**:
```typescript
// Server: const t = await getTranslations('namespace');
// Client: const t = useTranslations('namespace');
```

### External APIs (Duomi)

| API | Mode | Flow |
|-----|------|------|
| Video | Callback-only | POST → wait for webhook at `/api/callback` → frontend polls DB |
| Image | Polling | POST → poll Duomi API for status |

**Task Flow**: Create DB task → Deduct credits → Call Duomi → Save to Supabase Storage → Refund on error

### Route Protection

Configure in `src/routes.ts`:
- `publicRoutes` - No auth required
- `publicApiRoutes` - Public API endpoints (e.g., `/api/callback` for webhooks)
- `authRoutes` - Redirect to home if logged in

## Environment Variables

**Required**:
- `DATABASE_URL`, `DIRECT_URL` - Supabase connections
- `BETTER_AUTH_SECRET` - Auth secret
- `NEXT_PUBLIC_BASE_URL` - Production URL (for callback URL)
- `DUOMI_API` - Duomi API key
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

**Optional**:
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` - Rate limiting

## Database Migrations

**Known Issue**: `pnpm db:migrate` has a bug with Supabase CHECK constraints (drizzle-kit 0.31.8).

```bash
# Workaround for enum changes:
npx tsx scripts/migrate-enum.ts

# If db:migrate fails, run SQL directly via Supabase dashboard
```

## Credit System

| Action | Credits |
|--------|---------|
| Image generation | 10 |
| Video (Fast/sora-2-temporary) | 30 |
| Video (Quality/sora-2-pro) | 100 |

Credits deducted before task, auto-refund on failure.

## Known Issues

### Video Callback Delay
Video tasks show "处理中 0%" for 10-30+ minutes because:
- Video API is callback-only (no polling)
- Frontend polls database, not Duomi API
- Status updates only when Duomi sends webhook

**Debug**: Check server logs for `[Callback] Received callback request`
