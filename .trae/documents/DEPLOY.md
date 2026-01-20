# 项目部署指南

本文档详细介绍如何将前后端分离的个人博客项目部署到生产环境。

## 项目架构概览

- **前端**: Next.js 16 + React 19 + TypeScript + Tailwind CSS
- **后端**: NestJS + Prisma + PostgreSQL
- **部署平台**: 
  - 前端: Vercel (自动部署)
  - 后端: Railway (容器化部署)
  - 数据库: Railway PostgreSQL

## 1. 环境变量配置

### 1.1 后端环境变量

在 `backend` 目录下创建 `.env` 文件：

```env
# 数据库连接
DATABASE_URL="postgresql://user:password@localhost:5432/myblog?schema=public"

# JWT配置
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRES_IN="7d"

# 应用端口
PORT=3001

# CORS配置
FRONTEND_URL="https://your-frontend-domain.vercel.app"
```

### 1.2 前端环境变量

在 `frontend` 目录下创建 `.env.local` 文件：

```env
# API基础URL
NEXT_PUBLIC_API_URL="https://your-backend-domain.railway.app"

# 应用基础URL
NEXT_PUBLIC_APP_URL="https://your-frontend-domain.vercel.app"
```

## 2. 数据库准备

### 2.1 本地开发数据库

使用 Docker 启动本地 PostgreSQL：

```bash
docker-compose up -d
```

### 2.2 生产环境数据库 (Railway)

1. 登录 [Railway](https://railway.app)
2. 创建新项目
3. 添加 PostgreSQL 服务
4. 复制数据库连接字符串到后端环境变量

## 3. 后端部署 (Railway)

### 3.1 准备工作

1. 确保代码已推送到 GitHub 仓库
2. 在 Railway 创建新应用
3. 连接 GitHub 仓库

### 3.2 Railway 配置

在 Railway 控制台设置环境变量：

```env
# 数据库
DATABASE_URL=postgresql://username:password@host:port/database

# JWT
JWT_SECRET=your-production-jwt-secret
JWT_EXPIRES_IN=7d

# 端口 (Railway 会自动分配)
PORT=3001

# CORS
FRONTEND_URL=https://your-frontend.vercel.app

# Node 环境
NODE_ENV=production
```

### 3.3 部署脚本

在 `backend/package.json` 中添加部署脚本：

```json
{
  "scripts": {
    "start:prod": "node dist/main",
    "railway:build": "npm run build",
    "railway:start": "npm run start:prod"
  }
}
```

### 3.4 Railway 部署配置

创建 `railway.json` 文件：

```json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "backend/Dockerfile"
  },
  "deploy": {
    "startCommand": "npm run start:prod",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 3.5 Dockerfile (后端)

创建 `backend/Dockerfile`：

```dockerfile
# 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

# 复制 package 文件
COPY package*.json ./
RUN npm ci --only=production

# 复制源代码
COPY . .

# 生成 Prisma 客户端
RUN npx prisma generate

# 构建应用
RUN npm run build

# 生产阶段
FROM node:20-alpine AS production

WORKDIR /app

# 复制依赖
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# 安装 Prisma CLI
RUN npm install -g prisma

# 暴露端口
EXPOSE 3001

# 运行迁移和启动应用
CMD prisma migrate deploy && npm run start:prod
```

### 3.6 健康检查端点

在 `backend/src/app.controller.ts` 添加健康检查：

```typescript
@Get('health')
getHealth(): object {
  return { status: 'ok', timestamp: new Date().toISOString() };
}
```

## 4. 前端部署 (Vercel)

### 4.1 Vercel 配置

创建 `frontend/vercel.json`：

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["hkg1"],
  "env": {
    "NEXT_PUBLIC_API_URL": "@next_public_api_url"
  }
}
```

### 4.2 环境变量配置

在 Vercel 控制台设置环境变量：

```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
NEXT_PUBLIC_APP_URL=https://your-frontend.vercel.app
```

### 4.3 构建优化

在 `frontend/next.config.ts` 中配置：

```typescript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['your-backend.railway.app'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  // 生产环境优化
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
}

module.exports = nextConfig
```

## 5. 自动化部署 (GitHub Actions)

### 5.1 前端自动部署

创建 `.github/workflows/deploy-frontend.yml`：

```yaml
name: Deploy Frontend to Vercel

on:
  push:
    branches: [main]
    paths:
      - 'frontend/**'

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      
      - name: Install Vercel CLI
        run: npm install -g vercel
      
      - name: Deploy to Vercel
        run: |
          cd frontend
          vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
```

### 5.2 后端自动部署

Railway 会自动部署 GitHub 推送的代码，无需额外配置。

## 6. 部署后检查清单

### 6.1 数据库检查
- [ ] 数据库连接正常
- [ ] 表结构已创建
- [ ] 初始数据已插入

### 6.2 后端检查
- [ ] 健康检查端点正常 (`/health`)
- [ ] API 文档可访问 (`/api`)
- [ ] CORS 配置正确
- [ ] JWT 密钥已更新为生产环境密钥

### 6.3 前端检查
- [ ] 页面加载正常
- [ ] API 调用成功
- [ ] 图片加载正常
- [ ] 响应式设计正常

### 6.4 功能测试
- [ ] 用户注册/登录
- [ ] 文章发布/编辑
- [ ] 评论功能
- [ ] 分类和标签功能

## 7. 监控和日志

### 7.1 Railway 日志
- 在 Railway 控制台查看实时日志
- 设置日志告警

### 7.2 Vercel 分析
- 启用 Vercel Analytics
- 监控 Core Web Vitals

## 8. 备份策略

### 8.1 数据库备份
- Railway PostgreSQL 自动备份
- 定期导出数据快照

### 8.2 代码备份
- GitHub 仓库多分支保护
- 定期创建发布标签

## 9. 安全建议

1. **环境变量安全**
   - 使用强密码和密钥
   - 定期轮换密钥
   - 不在代码中硬编码敏感信息

2. **HTTPS 配置**
   - Vercel 自动提供 HTTPS
   - Railway 需要配置自定义域名和 SSL

3. **访问控制**
   - 配置防火墙规则
   - 限制数据库访问
   - 使用强密码策略

## 10. 故障排除

### 10.1 常见问题

**数据库连接失败**
- 检查 DATABASE_URL 格式
- 确认数据库服务运行正常
- 检查网络连接

**CORS 错误**
- 确认 FRONTEND_URL 配置正确
- 检查后端 CORS 中间件配置

**构建失败**
- 检查 Node.js 版本兼容性
- 确认依赖包版本
- 清理缓存重新构建

### 10.2 日志查看

```bash
# Railway 日志
railway logs

# Vercel 构建日志
vercel logs [deployment-url]
```

## 11. 性能优化

### 11.1 前端优化
- 启用图片优化
- 使用 CDN
- 代码分割和懒加载

### 11.2 后端优化
- 数据库索引优化
- Redis 缓存
- API 响应压缩

## 12. 扩展配置

### 12.1 自定义域名
- Vercel: 在控制台添加自定义域名
- Railway: 配置域名和 SSL 证书

### 12.2 CDN 配置
- 使用 Cloudflare 作为 CDN
- 配置缓存策略

---

完成以上步骤后，你的个人博客项目就成功部署到生产环境了。记得定期检查日志和性能指标，确保应用稳定运行。