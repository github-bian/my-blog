已完成博客网站的后端搭建和数据库配置。以下是详细步骤和结果：
一、环境准备
1. Python 已安装：Python 3.9.6
2. MySQL 已安装：通过 Homebrew 安装 MySQL 9.6.0_2
3. MySQL 服务已启动：运行在 localhost:3306
4. 数据库已创建：personal_homepage（使用 utf8mb4 字符集）
二、数据库配置
修改了 .env 文件，配置 MySQL 连接：
DATABASE_URL=mysql+pymysql://root:bian1234@127.0.0.1:3306/personal_homepage?charset=utf8mb4
三、数据库迁移
1. 生成迁移脚本：flask db migrate -m "initial migration"
2. 应用迁移：flask db upgrade
3. 已创建以下表：
   - users（用户表）
   - posts（文章表）
   - categories（分类表）
   - tags（标签表）
   - post_tags（文章-标签关联表）
   - comments（评论表）
   - alembic_version（Alembic 版本表）
四、应用启动
1. 端口：5001（避免与 AirPlay Receiver 冲突）
2. 启动命令：
      cd backend && DATABASE_URL="mysql+pymysql://root:bian1234@127.0.0.1:3306/personal_homepage?charset=utf8mb4" PORT=5001 nohup python3 manage.py > flask.log 2>&1 &
   3. 健康检查：curl http://localhost:5001/health 返回 {"ok":true}
五、API 测试结果
1. 用户注册
curl -X POST http://localhost:5001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123", "displayName": "测试用户"}'
✅ 成功返回 JWT token 和用户信息
2. 文章列表
curl -s http://localhost:5001/api/v1/posts
✅ 成功返回 4 篇文章数据（来自 MySQL 数据库）
六、可用 API 端点
认证相关
- POST /api/v1/auth/register - 用户注册
- POST /api/v1/auth/login - 用户登录
用户相关
- GET /api/v1/users/me - 当前用户信息（需 token）
- GET /api/v1/users - 用户列表（管理员）
- GET /api/v1/users/<user_id> - 用户详情
文章相关
- GET /api/v1/posts - 文章列表（支持筛选）
- POST /api/v1/posts - 创建文章（需 token）
- GET /api/v1/posts/<post_id> - 文章详情
- PUT /api/v1/posts/<post_id> - 更新文章（需 token）
- DELETE /api/v1/posts/<post_id> - 删除文章（需 token）
- POST /api/v1/posts/<post_id>/like - 点赞文章
- GET /api/v1/posts/search?q=关键词 - 搜索文章
评论相关
- GET /api/v1/comments/post/<post_id> - 文章评论列表
- POST /api/v1/comments/post/<post_id> - 发表评论（需 token）
- PUT /api/v1/comments/<comment_id> - 更新评论（需 token）
- DELETE /api/v1/comments/<comment_id> - 删除评论（需 token）
- POST /api/v1/comments/<comment_id>/like - 点赞评论
分类相关
- GET /api/v1/categories - 分类列表
- POST /api/v1/categories - 创建分类（管理员）
- GET /api/v1/categories/<category_id> - 分类详情
- PUT /api/v1/categories/<category_id> - 更新分类（管理员）
- DELETE /api/v1/categories/<category_id> - 删除分类（管理员）
- GET /api/v1/categories/<category_id>/posts - 分类下的文章
标签相关
- GET /api/v1/tags - 标签列表
- POST /api/v1/tags - 创建标签
- GET /api/v1/tags/<tag_id> - 标签详情
- PUT /api/v1/tags/<tag_id> - 更新标签（管理员）
- DELETE /api/v1/tags/<tag_id> - 删除标签（管理员）
- GET /api/v1/tags/<tag_id>/posts - 标签下的文章
系统相关
- GET /api/v1/system/stats - 系统统计
- GET /api/v1/system/db - 数据库信息
七、访问方式
- API 地址：http://localhost:5001/api/v1/
- 健康检查：http://localhost:5001/health
- Swagger 文档：http://localhost:5001/docs（如果已配置）
八、学习建议
1. 从简单接口开始：先测试 /health、/api/v1/posts 等公开接口
2. 使用 Postman 或 curl：测试所有 CRUD 操作
3. 阅读代码注释：所有代码都有详细的中文注释，解释了：
   - RESTful API 设计原则
   - 权限控制（JWT、角色权限）
   - 数据库查询（SQLAlchemy ORM）
   - 错误处理
   - 分页查询
   - 多对多关系处理
4. 修改和扩展：尝试添加新字段、新接口，观察数据库变化
九、生产环境建议
1. 使用 gunicorn：替换 Flask 开发服务器
2. 配置 nginx：作为反向代理
3. 设置环境变量：使用生产数据库密码
4. 启用 HTTPS：使用 Let's Encrypt
5. 监控和日志：配置日志收集和性能监控
现在你有了一个完整的博客后端，可以开始学习接口设计、数据库操作和业务逻辑实现了！