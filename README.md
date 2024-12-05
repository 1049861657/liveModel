# 3D模型预览平台

一个基于 Next.js 开发的3D模型在线预览和分享平台。

## 主要功能

- 3D模型在线预览
- 支持多种3D文件格式（GLB、DAE等）
- 用户认证和授权
- 模型上传和管理
- 模型收藏和评论
- 用户签到系统
- 响应式设计，支持多种设备

## 技术栈

- Next.js 14
- React
- TypeScript
- Tailwind CSS
- Prisma
- NextAuth.js
- Three.js

## 开始使用

1. 克隆项目

```bash
git clone [your-repository-url]
cd [repository-name]
```

2. 安装依赖

```bash
npm install
```

3. 配置环境变量
复制 `.env.example` 文件为 `.env`，并填写必要的环境变量：

```bash
DATABASE_URL="your-database-url"
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"
```

4. 初始化数据库

```bash
npx prisma generate
npx prisma db push
```

5. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000 查看应用。

## 部署

项目可以部署到 Vercel 或其他支持 Next.js 的平台。

## 贡献

欢迎提交 Issue 和 Pull Request。

## 许可证

[MIT License](LICENSE) 