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
- `src/app/api/` - API routes (video, image, callback, credits, admin)
- `src/db/schema/` - Drizzle schema (auth tables, studio tables)
- `src/features/studio/` - Main app components, hooks, services
- `src/features/studio/services/` - Business logic services (see Service Layer below)
- `src/i18n/locales/zh-CN/` - Translation files
- `src/lib/auth/` - Better Auth config and helpers
- `src/routes.ts` - Route protection definitions

### Service Layer (`src/features/studio/services/`)

| Service | Purpose |
|---------|---------|
| `credit-service.ts` | Credit deduction, refund, balance queries |
| `duomi-service.ts` | Video generation API calls |
| `duomi-image-service.ts` | Image generation API calls |
| `video-task-service.ts` | Video task CRUD operations |
| `image-task-service.ts` | Image task CRUD operations |
| `storage-service.ts` | Supabase Storage uploads |
| `video-limit-service.ts` | Daily video limit checks |

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

**Hydration Safety** (IMPORTANT):
```typescript
// WRONG: Math.random() in useMemo causes hydration mismatch
const items = useMemo(() => shuffle(data), []);

// CORRECT: Randomize only on client side after hydration
const [items, setItems] = useState(data);
useEffect(() => {
  setItems(shuffle(data));
}, []);
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

### Redemption Code System

Redemption codes stored in `redemption_code` table:
- `code` - Unique code string
- `credits` - Credits to award
- `maxUses` - Total allowed uses (-1 = unlimited)
- `usedCount` - Current usage count
- `expiresAt` - Optional expiration date

API endpoints:
- `POST /api/credits/redeem` - Redeem a code
- `GET/POST /api/admin/redemption-codes` - Admin CRUD

### Daily Video Limits

Default limits stored in `system_config` table:
- Fast video: unlimited (-1)
- Quality video: 2/day

Limit values: `-1` = unlimited, `0` = disabled, positive = daily limit

User-level overrides in `user.dailyFastVideoLimit` and `user.dailyQualityVideoLimit` (null = use global).

### Admin APIs

```typescript
// Check admin permission (reusable)
import { checkAdmin, isAdminError, adminErrorResponse } from "@/lib/auth/check-admin";

// Admin endpoints
GET/PATCH /api/admin/settings           // Global limits
GET/PATCH /api/admin/users/[id]/limits  // User-level overrides
GET/POST  /api/admin/redemption-codes   // Redemption code management
```

## Known Issues

### Video Callback Delay
Video tasks show "处理中 0%" for 10-30+ minutes because:
- Video API is callback-only (no polling)
- Frontend polls database, not Duomi API
- Status updates only when Duomi sends webhook

**Debug**: Check server logs for `[Callback] Received callback request`

### Duomi API Error Handling

Error types and retry strategy in `/api/callback`:

| Error Message | Meaning | Retry | User Message |
|--------------|---------|-------|--------------|
| `Resources are being allocated` | Duomi 服务器繁忙 | 3 次 (30s, 60s, 120s) | "服务器繁忙，请稍后重试" |
| `Failed to generate` | 提示词审核失败 | 1 次 (5s) | "提示词未通过内容审核..." |
| Other errors | 未知错误 | 不重试 | 原始错误信息 |

All failures auto-refund credits.
