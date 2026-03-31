# 后端（Flask）开发与迁移

## 运行后端（本机 MySQL 3306）

1. 确保 `backend/.env` 已配置 MySQL 连接信息（不要把真实密码提交到仓库）
2. 启动后端：

```bash
cd backend
PORT=5005 FLASK_DEBUG=1 python3 manage.py
```

检查当前后端实际连接的数据库（脱敏）：

```bash
curl http://localhost:5005/api/v1/system/db
```

## 数据库迁移（Flask-Migrate / Alembic）

本项目已经接入 Flask-Migrate（见 [extensions.py](file:///Users/tiiny123/Desktop/03-%E9%A1%B9%E7%9B%AE/project/python/backend/app/extensions.py) 与 [__init__.py](file:///Users/tiiny123/Desktop/03-%E9%A1%B9%E7%9B%AE/project/python/backend/app/__init__.py)）。

> 由于部分环境里找不到 `flask` 命令，建议统一使用 `python3 -m flask ...`。

### 迁移基线（已完成）

- 迁移目录：`backend/migrations/`
- 基线版本：`0001_baseline`

基线的作用：让 Alembic “知道你当前数据库结构处于哪个版本”，从此以后每次改模型都用 migration 管理，避免“模型变了表没变”。

### 日常迁移流程（改表时）

1. 修改 SQLAlchemy 模型（例如 [models.py](file:///Users/tiiny123/Desktop/03-%E9%A1%B9%E7%9B%AE/project/python/backend/app/models.py)）
2. 生成迁移脚本：

```bash
cd backend
export FLASK_APP=manage:app
python3 -m flask db migrate -m "add_xxx"
```

3. 应用迁移到数据库：

```bash
python3 -m flask db upgrade
```

### 常用命令

```bash
# 查看当前数据库处于哪个迁移版本
python3 -m flask db current

# 查看迁移历史
python3 -m flask db history
```

## 重要约定

- 生产环境务必使用迁移（`flask db upgrade`），不要依赖 `db.create_all()`。
- `.env` 只用于本机开发，仓库内只保留 `.env.example`（示例不应包含真实密码/密钥）。

