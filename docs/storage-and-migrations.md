# 存储私有化 与 数据库迁移 操作手册

代码改动已完成，但有两件事必须在 Supabase / 生产库上手工执行一次。
**执行顺序：先部署代码，再翻转 bucket。** 反过来会让线上作品短暂 404。

---

## 一、把 studio-assets bucket 转为私有

### 为什么

此前 bucket 是 public，意味着任何人拿到对象地址就能读取任意用户的作品，
地址本身没有任何鉴权。转私有后，作品只能通过服务端签发的限时链接访问。

### 代码侧已经做了什么

- 上传函数不再返回公开 URL，改为返回 **bucket 内路径**（如 `users/<uid>/images/xxx.png`），入库存的也是路径。
- 所有对外输出作品地址的接口，在返回前调用 `storageService.resolveAssetUrls()` 现场签发限时链接（展示 1 小时）。
- 传给外部 AI 的源图/参考图单独签发 6 小时链接（`resolveProviderAssetUrl`）——否则 provider 拉不到图。
- `toStoragePath()` 同时认识**历史遗留的完整公开 URL**和新的路径，所以**存量数据不需要迁移**，老行会被自动反解成路径再签名。
- `next.config.ts` 的图片白名单已加入 `/storage/v1/object/sign/**`。

### 需要你手工执行

1. Supabase Dashboard → Storage → `studio-assets` → 设为 Private
   （或用 service role 调 `updateBucket('studio-assets', { public: false })`）。
   **文件不需要搬迁**，只是改 bucket 属性。

2. 在 SQL Editor 执行下面的 RLS 策略。

   注意：本项目所有读写都走服务端 + service role key，**service role 会完全绕过 RLS**，
   所以真正的隔离来自"服务端先校验归属、再签发限时链接"。
   下面的策略是**纵深防御**——万一以后有客户端直连，或 anon key 泄露，
   它能挡住越权读写。

```sql
-- 用户只能读自己目录下的对象
create policy "studio_assets_select_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'studio-assets'
  and (storage.foldername(name))[1] = 'users'
  and (storage.foldername(name))[2] = (select auth.uid())::text
);

-- 用户只能写入自己目录
create policy "studio_assets_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'studio-assets'
  and (storage.foldername(name))[1] = 'users'
  and (storage.foldername(name))[2] = (select auth.uid())::text
);

-- 用户只能删除自己目录下的对象
create policy "studio_assets_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'studio-assets'
  and (storage.foldername(name))[1] = 'users'
  and (storage.foldername(name))[2] = (select auth.uid())::text
);
```

> `(select auth.uid())` 的括号不是风格问题：不包一层的话 Postgres 会对每一行
> 重新求值该函数，大表上差距可达两个数量级。Supabase 的 `auth_rls_initplan`
> linter 专门检查这一点。

### 翻转后自查

- 打开一个作品详情页，图片/视频能正常显示（地址里应含 `/object/sign/` 和 `token=`）。
- 把该地址里的 `token` 参数删掉再访问，应当被拒绝。
- 发起一次图生视频/图生图，确认外部 AI 能成功拉到源图（失败会体现为任务报错）。

### 已知取舍

- 签名链接的**过期**和 **CDN 缓存**是两回事：链接过期后，已被边缘节点缓存的
  响应仍可能被返回。要立刻断开某个对象的访问，唯一可靠办法是删除该对象。
- 私有 bucket 的 CDN 命中率天然低于 public，首次访问会慢一些。

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

### 需要你手工执行（只做一次）

生产库此前只用过 `push`，所以 drizzle 的迁移记录表是空的。直接跑 `db:migrate`
会从 `0000` 开始重放，撞上已存在的表而失败。必须先打基线：

```bash
# 1. 确认线上库的结构对应到哪个迁移（正常情况是最后一个已应用的）
pnpm db:baseline --list

# 2. 把该 tag 及之前的全部标记为「已应用」
#    0016 是本次新增的索引迁移，尚未应用，所以基线打在 0015
pnpm db:baseline 0015_late_namor

# 3. 应用增量（本次即 0016 的索引）
pnpm db:migrate
```

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
