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
GET/PATCH        /api/admin/settings                  // Global limits
GET              /api/admin/users                     // User list
GET/PATCH/DELETE /api/admin/users/[id]                // DELETE 实为软禁用（role -> disabled），不删行
GET/PATCH        /api/admin/users/[id]/limits         // User-level limit overrides
GET/POST         /api/admin/redemption-codes          // Redemption code management
PATCH            /api/admin/redemption-codes/[id]     // Update a code
GET              /api/admin/redemption-codes/export   // Export codes
GET              /api/admin/redemption-codes/stats    // Usage stats
GET/POST         /api/admin/announcements             // Announcements (+ GET/PATCH/DELETE [id])
GET              /api/admin/orders                    // Order list (+ PATCH [id])
```

### Daily Video Limits

Default limits in `system_config` table:
- Fast video: unlimited (-1)
- Quality video: 2/day

Limit values: `-1` = unlimited, `0` = disabled, positive = daily limit.
User-level overrides via `user.dailyFastVideoLimit` and `user.dailyQualityVideoLimit` (null = use global).

### Redemption Code System

**单码单用**的状态机，没有 `maxUses` / `usedCount` 这类计数概念。

`redemption_code` 字段：`code`、`credits`、`status`（`active` / `used` / `expired` /
`disabled`）、`expiresAt`、`usedBy`、`usedAt`、`createdBy`、`note`。

核销用条件 UPDATE（`WHERE status = 'active' AND 未过期`）+ 与 `credit-service.ts`
同一把 `credit_wallet` advisory lock，并发重复兑换只有一次能拿到返回行。

Endpoints:
- `POST /api/redeem` -- Redeem a code（注意不是 `/api/credits/redeem`）
- `GET/POST /api/admin/redemption-codes` -- Admin CRUD

### 内容安全与法务

- 提示词前置拦截：`src/lib/security/prompt-safety.ts`，经
  `src/lib/api/prompt-safety-guard.ts` 接入 image/video generate 与 image/edit。
  **必须在扣积分之前调用**——被拦下不扣费是写进 `/terms` 的承诺。
- 错误脱敏是**白名单**：只有 `UserFacingError`（`src/lib/security/user-facing-error.ts`）
  的子类才放行自己的 message。新增业务错误要让用户看到文案时，继承它；
  文案里**不要**拼接上游错误（会泄露供应商与模型名）。
- 法务页在 `src/app/(routes)/(legal)/`，联系方式集中在 `src/lib/legal-contact.ts`。
- 页面门禁看 `authGatedRoutePrefixes`（`src/routes.ts`）；未列出的未知路径会落到
  真正的 404，不再被 307 到 `/signin`。API 那层仍是默认拒绝。
