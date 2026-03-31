from flask import Blueprint, abort, jsonify, request
from flask_jwt_extended import create_access_token
from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models import User

# 鉴权相关接口统一挂在 /api/v1/auth 下
auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


@auth_bp.post("/register")
def register():
    """
    注册接口：
    1) 读取 JSON body
    2) 做一些最基础的参数校验（真实项目建议更完整，例如邮箱格式、密码强度等）
    3) 创建用户并写入数据库
    4) 成功后签发 JWT，前端拿到 token 后即可访问受保护接口
    """
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""
    display_name = (payload.get("displayName") or "").strip()

    # abort 会抛出 HTTPException，交给 errors.py 统一转成 JSON
    if not email or "@" not in email:
        abort(400, description="Invalid email")
    if len(password) < 8:
        abort(400, description="Password must be at least 8 characters")
    if not display_name:
        abort(400, description="displayName is required")

    user = User(email=email, display_name=display_name)
    user.set_password(password)
    db.session.add(user)
    try:
        db.session.commit()
    except IntegrityError:
        # 常见场景：email 唯一约束冲突（同一个邮箱重复注册）
        db.session.rollback()
        abort(409, description="Email already exists")

    # identity 里存 user.id；后续通过 get_jwt_identity() 取出来
    access_token = create_access_token(identity=str(user.id))
    return jsonify({"user": user.to_public_dict(), "accessToken": access_token}), 201


@auth_bp.post("/login")
def login():
    """
    登录接口：
    - 校验用户存在且密码正确
    - 签发 JWT，前端保存 token 后带到 Authorization: Bearer ... 里
    """
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""

    if not email or not password:
        abort(400, description="email and password are required")

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        # 不区分“用户不存在”和“密码错误”，避免泄露账号是否存在
        abort(401, description="Invalid credentials")

    access_token = create_access_token(identity=str(user.id))
    return jsonify({"user": user.to_public_dict(), "accessToken": access_token})
