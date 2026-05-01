# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The core project rules, architecture, development commands, and best practices are defined in `./AGENTS.md`. Always read it first and follow it strictly for consistency across tools.

## Interaction Rules

1. **称呼**：所有回复必须以 "B哥" 开头
2. **语言**：所有回复必须使用中文（简体）

## Claude-Specific Notes

### Service Layer Reference

| Service | Purpose |
|---------|---------|
| `credit-service.ts` | Credit deduction, refund, balance, daily grants, subscription |
| `duomi-service.ts` | Duomi video generation API |
| `duomi-image-service.ts` | Duomi image generation API |
| `kie-service.ts` | Kie video generation API |
| `veo-service.ts` | Veo video generation API |
| `video-task-service.ts` | Video task CRUD |
| `image-task-service.ts` | Image task CRUD |
| `storage-service.ts` | Supabase Storage uploads |
| `video-limit-service.ts` | Daily video limit checks |
| `studio-session-service.ts` | Studio session management |

### Callback Security

The `/api/callback` endpoint validates incoming requests using a fallback strategy:

1. **HMAC Signature** (if `DUOMI_CALLBACK_SECRET` is set): Validates `x-duomi-signature` header
2. **Bearer Token** (fallback): Validates `Authorization: Bearer {DUOMI_API}` header
3. **Development Mode**: Allows unauthenticated requests only in development

### Duomi API Error Handling

| Error Message | Meaning | Retry | User Message |
|--------------|---------|-------|--------------|
| `Resources are being allocated` | 服务器繁忙 | 3 次 (30s, 60s, 120s) | "服务器繁忙，请稍后重试" |
| `Failed to generate` | 提示词审核失败 | 1 次 (5s) | "提示词未通过内容审核..." |
| Other errors | 未知错误 | 不重试 | 原始错误信息 |

All failures auto-refund credits.

### Admin APIs

```typescript
GET/PATCH /api/admin/settings           // Global limits
GET/PATCH /api/admin/users/[id]/limits  // User-level overrides
GET/POST  /api/admin/redemption-codes   // Redemption code management
GET/POST  /api/admin/announcements      // Announcements
GET       /api/admin/orders             // Order management
```

### Daily Video Limits

Default limits in `system_config` table:
- Fast video: unlimited (-1)
- Quality video: 2/day

Limit values: `-1` = unlimited, `0` = disabled, positive = daily limit.
User-level overrides via `user.dailyFastVideoLimit` and `user.dailyQualityVideoLimit` (null = use global).

### Redemption Code System

`redemption_code` table fields: `code`, `credits`, `maxUses` (-1 = unlimited), `usedCount`, `expiresAt`.

Endpoints:
- `POST /api/credits/redeem` -- Redeem a code
- `GET/POST /api/admin/redemption-codes` -- Admin CRUD
