# 每日视频生成限制设计文档

**日期：** 2026-02-06
**状态：** 已批准
**作者：** Claude Code

## 概述

实现用户每日视频生成次数限制功能，管理员可修改全局默认值，也可针对单个用户覆盖限制。

## 需求确认

- **适用范围：** 所有用户
- **默认限制：** 普通视频不限（-1），高质量视频 2 条/天
- **限制值含义：** `-1` = 无限制，`0` = 禁止生成，正数 = 具体限制
- **配置存储：** 全局默认值 + 用户可覆盖
- **管理界面：** User Center 管理员区域

## 数据库设计

### 1. 新增系统配置表 `system_config`

```typescript
// src/db/schema/studio/system-config.ts

export const systemConfig = pgTable("system_config", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: text("updated_by").references(() => user.id),
}).enableRLS();
```

**初始数据：**

| key | value | description |
|-----|-------|-------------|
| `daily_fast_video_limit` | `-1` | 每日普通视频生成限制（-1=不限制） |
| `daily_quality_video_limit` | `2` | 每日高质量视频生成限制 |

### 2. 用户表新增字段

```typescript
// src/db/schema/auth/user.ts 新增字段

dailyFastVideoLimit: integer("daily_fast_video_limit"),    // null = 用全局值
dailyQualityVideoLimit: integer("daily_quality_video_limit"), // null = 用全局值
```

**字段说明：**
- `null` - 使用全局默认值
- `-1` - 无限制（覆盖全局设置）
- `0` - 禁止生成
- `正数` - 具体限制数量

## API 设计

### 1. 获取全局配置

**路由：** `GET /api/admin/settings`
**权限：** 仅 admin

**响应：**
```typescript
{
  success: boolean
  data?: {
    dailyFastVideoLimit: number
    dailyQualityVideoLimit: number
  }
}
```

### 2. 修改全局配置

**路由：** `PATCH /api/admin/settings`
**权限：** 仅 admin

**请求体：**
```typescript
{
  dailyFastVideoLimit?: number   // -1 或 >= 0
  dailyQualityVideoLimit?: number
}
```

### 3. 修改单个用户限制

**路由：** `PATCH /api/admin/users/:id/limits`
**权限：** 仅 admin

**请求体：**
```typescript
{
  dailyFastVideoLimit?: number | null   // null = 恢复使用全局值
  dailyQualityVideoLimit?: number | null
}
```

## 核心业务逻辑

### 限制检查服务

```typescript
// src/features/studio/services/video-limit-service.ts

export const videoLimitService = {
  /**
   * 检查用户是否可以生成视频
   * @returns { allowed: boolean, reason?: string, used: number, limit: number }
   */
  async checkLimit(userId: string, videoType: 'fast' | 'quality') {
    // 1. 获取用户今日已生成数量
    const todayCount = await this.getTodayGenerationCount(userId, videoType);

    // 2. 获取限制值（用户覆盖 ?? 全局默认）
    const limit = await this.getEffectiveLimit(userId, videoType);

    // 3. -1 表示无限制
    if (limit === -1) {
      return { allowed: true, used: todayCount, limit: -1 };
    }

    // 4. 检查是否超限
    if (todayCount >= limit) {
      return {
        allowed: false,
        reason: `今日${videoType === 'fast' ? '普通' : '高质量'}视频生成次数已用完（${todayCount}/${limit}），明日重置`,
        used: todayCount,
        limit,
      };
    }

    return { allowed: true, used: todayCount, limit };
  },

  /**
   * 获取用户今日生成数量
   */
  async getTodayGenerationCount(userId: string, videoType: 'fast' | 'quality') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const model = videoType === 'fast' ? 'sora-2-temporary' : 'sora-2-pro';

    const count = await db
      .select({ count: sql<number>`count(*)` })
      .from(videoTask)
      .where(
        and(
          eq(videoTask.userId, userId),
          eq(videoTask.model, model),
          gte(videoTask.createdAt, today),
          // 只统计非失败的任务
          ne(videoTask.status, 'error')
        )
      );

    return count[0]?.count ?? 0;
  },

  /**
   * 获取有效限制值（用户覆盖优先）
   */
  async getEffectiveLimit(userId: string, videoType: 'fast' | 'quality') {
    // 1. 查询用户自定义限制
    const user = await db.query.user.findFirst({
      where: eq(user.id, userId),
      columns: {
        dailyFastVideoLimit: true,
        dailyQualityVideoLimit: true,
      },
    });

    const userLimit = videoType === 'fast'
      ? user?.dailyFastVideoLimit
      : user?.dailyQualityVideoLimit;

    // 2. 如果用户有自定义值，使用用户值
    if (userLimit !== null && userLimit !== undefined) {
      return userLimit;
    }

    // 3. 否则使用全局默认值
    const configKey = videoType === 'fast'
      ? 'daily_fast_video_limit'
      : 'daily_quality_video_limit';

    const config = await db.query.systemConfig.findFirst({
      where: eq(systemConfig.key, configKey),
    });

    return config ? parseInt(config.value, 10) : (videoType === 'fast' ? -1 : 2);
  },
};
```

### 视频生成 API 集成

```typescript
// src/app/api/video/generate/route.ts 修改

// 在扣除积分之前添加限制检查
const videoType = model === 'sora-2-temporary' ? 'fast' : 'quality';
const limitCheck = await videoLimitService.checkLimit(session.user.id, videoType);

if (!limitCheck.allowed) {
  return NextResponse.json({
    success: false,
    error: limitCheck.reason,
    errorCode: 'DAILY_LIMIT_EXCEEDED',
    used: limitCheck.used,
    limit: limitCheck.limit,
  }, { status: 429 });
}
```

## UI 设计

### 管理员系统设置面板

**位置：** User Center 页面，管理员区域

```
┌─────────────────────────────────────────────────────┐
│ ⚙️ 系统设置                                         │
├─────────────────────────────────────────────────────┤
│ 每日视频生成限制（全局默认）                         │
│                                                     │
│ 普通视频 (Fast):    [ -1 ] 条/天  (-1 = 不限制)     │
│ 高质量视频 (Quality): [ 2 ] 条/天                   │
│                                                     │
│                              [保存设置]             │
└─────────────────────────────────────────────────────┘
```

### 用户端限制提示

**生成按钮旁显示剩余次数：**
- 普通视频：不显示（无限制时）
- 高质量视频：`今日剩余 2 次`

**达到限制时的错误提示：**
```
今日高质量视频生成次数已用完（2/2），明日重置
```

## 实现计划

### Phase 1: 数据库
1. 创建 `system_config` 表
2. 用户表添加限制字段
3. 生成并执行迁移
4. 插入初始配置数据

### Phase 2: 服务层
1. 实现 `videoLimitService`
2. 集成到视频生成 API

### Phase 3: 管理员 API
1. `GET /api/admin/settings`
2. `PATCH /api/admin/settings`
3. `PATCH /api/admin/users/:id/limits`

### Phase 4: UI
1. 管理员系统设置面板
2. 用户端剩余次数显示
3. 限制错误提示

## 测试策略

### 单元测试
- `videoLimitService.checkLimit()` 各种场景
- 限制值优先级（用户覆盖 > 全局默认）

### 集成测试
- 达到限制后拒绝生成
- 管理员修改全局配置
- 管理员修改用户限制
- 次日重置计数

### 边界测试
- `-1` 无限制场景
- `0` 禁止生成场景
- 跨时区日期边界

## 总结

本设计实现了灵活的每日视频生成限制系统：
- **全局默认值** - 管理员可随时调整
- **用户覆盖** - 可针对特定用户放宽或收紧限制
- **简单的限制语义** - `-1` 无限制，`0` 禁止，正数为具体限制
- **友好的用户提示** - 显示剩余次数和重置时间
