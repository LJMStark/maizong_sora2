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

### Production Environment
- **URL**: https://sora2.681023.xyz
- **Test Account**:
  - Username: `demon1235`
  - Password: `Aa1235813!`
- **Purpose**: For testing video generation, download functionality, and full user flow

## Architecture

### Tech Stack
- Next.js 16 (App Router, Turbopack)
- Better Auth (authentication with username plugin)
- Drizzle ORM + PostgreSQL (Supabase)
- Supabase Storage (file uploads)
- Tailwind CSS 4 + Radix UI
- next-intl (internationalization, Chinese as default)

### Internationalization (i18n)

**Current Setup**: Chinese (zh-CN) as default language using next-intl v4.8.2

**Implemented**:
- ✅ UI components (auth, studio, sidebar, workshops)
- ✅ API error messages (all routes)
- ✅ Zod validation messages
- ✅ Better Auth error mapping

**Database Content Strategy**:
- **Decision**: Store content directly in Chinese (not translation keys)
- **Rationale**:
  - Single language application (no multi-language requirement)
  - Simpler implementation, better performance
  - Follows YAGNI principle (You Aren't Gonna Need It)
- **Affected Fields**:
  - `credit_transaction.reason` - e.g., "视频生成（快速模式）"
  - `video_task.errorMessage` - e.g., "生成失败"
  - `image_task.errorMessage` - e.g., "图像生成失败"
- **Future Migration Path** (if multi-language needed):
  1. Add `reason_key` field for translation keys
  2. Keep `reason` field for Chinese display
  3. Gradually migrate historical data
  4. Add translation lookup in display layer

**Translation Files**:
- `src/i18n/locales/zh-CN/common.json` - Shared UI text
- `src/i18n/locales/zh-CN/auth.json` - Authentication
- `src/i18n/locales/zh-CN/studio.json` - Studio interface
- `src/i18n/locales/zh-CN/errors.json` - Error messages

**Usage**:
```typescript
// Server components
const t = await getTranslations('auth.signin');

// Client components
const t = useTranslations('studio.image');
```

### Project Structure

```
src/
├── app/
│   ├── (routes)/
│   │   ├── (auth)/        # signin, signup pages
│   │   ├── (home)/        # landing page
│   │   └── studio/        # main application
│   └── api/
│       ├── auth/[...all]/ # Better Auth handler
│       ├── video/         # generate, status, tasks
│       ├── image/         # generate, edit, status, tasks
│       ├── callback/      # Duomi video webhook (public, no auth)
│       └── credits/       # balance and history
├── db/
│   ├── index.ts           # Drizzle client
│   └── schema/
│       ├── auth/          # user, session, account, verification
│       └── studio/        # video-task, image-task, credit-transaction
├── features/studio/
│   ├── components/        # image-workshop, video-workshop, user-center, sidebar
│   ├── context/           # StudioContext (credits, tasks state)
│   ├── hooks/             # use-task-polling, use-image-task-polling, use-simulated-progress
│   └── services/          # duomi, duomi-image, credit, storage, video-task, image-task
├── i18n/
│   ├── config.ts          # i18n configuration (locales, default locale)
│   ├── request.ts         # Server-side i18n request handler
│   ├── types.ts           # TypeScript type definitions for translations
│   └── locales/zh-CN/     # Chinese translation files
├── lib/
│   ├── auth/              # Better Auth config and helpers
│   ├── security/          # SSRF protection, error sanitization
│   ├── validations/       # Zod schemas (with Chinese error messages)
│   └── rate-limit.ts      # Rate limiting (Upstash Redis + memory fallback)
├── middleware.ts          # Auth middleware (route protection)
├── routes.ts              # Route definitions (public, auth, API routes)
└── components/ui/         # shadcn/ui components
```

### Middleware & Route Protection

Routes are protected via `src/middleware.ts` using Better Auth cookies:
- `publicRoutes` - Pages accessible without auth (/, /studio, etc.)
- `publicApiRoutes` - API endpoints accessible without auth (/api/callback for webhooks)
- `authRoutes` - Auth pages that redirect to home if already logged in
- `apiAuthPrefix` - Better Auth API routes (/api/auth/*)

To add a new public webhook endpoint, add it to `publicApiRoutes` in `src/routes.ts`.

### Key Patterns

**Authentication**: Use `getServerSession()` from `@/lib/auth/get-session` in API routes. Client components use hooks from `@/lib/auth/client`.

**Database**: All schema in `src/db/schema/`. Import `db` from `@/db`. Tables use `.enableRLS()` for Supabase RLS.

**API Routes**: Next.js 16 async params pattern:
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
}
```

**External APIs**:
- Video generation: `duomi-service.ts` - **callback-only** (no polling support)
- Image generation: `duomi-image-service.ts` - polling-based
- Both use `DUOMI_API` key
- Video model: `sora-2-temporary` (Fast) or `sora-2-pro` (Quality)

**Duomi API Modes**:
```
Video API: Callback-only mode
  1. POST /videos/generations with callback_url
  2. Duomi sends POST to /api/callback when complete
  3. Frontend polls database status (not Duomi API)

Image API: Polling mode
  1. POST /images/generations returns task_id
  2. GET /images/generations/{task_id} for status
```

**Task Flow**:
1. Create task in database
2. Deduct credits from user
3. Call Duomi API
4. Poll status (image) or wait for callback (video)
5. Save result to Supabase Storage
6. Refund credits on error

**Progress Simulation**:
- Use `useSimulatedProgress` hook for smooth UX
- Image: 30s simulation, max 95% until completion
- Video: 5min simulation, max 92% until completion
- Only reaches 100% when task actually succeeds

### Security Layer

**API Route Pattern**: All generation APIs follow this security flow:
```typescript
// 1. Auth check
const session = await getServerSession();
if (!session?.user) return 401;

// 2. Rate limit check
const { success } = await rateLimiter.limit(userId);
if (!success) return 429;

// 3. Input validation (Zod)
const validation = Schema.safeParse(body);
if (!validation.success) return 400;

// 4. Business logic...

// 5. Error handling (sanitized)
catch (error) {
  return { error: sanitizeError(error) };
}
```

## Environment Variables

Required in `.env`:
- `DATABASE_URL` - Supabase pooled connection
- `DIRECT_URL` - Supabase direct connection (migrations)
- `BETTER_AUTH_SECRET` - Random secret for Better Auth
- `NEXT_PUBLIC_BASE_URL` - Base URL (use HTTPS in production, used for callback URL)
- `DUOMI_API` - Duomi API key (for both video and image generation)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

Optional:
- `UPSTASH_REDIS_REST_URL` - Upstash Redis URL (for rate limiting)
- `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis token

## Database Migrations

**Known Issue**: `pnpm db:migrate` (drizzle-kit push) has a bug with Supabase CHECK constraints in version 0.31.8. Use custom migration scripts instead:

```bash
# For enum changes, use custom script:
npx tsx scripts/migrate-enum.ts

# Standard workflow:
# 1. Update schema files in src/db/schema/
# 2. Generate migration
pnpm db:generate

# 3. If db:migrate fails, run SQL directly or use custom script
# 4. Verify in Drizzle Studio
pnpm db:studio
```

## Credit System

- Image generation: 10 credits
- Video generation (Fast/sora-2-temporary): 30 credits
- Video generation (Quality/sora-2-pro): 100 credits
- Credits are deducted before task creation
- Automatic refund on task failure

## Known Issues

### Video Generation - Callback Delay

**Issue**: Video tasks may show "处理中 0% 完成" for extended periods (10-30+ minutes)

**Root Cause**:
- Video generation uses callback-only mode (no polling support)
- Frontend polls database status, not Duomi API
- Database status only updates when Duomi sends webhook to `/api/callback`
- Duomi processing time varies significantly based on:
  - Video complexity and duration
  - Model selection (sora-2-temporary vs sora-2-pro)
  - API queue load

**Expected Behavior**:
1. Task created with status "pending"
2. Duomi API called with callback URL: `https://sora2.681023.xyz/api/callback`
3. Task status updated to "running" with 0% progress
4. **Long wait period** - Duomi processes video (10-30+ minutes)
5. Duomi sends webhook to `/api/callback` when complete
6. Callback endpoint updates database with final status and video URL
7. Frontend polling detects update and displays completed video

**Verification Steps**:
1. Check task was created in database (积分已扣除)
2. Verify Duomi API call succeeded (duomiTaskId exists)
3. Wait for Duomi callback (check server logs for "[Callback] Received callback request")
4. Confirm video URL saved to Supabase Storage

**Workaround**: None - must wait for Duomi to complete processing and send callback

**Configuration**:
- Callback URL configured in `src/app/api/video/generate/route.ts:82-83`
- Callback endpoint: `src/app/api/callback/route.ts` (public, no auth required)
- Callback verification temporarily disabled (line 52-60) for debugging

**Environment Variables**:
- `NEXT_PUBLIC_BASE_URL` - Must be set to production URL for correct callback URL
- `BETTER_AUTH_URL` - Should be set to avoid "Base URL could not be determined" warning
- Both should be `https://sora2.681023.xyz` in production

**Related Files**:
- `src/app/api/video/generate/route.ts` - Video generation endpoint
- `src/app/api/callback/route.ts` - Duomi webhook handler
- `src/features/studio/services/duomi-service.ts` - Duomi API client
- `src/features/studio/services/video-task-service.ts` - Database operations
