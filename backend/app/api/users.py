"""
用户相关接口

本模块提供用户信息的查询功能，包括：
- 获取当前登录用户信息
- 获取用户列表（管理员）
- 获取指定用户详情（公开）

学习要点：
1. 权限控制（管理员 vs 普通用户）
2. 用户信息的脱敏（公开接口不返回敏感信息）
3. RESTful 风格的 URL 设计
"""

from flask import Blueprint, abort, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..extensions import db
from ..models import User

# 用户相关接口统一挂在 /api/v1/users 下
users_bp = Blueprint("users", __name__, url_prefix="/users")


@users_bp.get("/me")
@jwt_required()
def me():
    """
    获取当前登录用户信息

    @jwt_required() 的作用：
    - 要求请求头里携带 Authorization: Bearer <token>
    - token 合法才允许进入函数体

    返回：
    {
        "user": {
            "id": 1,
            "email": "user@example.com",
            "displayName": "用户",
            "role": "user",
            "isVerified": false,
            "avatarUrl": null,
            "createdAt": "2023-01-01T00:00:00+00:00"
        }
    }
    """
    # get_jwt_identity() 会取出创建 token 时传入的 identity（本项目是 user.id）
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        abort(404, description="User not found")
    return jsonify({"user": user.to_public_dict()})


@users_bp.put("/me")
@jwt_required()
def update_me():
    """更新当前登录用户的个人资料"""
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        abort(404, description="User not found")

    data = request.get_json(silent=True) or {}

    display_name = data.get("displayName")
    if display_name is not None:
        display_name = str(display_name).strip()
        if not display_name or len(display_name) > 30:
            abort(400, description="用户名不能为空且不超过 30 个字符")
        user.display_name = display_name

    avatar_url = data.get("avatarUrl")
    if avatar_url is not None:
        user.avatar_url = str(avatar_url)[:2048] if avatar_url else None

    db.session.commit()
    return jsonify({"user": user.to_public_dict()})


@users_bp.get("")
@jwt_required()
def list_users():
    """
    获取用户列表（仅管理员）

    权限控制：
    - 只有管理员（role='admin'）可以查看用户列表
    - 普通用户会返回 403 Forbidden

    支持分页：
    - limit: 每页条数（最大50）
    - offset: 偏移量

    返回：
    {
        "items": [
            {
                "id": 1,
                "email": "user@example.com",
                "displayName": "用户",
                "role": "user",
                "isVerified": false,
                "avatarUrl": null,
                "createdAt": "2023-01-01T00:00:00+00:00"
            }
        ],
        "total": 10
    }
    """
    # 检查权限
    user_id = int(get_jwt_identity())
    current_user = User.query.get(user_id)
    if not current_user or current_user.role != "admin":
        abort(403, description="Admin privileges required")

    # 分页参数
    from flask import request

    try:
        limit = min(int(request.args.get("limit", 20)), 50)
        offset = max(int(request.args.get("offset", 0)), 0)
    except ValueError:
        abort(400, description="Invalid pagination")

    # 查询用户列表，按创建时间倒序
    q = User.query.order_by(User.created_at.desc())
    total = q.count()
    items = q.offset(offset).limit(limit).all()

    return jsonify({"items": [user.to_public_dict() for user in items], "total": total})


@users_bp.get("/<int:user_id>")
def get_user(user_id: int):
    """
    获取指定用户详情（公开接口）

    注意：公开接口只返回脱敏后的用户信息（不包含邮箱等敏感信息）。
    """
    user = User.query.get(user_id)
    if not user:
        abort(404, description="User not found")

    # 返回公开信息（不包含邮箱）
    user_data = user.to_public_dict()
    # 移除邮箱（公开接口不展示邮箱）
    if "email" in user_data:
        del user_data["email"]

    return jsonify({"user": user_data})
