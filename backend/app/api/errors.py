from flask import Blueprint, current_app, jsonify
from werkzeug.exceptions import HTTPException

# 错误处理蓝图：统一把错误转成 JSON，前端就能统一按一个格式处理
errors_bp = Blueprint("errors", __name__)


@errors_bp.app_errorhandler(HTTPException)
def handle_http_exception(err: HTTPException):
    """
    处理 Flask/Werkzeug 内置的 HTTPException。

    例如你在路由里写 abort(404, description="xxx")，
    就会被这里捕获并转成 JSON。
    """
    response = err.get_response()
    response.data = jsonify(
        {
            "error": {
                "code": err.code,
                "name": err.name,
                "message": err.description,
            }
        }
    ).data
    response.content_type = "application/json"
    return response


@errors_bp.app_errorhandler(Exception)
def handle_exception(err: Exception):
    """
    处理“未知异常”（代码 bug、数据库异常等）。

    学习阶段（debug=True）我们希望看到完整调试页面，所以直接 re-raise；
    生产环境才会吞掉细节，只返回通用 500，并把堆栈记录到日志里。
    """
    if current_app.debug or current_app.testing:
        raise err
    current_app.logger.exception("Unhandled error")
    return (
        jsonify(
            {
                "error": {
                    "code": 500,
                    "name": "Internal Server Error",
                    "message": "Unexpected error",
                }
            }
        ),
        500,
    )
