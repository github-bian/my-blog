# 博客项目部署指南

## 目录

1. [项目架构概览](#1-项目架构概览)
2. [服务器环境说明](#2-服务器环境说明)
3. [SSH 连接服务器](#3-ssh-连接服务器)
4. [手动部署步骤](#4-手动部署步骤)
5. [CI/CD 自动部署](#5-cicd-自动部署)
6. [常见问题排查](#6-常见问题排查)

---

## 1. 项目架构概览

```
┌─────────────────────────────────────────────────┐
│                   Nginx (端口 80)                │
│              前端静态资源 + 反向代理               │
├─────────────┬──────────────┬────────────────────┤
│  /api/v1/*  │  /collab/*   │    其他 (前端 SPA)   │
│     ↓       │      ↓       │        ↓            │
│  Flask API  │  Collab Yjs  │   React 静态文件     │
│  (5000)     │  (4444)      │   (Vite 构建)       │
├─────────────┴──────────────┴────────────────────┤
│            MySQL 8.0  +  Redis 7                 │
└─────────────────────────────────────────────────┘
```

**5 个 Docker 容器：**

| 服务 | 容器名 | 作用 | 端口 |
|------|--------|------|------|
| **nginx** | blog_nginx | 前端页面 + 反向代理 | 80 (对外) |
| **backend** | blog_backend | Flask REST API | 5000 (内部) |
| **collab** | blog_collab | Yjs 协作编辑 WebSocket | 4444 (内部) |
| **mysql** | blog_mysql | 数据库 | 3306 (内部) |
| **redis** | blog_redis | 缓存 | 6379 (内部) |

---

## 2. 服务器环境说明

**服务器信息：**
- IP: `47.116.213.118`（阿里云 ECS）
- 操作系统: Alibaba Cloud Linux
- 用户: `root`
- 项目目录: `/opt/blog`

**已安装的环境：**
- **Docker**: 容器运行引擎，所有服务都跑在容器里
- **Docker Compose**: 多容器编排工具

> 服务器上不需要单独安装 Python、Node.js、MySQL、Redis。
> 这些都在 Docker 容器内，由 Dockerfile 定义。

### 为什么用 Docker？

传统部署需要在服务器上安装 Python、Node.js、MySQL、Redis 等，版本冲突、依赖缺失很常见。
Docker 把每个服务打包成独立容器，**一个 `docker compose up` 命令就能启动所有服务**，环境一致，不怕冲突。

---

## 3. SSH 连接服务器

### 3.1 正确的 SSH 命令

```bash
# ❌ 错误写法（会用本地用户名 tiiny123 去连接，权限被拒绝）
ssh 47.116.213.118

# ✅ 正确写法（指定用户名 root）
ssh root@47.116.213.118
```

**解释：** `ssh 47.116.213.118` 不指定用户名时，SSH 默认使用本地 Mac 的用户名 `tiiny123` 去连接。
服务器上没有 `tiiny123` 这个用户（或密码不匹配），所以会一直报 `Permission denied`。

### 3.2 连接流程

```bash
# 1. 连接服务器
ssh root@47.116.213.118
# 输入密码: Bian2580@

# 2. 连接成功后进入服务器终端
[root@ixxxxxxx ~]#

# 3. 查看项目
cd /opt/blog
ls -la

# 4. 查看容器运行状态
docker compose -f docker-compose.prod.yml ps

# 5. 退出服务器
exit
```

### 3.3 配置 SSH 快捷方式（可选）

编辑 `~/.ssh/config` 文件，添加：

```
Host myblog
    HostName 47.116.213.118
    User root
```

之后只需要 `ssh myblog` 就能连接。

---

## 4. 手动部署步骤

### 4.1 前提条件（本地 Mac 上）

```bash
# 需要安装 sshpass（用于脚本自动输入密码）
brew install sshpass
```

### 4.2 一键部署（推荐）

```bash
cd /Users/tiiny123/Desktop/03-项目/project/python

# 运行部署脚本（需要传入服务器密码）
SERVER_PASS='Bian2580@' bash deploy/deploy.sh
```

脚本自动执行以下5步：
1. SSH 连服务器，创建 `/opt/blog` 目录
2. rsync 同步代码文件到服务器
3. 复制 `.env.production` 到服务器作为 `.env`
4. 在服务器上 `docker compose build` 构建镜像 + `docker compose up -d` 启动容器
5. 健康检查

### 4.3 手动逐步部署

如果你想理解每一步在做什么：

#### 步骤 1：上传代码到服务器

```bash
# 在本地项目根目录执行
rsync -avz --progress \
  --exclude='node_modules' \
  --exclude='.venv' \
  --exclude='__pycache__' \
  --exclude='.git' \
  --exclude='instance' \
  -e "ssh" \
  ./ root@47.116.213.118:/opt/blog/
```

> `rsync` 是增量同步工具，只传输有变化的文件，比 `scp` 快。

#### 步骤 2：复制环境变量

```bash
scp deploy/.env.production root@47.116.213.118:/opt/blog/.env
```

> `.env` 文件包含数据库密码、JWT 密钥等敏感信息。

#### 步骤 3：SSH 到服务器构建和启动

```bash
# 连接服务器
ssh root@47.116.213.118

# 进入项目目录
cd /opt/blog

# 查看 .env 是否存在
cat .env

# 构建所有 Docker 镜像
docker compose -f docker-compose.prod.yml build

# 启动所有容器（后台运行）
docker compose -f docker-compose.prod.yml up -d

# 查看容器状态（应该全部 Up）
docker compose -f docker-compose.prod.yml ps

# 查看后端日志
docker logs blog_backend

# 查看 nginx 日志
docker logs blog_nginx
```

#### 步骤 4：验证

```bash
# 在本地浏览器访问
# 前端: http://47.116.213.118
# API:  http://47.116.213.118/api/v1/health
```

---

## 5. CI/CD 自动部署

### 5.1 工作原理

```
本地 git push → GitHub 仓库 → GitHub Actions 触发 → 自动部署到服务器
```

**流程图：**
```
┌──────────┐     ┌────────────┐     ┌────────────────┐     ┌──────────────┐
│ 本地开发  │────→│ git push   │────→│ GitHub Actions │────→│ 远程服务器    │
│ 修改代码  │     │ 到 pro分支  │     │ 自动运行       │     │ 构建+重启容器 │
└──────────┘     └────────────┘     └────────────────┘     └──────────────┘
```

### 5.2 配置位置

- **Workflow 文件**: `.github/workflows/deploy.yml`
- **GitHub Secrets**: https://github.com/github-bian/my-blog/settings/secrets/actions
  - `SERVER_IP` = `47.116.213.118`
  - `SERVER_USER` = `root`
  - `SERVER_PASSWORD` = `Bian2580@`

### 5.3 触发条件

推送到 `main` 或 `pro` 分支时自动触发。

### 5.4 日常使用

```bash
# 1. 修改代码
# 2. 提交
git add -A
git commit -m "feat: 新功能描述"

# 3. 推送（自动触发部署）
git push origin pro

# 4. 在 GitHub Actions 页面查看进度
# https://github.com/github-bian/my-blog/actions
```

### 5.5 workflow 做了什么

| 步骤 | 说明 |
|------|------|
| Checkout code | GitHub 拉取你的最新代码 |
| Deploy via SSH | 连接服务器，创建项目目录 |
| Sync files to server | 将代码文件传输到服务器 `/opt/blog` |
| Copy env & build & start | 复制环境变量 → 构建 Docker → 启动容器 |

---

## 6. 常见问题排查

### Q: SSH 连接提示 Permission denied

```bash
# ❌ 错误
ssh 47.116.213.118          # 用的是本机用户名 tiiny123

# ✅ 正确
ssh root@47.116.213.118     # 明确指定用户名 root
```

### Q: 容器启动了但网站打不开

```bash
# 1. 先检查容器是否都在运行
ssh root@47.116.213.118
cd /opt/blog
docker compose -f docker-compose.prod.yml ps

# 2. 查看有问题的容器日志
docker logs blog_backend    # 后端
docker logs blog_nginx      # nginx
docker logs blog_mysql      # 数据库

# 3. 检查阿里云安全组是否开放了 80 端口
# 登录阿里云控制台 → ECS → 安全组 → 确认入方向有 80/TCP 规则
```

### Q: 后端 API 报错 502

```bash
# 502 说明 nginx 无法连接到后端，通常是后端容器挂了
docker logs blog_backend
# 看具体报错

# 重启后端
docker compose -f docker-compose.prod.yml restart backend
```

### Q: Docker 构建失败（网络问题）

服务器在国内，拉取国外源会超时。项目中已配置：
- **apt**: 阿里云镜像（`backend/Dockerfile` 中 `sed` 替换源）
- **pip**: 阿里云 PyPI（`pip install -i https://mirrors.aliyun.com/pypi/simple/`）
- **npm**: npmmirror（`npm config set registry https://registry.npmmirror.com`）

### Q: 数据库数据丢失

MySQL 数据存储在 Docker Volume `mysql_data` 中，**重启容器不会丢失数据**。
只有执行 `docker volume rm` 才会删除数据。

```bash
# 查看 volume
docker volume ls

# ⚠️ 危险操作 - 删除所有数据
# docker volume rm blog_mysql_data
```

### Q: 如何只重启某个服务

```bash
cd /opt/blog

# 重启单个服务
docker compose -f docker-compose.prod.yml restart backend
docker compose -f docker-compose.prod.yml restart nginx

# 重建单个服务（代码更新后）
docker compose -f docker-compose.prod.yml up -d --build backend
```

---

## 7. 关键文件说明

| 文件 | 作用 |
|------|------|
| `docker-compose.prod.yml` | 生产环境容器编排配置 |
| `backend/Dockerfile` | 后端 Flask 镜像构建 |
| `deploy/Dockerfile.frontend` | 前端构建 + Nginx 镜像 |
| `deploy/Dockerfile.collab` | 协作服务器镜像 |
| `deploy/nginx.conf` | Nginx 反向代理配置 |
| `deploy/.env.production` | 生产环境变量（数据库密码等） |
| `deploy/deploy.sh` | 本地一键部署脚本 |
| `.github/workflows/deploy.yml` | CI/CD 自动部署配置 |
