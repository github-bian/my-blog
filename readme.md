# BianBlog 替换模式

本仓库已切换为「BianBlog 优先运行」模式。

## 当前结构说明

- `bianblog/`：BianBlog 上游源码（用于后续二次开发参考）
- `docker-compose.yml`：本地预览默认编排（BianBlog + Mongo）
- `docker-compose.prod.yml`：服务器部署编排（BianBlog + Mongo）
- `docker-compose.legacy.yml`：旧项目开发编排备份
- `docker-compose.prod.legacy.yml`：旧项目生产编排备份

## 快速开始（本地预览）

1. 启动服务

```bash
docker compose up -d
```

2. 访问地址

- 前台: `http://localhost:8080`
- 后台初始化: `http://localhost:8080/admin/init`

## 本地源码开发端口（当前工作区）

当你使用 `vanblog/packages/*` 的 `pnpm dev` 方式本地调试时，端口如下：

- 后端 API: `http://localhost:3100`
- 前台: `http://localhost:3001`
- 管理后台: `http://localhost:3002/admin/user/login`

当前本地初始化的管理员账号：

- 用户名: `admin`
- 密码: `Admin@123456`

3. 初始化完成后

- 使用你在初始化时创建的管理员账号登录后台
- 发布一篇测试文章，确认前台可见

## 常用命令

```bash
# 查看容器状态
docker compose ps

# 查看日志
docker compose logs -f bianblog

# 停止
docker compose down
```

## 本地目录映射

- `./bianblog-runtime/data/static`：图床与静态资源
- `./bianblog-runtime/data/mongo`：MongoDB 数据
- `./bianblog-runtime/log`：运行日志
- `./bianblog-runtime/caddy`：证书和 Caddy 配置

## 服务器部署（Linux + 域名）

1. 设置环境变量（建议在部署机的 shell 或 `.env`）

```bash
export BIANBLOG_EMAIL="you@example.com"
export BIANBLOG_HTTP_PORT=80
export BIANBLOG_HTTPS_PORT=443
```

2. 启动生产编排

```bash
docker compose -f docker-compose.prod.yml up -d
```

3. 完成初始化

- `https://你的域名/admin/init`（若直连 80/443 且域名解析正确，BianBlog 会按文档自动申请证书）

## 说明

- 当前阶段先完成 BianBlog 跑通，不迁移旧系统历史数据。
- 旧项目代码仍在 `backend/`、`frontend/`，可随时回退参考。
- 如需外层 Nginx 反代，仅反代 BianBlog 映射出的 HTTP 端口即可。