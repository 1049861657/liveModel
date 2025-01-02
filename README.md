<div align="center">
  <img src="/public/readme/logo.png" alt="LiveModel Logo" width="200"/>
</div>

# 魔抖

一个基于 Next.js 开发的3D模型在线预览和分享平台。
[在线演示](https://livemodel.xyz/)
> **⚡ 特别说明：** 全部代码由 Cursor 生成，本人只是产品。


## 🎯 项目预览

### 模型库展示
![模型库展示](/public/readme/models.png)
*支持模型分类浏览、搜索和筛选功能*

### 模型详情
![模型详情](/public/readme/modelinfo.png)
*提供模型信息、3D预览、评论和收藏等功能*

### 在线预览
![在线预览](/public/readme/preview.png)
*支持模型旋转、缩放、平移等交互操作*

### 快捷上传
![快捷上传](/public/readme/upload.png)
*简单便捷的模型上传流程，支持拖拽上传*

### 实时聊天
![实时聊天](/public/readme/chat.png)
*用户之间可以进行实时交流和模型分享*

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
- Next.js 14 
- React 18
- Tailwind CSS
- Three.js
- Rollup (用于打包优化)

### 构建工具
- Rollup：用于打包第三方库
  - model-viewer (GLB预览)
  - three.js (DAE预览)
  - 优化加载性能
  - 支持离线访问

### 后端
- Next.js API 

### 存储
- OSS 对象存储(阿里云/minio)
- prisma数据库(mysql/mariadb)

## 🚀 快速开始

### 安装步骤

1. 克隆项目

```bash
git clone https://github.com/1049861657/liveModel.git
cd liveModel
```

2. 安装依赖(也可以用npm)

```bash
pnpm install
```

3. 环境配置
复制 `.env.example` 文件为 `.env`，并配置相应的环境变量

4. 数据库初始化

```bash
pnpm dlx prisma generate
pnpm dlx prisma db push
```

5. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000 查看应用。

### Rollup 配置说明

使用 Rollup 打包以下第三方库，无需使用CDN下载依赖：
- model-viewer：用于 GLB 模型预览
- three.js：用于 DAE 模型预览

打包配置文件位于 `rollup.config.mjs`，生成文件位于/public/vendor。
引用方式<script type="module" src="/vendor/model-viewer-bundle.js"></script>

如果修改了相关依赖，需要重新运行 `pnpm rollup` 更新打包文件。


## 📦 云端部署(生产模式)

项目可以部署到 Render 或其他支持 Next.js后端服务的平台。本地服务器同理。
确保所有环境变量在生产环境中正确配置。

1. 构建项目

```bash
pnpm install; pnpm dlx prisma generate; pnpm build
```

2. 启动生产服务器

```bash
pnpm start
```

## 🤝 贡献指南

现阶段能提提问题和建议就好啦

## 📝 许可证

本项目采用 Apache License 2.0 许可证。查看 [LICENSE](./LICENSE) 文件了解更多信息。 