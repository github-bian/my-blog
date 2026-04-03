# BianBlog 部署说明

本文档对应当前仓库的 BianBlog 替换方案，目标是：

- 本地可预览前台和后台
- 可部署到 Linux + Docker Compose + 域名
- 保留旧系统文件用于回退，但不再作为默认运行方式

## 1. 本地启动

在项目根目录执行：

```bash
docker compose up -d
```

默认访问地址：

- 前台: http://localhost:8080
- 后台初始化: http://localhost:8080/admin/init

检查容器状态：

```bash
docker compose ps
docker compose logs -f bianblog
```

## 2. 初始化

首次启动后，必须访问初始化页面：

- http://localhost:8080/admin/init

按页面指引完成：

1. 管理员账号
2. 站点基础信息
3. 可选高级设置
4. 可选布局设置

初始化完成后可在后台发布测试文章，验证前台显示。

## 3. 生产部署

### 3.1 准备环境变量

编辑 `deploy/.env.production`：

```env
BIANBLOG_EMAIL=admin@example.com
BIANBLOG_HTTP_PORT=80
BIANBLOG_HTTPS_PORT=443
TZ=Asia/Shanghai
```

### 3.2 执行部署脚本

在本地执行：

```bash
SERVER_PASS='你的服务器密码' bash deploy/deploy.sh
```

脚本会自动：

1. 上传项目到远端 `/opt/blog`
2. 复制 `deploy/.env.production` 到远端 `.env`
3. 启动 `docker-compose.prod.yml`
4. 验证前台和后台初始化地址可访问

## 4. 域名与反代

- 若直接用 BianBlog 自带 Caddy，建议直接映射 80/443。
- 若你有外层 Nginx，只需反代 BianBlog 对外的 HTTP 端口。
- 反代示例见 `deploy/nginx.conf`。

## 5. 数据与备份

BianBlog 持久化目录：

- `bianblog-runtime/data/static`：静态文件/图床
- `bianblog-runtime/data/mongo`：MongoDB 数据
- `bianblog-runtime/log`：日志
- `bianblog-runtime/caddy`：证书和 Caddy 数据

建议在生产环境定期备份整个 `bianblog-runtime` 目录。

## 6. 旧系统回退

以下文件保留了旧栈编排，仅用于回退或参考：

- `docker-compose.legacy.yml`
- `docker-compose.prod.legacy.yml`

默认不再使用旧栈启动。
