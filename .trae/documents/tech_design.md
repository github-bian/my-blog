# 技术架构设计文档

## 1. 系统架构
本项目采用前后端分离的架构模式。

- **前端 (Frontend)**: Next.js 14 (App Router)
  - 负责页面渲染 (SSR/SSG)、用户交互、路由管理。
  - 通过 RESTful API 与后端通信。
- **后端 (Backend)**: Nest.js
  - 负责业务逻辑、数据持久化、权限验证。
  - 提供 RESTful API 接口。
- **数据库 (Database)**: PostgreSQL
  - 存储用户、文章、评论等核心数据。
- **缓存 (Cache)**: Redis (可选)
  - 用于 Session 存储或热点数据缓存。

## 2. 数据库设计 (Prisma Schema 草稿)

```prisma
// 用户模型
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String   // 加密存储
  name      String?
  role      Role     @default(VISITOR)
  posts     Post[]
  comments  Comment[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum Role {
  VISITOR
  ADMIN
}

// 文章模型
model Post {
  id          String    @id @default(uuid())
  title       String
  slug        String    @unique
  content     String    // Markdown 内容
  summary     String?
  published   Boolean   @default(false)
  viewCount   Int       @default(0)
  author      User      @relation(fields: [authorId], references: [id])
  authorId    String
  category    Category? @relation(fields: [categoryId], references: [id])
  categoryId  String?
  tags        Tag[]
  comments    Comment[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

// 分类模型
model Category {
  id        String   @id @default(uuid())
  name      String   @unique
  slug      String   @unique
  posts     Post[]
}

// 标签模型
model Tag {
  id        String   @id @default(uuid())
  name      String   @unique
  slug      String   @unique
  posts     Post[]
}

// 评论模型
model Comment {
  id        String   @id @default(uuid())
  content   String
  post      Post     @relation(fields: [postId], references: [id])
  postId    String
  author    User?    @relation(fields: [authorId], references: [id]) // 注册用户或匿名信息
  authorId  String?
  guestName String?  // 匿名用户昵称
  guestEmail String? // 匿名用户邮箱
  status    CommentStatus @default(PENDING)
  createdAt DateTime @default(now())
}

enum CommentStatus {
  PENDING
  APPROVED
  REJECTED
}
```

## 3. API 接口设计 (RESTful)

### 认证 (Auth)
- `POST /auth/register`: 用户注册 (仅限初期或管理员邀请)
- `POST /auth/login`: 用户登录 (返回 JWT)
- `GET /auth/profile`: 获取当前用户信息

### 文章 (Posts)
- `GET /posts`: 获取文章列表 (支持分页、筛选)
- `GET /posts/:slug`: 获取文章详情
- `POST /posts`: 创建文章 (Admin)
- `PATCH /posts/:id`: 更新文章 (Admin)
- `DELETE /posts/:id`: 删除文章 (Admin)

### 分类与标签 (Categories & Tags)
- `GET /categories`: 获取所有分类
- `GET /tags`: 获取所有标签
- `POST /categories`: 创建分类 (Admin)
- `POST /tags`: 创建标签 (Admin)

### 评论 (Comments)
- `GET /posts/:postId/comments`: 获取某文章的评论
- `POST /comments`: 发表评论
- `PATCH /comments/:id/status`: 审核评论 (Admin)

## 4. 目录结构规划

```
/
├── frontend/          # Next.js 项目
│   ├── src/
│   │   ├── app/       # App Router 页面
│   │   ├── components/# UI 组件
│   │   ├── lib/       # 工具函数
│   │   └── types/     # 类型定义
│   ├── public/
│   └── ...
├── backend/           # Nest.js 项目
│   ├── src/
│   │   ├── modules/   # 业务模块 (Auth, Posts, etc.)
│   │   ├── common/    # 通用拦截器、过滤器
│   │   └── prisma/    # 数据库服务
│   ├── test/
│   └── ...
└── ...
```
