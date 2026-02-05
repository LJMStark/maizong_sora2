# 积分系统重新设计

## 概述

重新设计积分购买系统，支持两种模式：
1. **积分包** - 一次性购买固定积分
2. **会员订阅** - 按时长每日自动发放积分

## 套餐配置

### 积分包（一次性购买）

| 名称 | 积分 | 价格 |
|------|------|------|
| 启智积分包（基础版） | 100 | ¥9.90 |
| 迅驰智算套餐（进阶版） | 1000 | ¥68.80 |
| 星云超算方案（高级版） | 3000 | ¥138.80 |
| 银河旗舰包（旗舰版） | 10000 | ¥398.80 |

### 会员订阅（每日发放）

| 名称 | 时长 | 每日积分 | 价格 |
|------|------|----------|------|
| 体验天卡 | 1天 | 30 | ¥2.88 |
| 超值月卡 | 30天 | 30 | ¥58.80 |
| 劲爆半年 | 180天 | 40 | ¥198.00 |
| 无敌年卡 | 365天 | 50 | ¥398.80 |

### 会员简介说明

- 开通即享每日积分自动发放
- 积分可累计使用（不过期）
- 无需登录也能自动领取
- 长期使用性价比超高

## 数据库设计

### 积分套餐表 (credit_package)

```typescript
credit_package {
  id: text (主键)
  name: text           // 套餐名称
  type: enum           // "package" | "subscription"
  credits: integer     // 积分包的积分数量
  daily_credits: integer  // 会员每日发放积分
  duration_days: integer  // 会员时长（天）
  price: integer       // 价格（分），990 = ¥9.90
  sort_order: integer  // 排序
  is_active: boolean   // 是否启用
  created_at: timestamp
}
```

### 用户订阅表 (user_subscription)

```typescript
user_subscription {
  id: text (主键)
  user_id: text        // 关联用户
  package_id: text     // 关联套餐
  start_date: date     // 开始日期
  end_date: date       // 结束日期
  daily_credits: integer  // 每日发放积分
  last_grant_date: date   // 最后发放日期
  status: enum         // "active" | "expired"
  created_at: timestamp
}
```

### 积分订单表 (credit_order)

```typescript
credit_order {
  id: text (主键)
  user_id: text        // 关联用户
  package_id: text     // 关联套餐
  amount: integer      // 金额（分）
  status: enum         // "pending" | "paid" | "cancelled"
  remark: text         // 备注
  created_at: timestamp
  paid_at: timestamp   // 支付时间
}
```

## UI 设计

### 页面布局

```
┌─────────────────────────────────────────────────────────┐
│                    购买积分                              │
│              选择适合您的积分方案                         │
├─────────────────────────────────────────────────────────┤
│     [ 积分包 ]          [ 会员订阅 ]     ← Tab 切换       │
├─────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ 基础版  │ │ 进阶版  │ │ 高级版  │ │ 旗舰版  │       │
│  │ 100积分 │ │1000积分 │ │3000积分 │ │10000积分│       │
│  │ ¥9.90  │ │ ¥68.80 │ │¥138.80 │ │¥398.80 │       │
│  │ [购买] │ │ [购买] │ │ [购买] │ │ [购买] │       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
├─────────────────────────────────────────────────────────┤
│                    会员简介（仅会员Tab显示）              │
│  - 开通即享每日积分自动发放                              │
│  - 积分可累计使用（不过期）                              │
│  - 无需登录也能自动领取                                  │
│  - 长期使用性价比超高                                    │
└─────────────────────────────────────────────────────────┘
```

### 购买确认弹窗

```
┌─────────────────────────────────────┐
│         确认购买                    │
├─────────────────────────────────────┤
│  套餐：启智积分包（基础版）          │
│  积分：100                          │
│  价格：¥9.90                        │
├─────────────────────────────────────┤
│  请添加客服微信完成支付              │
│                                     │
│      [客服微信二维码图片]            │
│                                     │
│  备注您的订单号：ORD20260205XXXX    │
├─────────────────────────────────────┤
│     [取消]          [已添加客服]    │
└─────────────────────────────────────┘
```

## 定时任务

### 每日积分发放

- **触发方式：** Vercel Cron Job
- **执行时间：** 每天凌晨 00:05
- **API 路由：** `/api/cron/grant-daily-credits`

**执行流程：**
1. 查询所有 status = "active" 且 end_date >= 今天 的订阅
2. 过滤出 last_grant_date < 今天 的记录
3. 给用户增加 daily_credits 积分
4. 创建 credit_transaction 记录
5. 更新 last_grant_date 为今天
6. 将过期订阅状态改为 "expired"

## 购买流程

```
用户点击"购买"按钮
       ↓
弹出确认弹窗（显示套餐信息 + 客服微信二维码）
       ↓
用户添加客服微信，备注订单号
       ↓
客服确认收款后，后台手动处理订单
       ↓
系统自动发放积分/开通会员
```

## 文件变更

### 新增文件

| 文件 | 说明 |
|------|------|
| `src/db/schema/studio/credit-package.ts` | 积分套餐表 |
| `src/db/schema/studio/user-subscription.ts` | 用户订阅表 |
| `src/db/schema/studio/credit-order.ts` | 积分订单表 |
| `src/app/api/cron/grant-daily-credits/route.ts` | 每日积分发放 |
| `src/features/studio/components/credit-purchase-dialog.tsx` | 购买确认弹窗 |
| `scripts/seed-packages.ts` | 套餐初始数据 |
| `vercel.json` | Cron 配置 |

### 修改文件

| 文件 | 说明 |
|------|------|
| `src/features/studio/components/subscription.tsx` | 重写为新页面 |
| `src/db/schema/studio/index.ts` | 导出新表 |
| `src/i18n/locales/zh-CN/studio.json` | 添加翻译 |
