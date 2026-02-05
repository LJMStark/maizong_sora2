# 兑换码系统设计文档

**日期：** 2026-02-06
**状态：** 已批准
**作者：** Claude Code

## 概述

实现一个完整的积分兑换码系统，允许管理员生成兑换码，用户通过兑换码获取积分。

## 需求确认

### 核心需求
- **使用次数：** 一次性兑换码（每个码只能使用一次）
- **管理权限：** 使用现有 `user.role` 字段判断管理员
- **码格式：** 带分隔符的随机字符串（`XXXX-XXXX-XXXX`）
- **管理界面：** 集成到现有 User Center 页面

### 功能范围
- 管理员可以生成兑换码（设置积分数量、过期时间、备注）
- 用户可以兑换积分
- 管理员可以查看所有兑换码及使用情况
- 管理员可以禁用兑换码

## 数据库设计

### 新增表：redemption_code

```typescript
export const redemptionCodeStatusEnum = pgEnum("redemption_code_status", [
  "active",    // 可用
  "used",      // 已使用
  "expired",   // 已过期
  "disabled",  // 已禁用
]);

export const redemptionCode = pgTable("redemption_code", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(), // 格式：XXXX-XXXX-XXXX
  credits: integer("credits").notNull(), // 兑换的积分数量
  status: redemptionCodeStatusEnum("status").notNull().default("active"),
  expiresAt: timestamp("expires_at"), // 过期时间（可选）
  usedBy: text("used_by").references(() => user.id), // 使用者ID
  usedAt: timestamp("used_at"), // 使用时间
  createdBy: text("created_by").notNull().references(() => user.id), // 创建者（管理员）
  createdAt: timestamp("created_at").defaultNow().notNull(),
  note: text("note"), // 备注（如：给VIP客户、推广活动等）
}).enableRLS();
```

### 索引优化

```sql
CREATE INDEX idx_redemption_code_status ON redemption_code(status);
CREATE INDEX idx_redemption_code_created_at ON redemption_code(created_at DESC);
CREATE INDEX idx_redemption_code_used_by ON redemption_code(used_by);
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| id | text | 主键，UUID |
| code | text | 兑换码，唯一索引 |
| credits | integer | 兑换的积分数量 |
| status | enum | 状态：active/used/expired/disabled |
| expiresAt | timestamp | 过期时间（可选） |
| usedBy | text | 使用者用户ID（外键） |
| usedAt | timestamp | 使用时间 |
| createdBy | text | 创建者用户ID（外键） |
| createdAt | timestamp | 创建时间 |
| note | text | 备注信息 |

## API 设计

### 1. 用户兑换 API

**路由：** `POST /api/redeem`
**权限：** 登录用户

**请求体：**
```typescript
{
  code: string // 兑换码，如 "XKCD-2F9A-8B3E"
}
```

**响应：**
```typescript
{
  success: boolean
  credits?: number // 获得的积分
  error?: string   // 错误信息
}
```

**验证逻辑：**
1. 检查用户是否登录
2. 验证码格式（大写，带分隔符）
3. 检查码是否存在且状态为 active
4. 检查是否已过期
5. 检查是否已被使用
6. 使用数据库事务：
   - 更新用户积分
   - 标记兑换码为已使用
   - 记录积分交易

**错误码：**
- `INVALID_FORMAT` - 兑换码格式不正确
- `NOT_FOUND` - 兑换码不存在
- `ALREADY_USED` - 此兑换码已被使用
- `EXPIRED` - 兑换码已过期
- `DISABLED` - 兑换码已被禁用
- `SYSTEM_ERROR` - 系统错误

### 2. 管理员生成兑换码 API

**路由：** `POST /api/admin/redemption-codes`
**权限：** 仅 admin 角色

**请求体：**
```typescript
{
  credits: number      // 积分数量（1-10000）
  count?: number       // 生成数量（默认1，最多100）
  expiresAt?: string   // 过期时间（ISO格式，可选）
  note?: string        // 备注
}
```

**响应：**
```typescript
{
  success: boolean
  codes?: string[]     // 生成的兑换码列表
  error?: string
}
```

**验证逻辑：**
1. 检查用户是否为 admin
2. 验证积分数量（1-10000）
3. 验证生成数量（1-100）
4. 验证过期时间（必须大于当前时间）
5. 生成兑换码（检查重复）
6. 批量插入数据库

### 3. 管理员查询兑换码列表 API

**路由：** `GET /api/admin/redemption-codes`
**权限：** 仅 admin 角色

**查询参数：**
```typescript
{
  status?: 'active' | 'used' | 'expired' | 'disabled' | 'all'
  page?: number    // 页码（默认1）
  limit?: number   // 每页数量（默认20）
}
```

**响应：**
```typescript
{
  success: boolean
  data?: {
    codes: RedemptionCode[]
    total: number
    page: number
    limit: number
  }
  error?: string
}
```

### 4. 管理员禁用兑换码 API

**路由：** `PATCH /api/admin/redemption-codes/:id`
**权限：** 仅 admin 角色

**请求体：**
```typescript
{
  status: 'disabled'
}
```

**响应：**
```typescript
{
  success: boolean
  error?: string
}
```

## 核心业务逻辑

### 兑换码生成算法

```typescript
// src/lib/redemption-code.ts

/**
 * 生成兑换码：XXXX-XXXX-XXXX 格式
 * 使用大写字母和数字（排除易混淆字符：0,O,1,I,L）
 */
export function generateRedemptionCode(): string {
  const chars = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // 30个字符
  const segments = 3;
  const segmentLength = 4;

  const code = Array.from({ length: segments }, () => {
    return Array.from({ length: segmentLength }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
  }).join('-');

  return code;
}

/**
 * 验证兑换码格式
 */
export function validateCodeFormat(code: string): boolean {
  const pattern = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/;
  return pattern.test(code);
}

/**
 * 格式化兑换码（自动转大写并添加分隔符）
 */
export function formatRedemptionCode(input: string): string {
  const cleaned = input.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  if (cleaned.length !== 12) return input;

  return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8, 12)}`;
}
```

### 兑换流程（事务处理）

```typescript
// src/app/api/redeem/route.ts

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { code } = await request.json();
  const formattedCode = formatRedemptionCode(code);

  if (!validateCodeFormat(formattedCode)) {
    return NextResponse.json({
      success: false,
      error: 'INVALID_FORMAT'
    }, { status: 400 });
  }

  try {
    // 使用数据库事务确保原子性
    const result = await db.transaction(async (tx) => {
      // 1. 锁定兑换码记录（防止并发使用）
      const codeRecord = await tx.query.redemptionCode.findFirst({
        where: eq(redemptionCode.code, formattedCode),
      });

      // 2. 验证状态
      if (!codeRecord) {
        throw new Error('NOT_FOUND');
      }

      if (codeRecord.status !== 'active') {
        throw new Error(codeRecord.status === 'used' ? 'ALREADY_USED' : 'DISABLED');
      }

      if (codeRecord.expiresAt && codeRecord.expiresAt < new Date()) {
        throw new Error('EXPIRED');
      }

      // 3. 更新用户积分
      const user = await tx.query.user.findFirst({
        where: eq(user.id, session.user.id)
      });

      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      await tx.update(user)
        .set({ credits: user.credits + codeRecord.credits })
        .where(eq(user.id, session.user.id));

      // 4. 标记兑换码为已使用
      await tx.update(redemptionCode)
        .set({
          status: 'used',
          usedBy: session.user.id,
          usedAt: new Date()
        })
        .where(eq(redemptionCode.id, codeRecord.id));

      // 5. 记录积分交易
      await tx.insert(creditTransaction).values({
        id: crypto.randomUUID(),
        userId: session.user.id,
        type: 'addition',
        amount: codeRecord.credits,
        balanceBefore: user.credits,
        balanceAfter: user.credits + codeRecord.credits,
        reason: `兑换码：${codeRecord.code}`,
        referenceType: 'redemption_code',
        referenceId: codeRecord.id,
      });

      return { credits: codeRecord.credits };
    });

    return NextResponse.json({
      success: true,
      credits: result.credits
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'SYSTEM_ERROR';
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 400 });
  }
}
```

## UI 设计

### 用户兑换区域（改造现有功能）

**位置：** User Center 页面，积分钱包卡片中的兑换输入框

**改动：**
1. 将硬编码的兑换逻辑改为调用 `/api/redeem` API
2. 添加加载状态
3. 改进错误提示（根据错误码显示友好信息）
4. 自动格式化输入（转大写、添加分隔符）

**错误提示映射：**
```typescript
const REDEEM_ERROR_MESSAGES = {
  INVALID_FORMAT: '兑换码格式不正确，请输入 XXXX-XXXX-XXXX 格式',
  NOT_FOUND: '兑换码不存在，请检查后重试',
  ALREADY_USED: '此兑换码已被使用',
  EXPIRED: '兑换码已过期',
  DISABLED: '兑换码已被禁用',
  SYSTEM_ERROR: '系统错误，请稍后重试',
};
```

### 管理员专属区域（新增）

**位置：** User Center 页面，积分钱包卡片下方

**显示条件：** `user.role === 'admin'`

**组件结构：**

```
┌─────────────────────────────────────────────────────┐
│ 🔧 管理员功能                          [展开/收起] │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 【生成兑换码】                                      │
│ ┌─────────────────────────────────────────────┐   │
│ │ 积分数量: [____] (1-10000)                  │   │
│ │ 生成数量: [____] (1-100, 默认1)             │   │
│ │ 过期时间: [日期选择器] (可选)               │   │
│ │ 备注信息: [__________________________]      │   │
│ │                                             │   │
│ │              [生成兑换码]                   │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ 【生成结果】(生成后显示)                            │
│ ┌─────────────────────────────────────────────┐   │
│ │ ✓ 成功生成 3 个兑换码                       │   │
│ │                                             │   │
│ │ XKCD-2F9A-8B3E  [复制]                      │   │
│ │ MNPQ-7R4S-6T8V  [复制]                      │   │
│ │ WXYZ-3A5B-9C2D  [复制]                      │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ 【兑换码列表】                                      │
│ ┌─────────────────────────────────────────────┐   │
│ │ 筛选: [全部▼] [可用] [已使用] [已过期]      │   │
│ ├─────────────────────────────────────────────┤   │
│ │ 兑换码          积分  状态    创建时间  操作│   │
│ │ XKCD-2F9A-8B3E  100  可用    2026-02-06 复制│   │
│ │ MNPQ-7R4S-6T8V  200  已使用  2026-02-05 -   │   │
│ │ WXYZ-3A5B-9C2D  50   已过期  2026-02-04 -   │   │
│ │                                             │   │
│ │              [上一页] 1/5 [下一页]          │   │
│ └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**样式规范：**
- 主题色：`#8C7355`（棕色，与现有设计一致）
- 边框：`#e5e5e1`
- 背景：`#faf9f6`
- 字体：延续现有的 sans-serif 和 serif 组合
- 间距：与现有卡片保持一致

**交互细节：**
1. 折叠面板默认收起，点击标题展开
2. 生成兑换码后自动展开结果区域
3. 复制按钮点击后显示"已复制"提示（3秒后消失）
4. 列表支持按状态筛选和分页
5. 禁用操作需要二次确认

## 安全性设计

### 1. 权限验证

```typescript
// src/lib/auth/check-admin.ts
export async function checkAdmin() {
  const session = await getServerSession();

  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const user = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
    columns: { role: true }
  });

  if (user?.role !== 'admin') {
    throw new Error('Forbidden: Admin access required');
  }

  return session.user;
}
```

### 2. 限流保护

使用 Upstash Redis 实现限流：

```typescript
// src/lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// 兑换码尝试限流：每个用户每分钟最多 5 次
export const redeemRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
  prefix: 'ratelimit:redeem',
});

// 管理员生成限流：每个管理员每分钟最多 10 次
export const generateRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  prefix: 'ratelimit:generate',
});
```

### 3. 输入验证

**兑换码验证：**
- 自动转大写
- 格式验证（正则表达式）
- 长度验证（12个字符 + 2个分隔符）

**生成参数验证：**
- 积分数量：1-10000
- 生成数量：1-100
- 过期时间：必须大于当前时间
- 备注长度：最多 200 字符

### 4. 防重复生成

```typescript
async function generateUniqueCode(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const code = generateRedemptionCode();

    // 检查是否已存在
    const existing = await db.query.redemptionCode.findFirst({
      where: eq(redemptionCode.code, code)
    });

    if (!existing) {
      return code;
    }

    attempts++;
  }

  throw new Error('Failed to generate unique code');
}
```

### 5. 审计日志

所有关键操作都记录到数据库：

- **兑换操作：** 记录到 `credit_transaction` 表
- **生成操作：** `redemption_code.createdBy` 字段
- **使用操作：** `redemption_code.usedBy` 和 `usedAt` 字段
- **禁用操作：** 更新 `status` 字段（可扩展添加操作日志表）

## 实现计划

### Phase 1: 数据库和核心逻辑
1. 创建 `redemption_code` 表（Drizzle schema）
2. 生成并执行数据库迁移
3. 实现兑换码生成和验证工具函数
4. 实现权限验证中间件

### Phase 2: API 实现
1. 实现 `POST /api/redeem` API
2. 实现 `POST /api/admin/redemption-codes` API
3. 实现 `GET /api/admin/redemption-codes` API
4. 实现 `PATCH /api/admin/redemption-codes/:id` API
5. 添加限流保护

### Phase 3: UI 实现
1. 改造用户兑换区域（调用新 API）
2. 创建管理员折叠面板组件
3. 实现生成兑换码表单
4. 实现兑换码列表和筛选
5. 添加复制功能和交互反馈

### Phase 4: 测试和优化
1. 单元测试（工具函数）
2. 集成测试（API 端点）
3. E2E 测试（用户兑换流程、管理员生成流程）
4. 性能测试（并发兑换、批量生成）
5. 安全测试（权限验证、限流）

## 测试策略

### 单元测试
- 兑换码生成算法
- 格式验证函数
- 权限验证中间件

### 集成测试
- 兑换 API（成功、失败场景）
- 生成 API（成功、失败场景）
- 查询 API（分页、筛选）
- 禁用 API

### E2E 测试
- 用户兑换流程
- 管理员生成和管理流程
- 并发兑换测试
- 过期码处理

### 边界测试
- 并发使用同一个码
- 生成大量兑换码（100个）
- 过期时间边界
- 权限边界

## 部署注意事项

### 环境变量
确保以下环境变量已配置：
- `DATABASE_URL` - 数据库连接
- `UPSTASH_REDIS_REST_URL` - Redis URL（限流）
- `UPSTASH_REDIS_REST_TOKEN` - Redis Token（限流）

### 数据库迁移
```bash
pnpm db:generate  # 生成迁移文件
pnpm db:migrate   # 执行迁移
```

### 初始管理员设置
需要手动在数据库中设置第一个管理员：
```sql
UPDATE "user" SET role = 'admin' WHERE email = 'admin@example.com';
```

### 监控指标
- 兑换码生成数量
- 兑换成功率
- 兑换失败原因分布
- API 响应时间
- 限流触发次数

## 未来扩展

### 可选功能（暂不实现）
- 批量导出兑换码（CSV）
- 兑换码使用统计图表
- 多次使用码（需要修改表结构）
- 兑换码分组管理
- 自动过期检查任务
- 邮件/短信发送兑换码

### 性能优化
- Redis 缓存热门查询
- 数据库读写分离
- 异步生成大批量兑换码

## 总结

本设计文档详细描述了兑换码系统的完整实现方案，包括：
- 数据库表结构和索引优化
- 完整的 API 设计和错误处理
- 用户友好的 UI 设计
- 全面的安全性措施
- 清晰的实现计划和测试策略

该系统设计遵循以下原则：
- **简单性：** 一次性兑换码，避免过度设计
- **安全性：** 事务保证、权限验证、限流保护
- **可维护性：** 清晰的代码结构、完整的审计日志
- **用户体验：** 友好的错误提示、便捷的管理界面
