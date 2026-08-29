# 存储私有化 与 数据库迁移 操作手册

> ## ⚠️ 先做这一步，否则下面全部不生效
>
> 线上 `NEXT_PUBLIC_SUPABASE_URL` 指向 `https://wtadldjelwicwpvtuzae.supabase.co`
> —— 一个**已停用的 Supabase Cloud 老项目**，容器里直接 `ENOTFOUND`。
> 而 `DATABASE_URL` 指向的是自建实例（正常）。线上环境变量是半新半旧的。
>
> **后果：生产环境的对象存储从未真正可用。** 灵感库 502；所有
> `uploadXxxFromUrl` 都失败并静默回落到 provider 原始 URL（代码里
> `catch {}` 吞掉了），作品从未落到自己的存储，provider 链接过期即丢失。
>
> **在 Zeabur 控制台改这两个变量，然后重新构建**
> （`NEXT_PUBLIC_*` 是构建期内联的，改完必须重建）：
>
> ```
> NEXT_PUBLIC_SUPABASE_URL   = https://maizongsora.zeabur.app
> SUPABASE_SERVICE_ROLE_KEY  = <自建实例的 service role key>
> ```
>
> 若容器访问兄弟服务的公网域名不通（hairpin NAT），再设
> `SUPABASE_INTERNAL_URL` 为内网地址——代码已支持，签名后会把主机
> 换回公网域名给浏览器。
>
> 改完用 `/api/health` 验证：`checks.gallery` 应从
> `fail_TypeError:getaddrinfo ENOTFOUND ...` 变成 `ok`。

本文记录存储分桶与迁移流程切换的**已完成状态**及其原因，供后续维护参考。
第一、二节的线上操作已于 2026-08-29 执行完毕，无需重做。

---

## 一、存储分桶（已完成）

### 为什么是两个桶

原先只有一个 `studio-assets` 且是 public，用户作品和灵感库素材混在一起。
直接把它转私有会连带打死灵感库——实际对象分布是：

| 前缀 | 数量 | 性质 |
|---|---|---|
| `gallery/xiaoxiaodong/` | 9037 | 灵感库，公开展示，本就该匿名可读 |
| `users/` | 7 | 用户作品，必须私密 |

所以拆成两个桶，而不是把整桶翻私有：

- **`studio-assets`** — 保持 **public**，装灵感库等公开素材。
- **`studio-user-assets`** — **private**，装用户作品，只能通过服务端签发的限时链接访问。

### 已执行的操作

1. 建 `studio-user-assets` 私有桶（不设 `fileSizeLimit`——自建 Supabase 的
   全局上限低于 100MB，显式传更大的值会被拒绝）。
2. 把 `users/` 下 7 个对象搬过去。
3. 数据库里 7 行 `ppt_slide.final_image_url` 的完整公开 URL 改写成裸路径。
4. `storage.objects` 上的三条 RLS 策略指向 `studio-user-assets`。

### 代码侧

- `storage-service.ts` 的 `BUCKET_NAME` = `studio-user-assets`。
- `toStoragePath()` 同时认识裸路径、新桶 URL、以及**旧桶里 `users/` 前缀**的
  历史 URL；旧桶里 `gallery/` 等公开前缀会被原样返回，不会被误当私有对象签名。
- 对外输出前用 `resolveAssetUrls()` 批量签发限时链接（展示 1h）。
- 传给外部 AI 的源图/参考图单独签 6h（`resolveProviderAssetUrl`）。
- `next.config.ts` 图片白名单已含 `/storage/v1/object/sign/**`。

### 自查

```bash
# 用户作品的公开地址应当被拒绝
curl -o /dev/null -w "%{http_code}\n" \
  "$SUPABASE_URL/storage/v1/object/public/studio-user-assets/users/<uid>/ppt/<task>/1.png"
# 期望 400

# 灵感库应当仍然可读
curl -o /dev/null -w "%{http_code}\n" \
  "$SUPABASE_URL/storage/v1/object/public/studio-assets/gallery/xiaoxiaodong/index.json"
# 期望 200
```

### 踩过的坑（留作记录）

- 一次性把 `studio-assets` 整桶转私有会让灵感库 502：它的目录 JSON 是通过
  `/object/public/` 拿的。已回滚并改为分桶。
- 灵感库路由带 `revalidate = 3600`，失败结果会被缓存约一小时；重新部署可清除。

### 已知取舍

- 签名链接的**过期**和 **CDN 缓存**是两回事：链接过期后，已被边缘缓存的响应
  仍可能被返回。要立刻断开某对象的访问，唯一可靠办法是删除该对象。

---

## 二、从 `drizzle-kit push` 切换到正规迁移

### 为什么

原来的 `db:migrate` 脚本实际执行的是 `drizzle-kit push`——直接把库改成与
schema 一致，**不留历史、无法审查、不能回滚**。对一个处理积分和退款的
系统来说风险过高。命名本身也具有误导性。

### 代码侧已经做了什么

```
db:generate  drizzle-kit generate   生成迁移 SQL（改完 schema 后跑）
db:migrate   drizzle-kit migrate    应用未执行的迁移（部署时跑）
db:push      drizzle-kit push       仅本地原型用，会绕过迁移历史
db:baseline  tools/db-baseline.ts   一次性：把已生效的迁移补登记
```

另外 `supabase/migrations/` 已删除——那 5 个文件与 `drizzle/` 下的完全逐字节相同，
两套目录并存会导致两个工具各自以为掌握了全部历史。**`drizzle/` 现在是唯一来源。**

### 已执行（只做一次，无需重做）

生产库此前只用过 `push`，drizzle 的迁移记录表是空的。直接跑 `db:migrate`
会从 `0000` 开始重放并失败，所以先打了基线：

```bash
# 1. 确认线上库的结构对应到哪个迁移（正常情况是最后一个已应用的）
pnpm db:baseline --list

# 2. 把该 tag 及之前的全部标记为「已应用」
#    0016 是本次新增的索引迁移，尚未应用，所以基线打在 0015
pnpm db:baseline 0015_late_namor

# 3. 应用增量（本次即 0016 的索引）
pnpm db:migrate
```

已登记 0000~0015 共 16 条，随后 `db:migrate` 应用了 `0016`（对账用的索引）。
`db:baseline` 是幂等的，重复执行不会产生重复登记。

> 打基线前请确认线上库结构确实与 `0015` 一致。如果中途手工改过表，
> 先用 `pnpm db:generate` 看看会不会生成非空 diff——生成空 diff 才说明对齐了。

### 之后的日常流程

```
改 src/db/schema/**  →  pnpm db:generate  →  提交生成的 SQL  →  部署时 pnpm db:migrate
```

不要再对生产库使用 `db:push`。

---

## 三、定时任务（Zeabur 上的现状）

`vercel.json` 已删除——Zeabur 不读取它，里面配的两个 cron **从未执行过**。

定时任务现在由**进程内调度器**驱动（`src/lib/scheduler.ts`，在
`src/instrumentation.ts` 的 `register()` 里启动）：

| 任务 | 频率 | 作用 |
|---|---|---|
| ppt-advance | 15 秒 | 推进 PPT 流水线，不依赖用户浏览器开着 |
| video-recovery | 60 秒 | 向 provider 核对卡死任务，超时则失败退款 |
| refund-reconcile | 5 分钟 | 补退漏退的积分 |
| subscription-refresh | 1 小时 | 订阅每日额度刷新与过期处理 |

多副本安全：每轮都在 Postgres session 级 advisory lock 保护下执行，
抢不到锁的副本直接跳过，因此退款补偿不会被并发执行两次。

`/api/cron/reconcile-tasks` 和 `/api/cron/grant-daily-credits` 保留为手工/外部
触发入口（需 `Authorization: Bearer $CRON_SECRET`）。

如果将来改为多副本并希望改用外部调度器，设 `DISABLE_INTERNAL_SCHEDULER=1`
可关闭进程内调度。
