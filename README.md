# 3D模型预览平台

一个基于 Next.js 开发的3D模型在线预览和分享平台。

> **⚡ 特别说明：** 全部代码由 Cursor 生成，本人只是产品。

## ✨ 主要功能

- 🎮 3D模型实时预览与交互
- 📁 支持多种3D文件格式（GLB、DAE等）
- 🔐 用户认证和授权系统
- ⬆️ 模型上传和管理功能
- ⭐ 模型收藏和评论系统
- 📅 用户签到奖励系统
- 📱 响应式设计，支持移动端和桌面端
- 💬 实时聊天功能
- 🔍 模型搜索功能

## 🛠️ 技术栈

### 前端
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Three.js / React Three Fiber
- Shadcn UI

### 后端
- Next.js API Routes
- Prisma ORM
- NextAuth.js

### 存储
- OSS 对象存储
- prisma数据库

## 🚀 快速开始

### 前置要求

- Node.js 18+
- PostgreSQL
- OSS 存储账号

### 安装步骤

1. 克隆项目

```bash
git clone https://github.com/1049861657/liveModel.git
cd [repository-name]
```

2. 安装依赖

```bash
npm install
```

3. 环境配置
复制 `.env.example` 文件为 `.env`，并配置相应的环境变量

4. 数据库初始化

```bash
npx prisma generate
npx prisma db push
```

5. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000 查看应用。

## 📦 云端部署

项目可以部署到 Render 或其他支持 Next.js后端服务的平台。

## 🤝 贡献指南

现阶段能提提问题和建议就好啦

## 📝 许可证

本项目采用 Apache License 2.0 许可证。查看 [LICENSE](./LICENSE) 文件了解更多信息。 