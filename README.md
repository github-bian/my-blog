# 个人博客系统 (全栈学习项目)

这是一个用于学习前后端全栈开发的项目。

## 技术栈

- **前端**: React 19, Vite, Tailwind CSS, Framer Motion, Zustand, WangEditor
- **后端**: Python 3, Flask, SQLAlchemy, JWT, MySQL, Redis

## 快速开始

### 1. 启动数据库环境 (MySQL + Redis)

如果你安装了 Docker，可以直接运行以下命令启动数据库：

```bash
docker-compose up -d
```

### 2. 运行后端 (Flask)

```bash
cd backend
# 激活虚拟环境
source venv/bin/activate
# 安装依赖
pip install -r requirements.txt
# 运行服务
python run.py
```
*后端将运行在 `http://localhost:5000`*

### 3. 运行前端 (React)

打开一个新的终端：

```bash
cd frontend
# 安装依赖
npm install --legacy-peer-deps
# 启动开发服务器
npm run dev
```
*前端将运行在 `http://localhost:5173`*

## 功能清单
- [x] 毛玻璃炫酷 UI 和动画效果 (Framer Motion)
- [x] 用户注册与登录 (JWT 认证)
- [x] 文章列表与分类
- [x] 文章详情展示 (包含浏览量统计)
- [x] 富文本编辑器发布文章 (WangEditor)
