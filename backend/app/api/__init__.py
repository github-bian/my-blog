from flask import Blueprint


def create_api_v1_blueprint() -> Blueprint:
    """
    创建 API v1 蓝图（Blueprint）。

    Blueprint 的作用：
    - 把路由按领域拆分到多个文件（auth/users/posts...），避免一个文件越写越大
    - 给整组路由统一加前缀（本项目统一是 /api/v1）
    """
    api_v1 = Blueprint("api_v1", __name__, url_prefix="/api/v1")

    # 延迟导入：避免循环依赖（蓝图创建时才导入各子模块）
    from .auth import auth_bp
    from .errors import errors_bp
    from .posts import posts_bp
    from .system import system_bp
    from .users import users_bp
    from .comments import comments_bp
    from .categories import categories_bp
    from .tags import tags_bp

    # 先注册错误处理蓝图：这样更容易保证异常都能被统一格式化成 JSON
    api_v1.register_blueprint(errors_bp)
    api_v1.register_blueprint(auth_bp)
    api_v1.register_blueprint(users_bp)
    api_v1.register_blueprint(posts_bp)
    api_v1.register_blueprint(system_bp)
    api_v1.register_blueprint(comments_bp)
    api_v1.register_blueprint(categories_bp)
    api_v1.register_blueprint(tags_bp)
    return api_v1
