from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

# 这些是 Flask 的“扩展对象”（全局只创建一次）。
#
# 为什么放在单独的文件？
# - 防止循环导入：模型/路由/应用工厂都可能需要 db/jwt 等对象
# - 便于测试：测试时可以创建 app，然后统一 init_app 绑定
# - 结构清晰：create_app 只负责“把扩展绑定到 app”，扩展对象本身在这里集中管理
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
cors = CORS()
