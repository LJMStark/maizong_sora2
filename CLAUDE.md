# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Interaction Rules

1. **称呼**：所有回复必须以 "B哥" 开头
2. **语言**：所有回复必须使用中文（简体）

## Commands

```bash
pnpm dev              # Start dev server with Turbopack
pnpm build            # Production build
pnpm lint             # ESLint
pnpm db:generate      # Generate Drizzle migrations
pnpm db:migrate       # Push schema to database
pnpm db:studio        # Open Drizzle Studio
```

## Architecture

### Tech Stack
- Next.js 16 (App Router, Turbopack)
- Better Auth (authentication with username plugin)
- Drizzle ORM + PostgreSQL (Supabase)
- Supabase Storage (file uploads)
- Tailwind CSS 4 + Radix UI

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
│       ├── callback/      # Duomi API webhook
│       └── credits/       # balance and history
├── db/
│   ├── index.ts           # Drizzle client
│   └── schema/
│       ├── auth/          # user, session, account, verification
│       └── studio/        # video-task, image-task, credit-transaction
├── features/studio/
│   ├── components/        # image-workshop, video-workshop, user-center, sidebar
│   ├── context/           # StudioContext (credits, tasks state)
│   ├── hooks/             # use-task-polling, use-image-task-polling
│   └── services/          # duomi, duomi-image, credit, storage, video-task, image-task
├── lib/auth/
│   ├── server.ts          # Better Auth config
│   ├── client.ts          # Client auth hooks
│   └── get-session.ts     # Server-side session helper
└── components/ui/         # shadcn/ui components
```

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
- Video generation: `duomi-service.ts` - callback-based via `DUOMI_API`
- Image generation: `duomi-image-service.ts` - polling-based via `DUOMI_KEY`

**Task Flow**: Create task → Deduct credits → Call Duomi API → Poll status (image) or wait for callback (video) → Save to Supabase Storage → Refund on error

### Security Layer

```
src/lib/
├── rate-limit.ts              # Rate limiting (Upstash Redis + memory fallback)
├── security/
│   ├── ssrf.ts                # URL validation, blocks private IPs/localhost
│   └── error-handler.ts       # Sanitizes error messages for clients
└── validations/
    └── schemas.ts             # Zod schemas for API input validation
```

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
- `BETTER_AUTH_SECRET`
- `NEXT_PUBLIC_BASE_URL`
- `DUOMI_API` - Video generation API key
- `DUOMI_KEY` - Image generation API key
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
