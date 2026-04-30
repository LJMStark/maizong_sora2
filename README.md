# 小象万象

小象万象是一个面向图像和视频创作的 AI 工作台，支持多模型生图、多模型生视频、提示词模板选择、积分套餐和作品管理。

- **图像工作室**：文字生成图片、参考图编辑、历史素材复用。
- **视频工作室**：基于提示词或图片生成 AI 视频，支持快速和高质量模式。
- **提示词库**：按商品图、海报、人像、短视频等场景选择提示词。
- **多模型选择**：按速度、质量和创作类型选择不同生成模型。
- **积分系统**：积分包、订阅卡、订单和后台管理。
- **账号体系**：基于 Better Auth 的邮箱、用户名和密码登录。

## 技术栈

- Next.js 16 App Router
- Better Auth
- Drizzle ORM + PostgreSQL
- Supabase Storage
- Tailwind CSS 4
- next-intl

## 本地启动

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

```bash
cp env.example .env
```

按 `.env` 中的说明填入数据库、鉴权、存储和生成服务配置。

### 3. 同步数据库

```bash
pnpm db:migrate
```

### 4. 启动开发服务

```bash
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000) 访问本地应用。

## 常用命令

```bash
pnpm dev
pnpm build
pnpm lint
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```
