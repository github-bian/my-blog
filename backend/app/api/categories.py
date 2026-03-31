"""
分类相关接口

本模块提供文章分类的增删改查功能，包括：
- 获取分类列表
- 创建分类（需要管理员权限）
- 获取分类详情
- 更新分类（需要管理员权限）
- 删除分类（需要管理员权限）

学习要点：
1. 管理员权限控制（通过用户角色实现）
2. RESTful 风格的 URL 设计
3. 数据库唯一约束的处理（slug 字段唯一）
4. 分类与文章的关系（一对多）
"""

from flask import Blueprint, abort, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..extensions import db
from ..models import Category, User

# 分类相关接口统一挂在 /api/v1/categories 下
categories_bp = Blueprint("categories", __name__, url_prefix="/categories")


@categories_bp.get("")
def list_categories():
    """
    获取所有分类列表（公开接口）

    返回格式：
    {
        "items": [
            {
                "id": 1,
                "name": "技术",
                "slug": "tech",
                "postCount": 10  # 可选：该分类下的文章数量
            }
        ]
    }
    """
    categories = Category.query.order_by(Category.name.asc()).all()

    # 可以扩展为包含文章数量
    items = []
    for category in categories:
        category_dict = category.to_dict()
        # 统计该分类下的文章数量（学习阶段可以这样写，生产环境建议优化）
        from ..models import Post

        post_count = Post.query.filter_by(category_id=category.id).count()
        category_dict["postCount"] = post_count
        items.append(category_dict)

    return jsonify({"items": items})


@categories_bp.post("")
@jwt_required()
def create_category():
    """
    创建分类（需要管理员权限）

    权限控制：
    - 只有管理员（role='admin'）可以创建分类
    - 普通用户（role='user'）会返回 403 Forbidden

    请求体：
    {
        "name": "技术",
        "slug": "tech"  # URL友好的标识符，必须唯一
    }
    """
    # 检查用户是否为管理员
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role != "admin":
        abort(403, description="Admin privileges required")

    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    slug = (payload.get("slug") or "").strip().lower()

    # 验证必填字段
    if not name:
        abort(400, description="Name is required")
    if not slug:
        abort(400, description="Slug is required")

    # 验证 slug 格式（只允许字母、数字、连字符）
    import re

    if not re.match(r"^[a-z0-9-]+$", slug):
        abort(
            400,
            description="Slug can only contain lowercase letters, numbers, and hyphens",
        )

    # 检查 slug 是否已存在
    existing = Category.query.filter_by(slug=slug).first()
    if existing:
        abort(409, description="Slug already exists")

    # 创建分类
    category = Category(name=name, slug=slug)
    db.session.add(category)
    db.session.commit()

    return jsonify({"category": category.to_dict()}), 201


@categories_bp.get("/<int:category_id>")
def get_category(category_id: int):
    """
    获取分类详情（公开接口）

    返回：
    {
        "category": {
            "id": 1,
            "name": "技术",
            "slug": "tech",
            "createdAt": "2023-01-01T00:00:00+00:00"
        }
    }
    """
    category = Category.query.get(category_id)
    if not category:
        abort(404, description="Category not found")
    return jsonify({"category": category.to_dict()})


@categories_bp.put("/<int:category_id>")
@jwt_required()
def update_category(category_id: int):
    """
    更新分类（需要管理员权限）

    可以更新的字段：
    - name: 分类名称
    - slug: URL标识符（必须唯一）

    注意：更新 slug 可能会影响已有的文章链接，需要谨慎处理。
    """
    # 权限检查
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role != "admin":
        abort(403, description="Admin privileges required")

    category = Category.query.get(category_id)
    if not category:
        abort(404, description="Category not found")

    payload = request.get_json(silent=True) or {}
    name = payload.get("name")
    slug = payload.get("slug")

    # 更新名称
    if name is not None:
        name = name.strip()
        if not name:
            abort(400, description="Name cannot be empty")
        category.name = name

    # 更新 slug
    if slug is not None:
        slug = slug.strip().lower()
        if not slug:
            abort(400, description="Slug cannot be empty")

        # 验证 slug 格式
        import re

        if not re.match(r"^[a-z0-9-]+$", slug):
            abort(
                400,
                description="Slug can only contain lowercase letters, numbers, and hyphens",
            )

        # 检查 slug 是否被其他分类占用
        existing = Category.query.filter_by(slug=slug).first()
        if existing and existing.id != category_id:
            abort(409, description="Slug already exists")

        category.slug = slug

    db.session.commit()
    return jsonify({"category": category.to_dict()})


@categories_bp.delete("/<int:category_id>")
@jwt_required()
def delete_category(category_id: int):
    """
    删除分类（需要管理员权限）

    注意事项：
    1. 删除分类前，需要处理该分类下的文章
       - 方案A：禁止删除有文章的分类
       - 方案B：将文章的 category_id 设为 NULL（本项目采用此方案）
    2. 实际生产环境可能需要更复杂的逻辑
    """
    # 权限检查
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role != "admin":
        abort(403, description="Admin privileges required")

    category = Category.query.get(category_id)
    if not category:
        abort(404, description="Category not found")

    # 将该分类下的文章的 category_id 设为 NULL
    from ..models import Post

    Post.query.filter_by(category_id=category_id).update({"category_id": None})

    db.session.delete(category)
    db.session.commit()
    return jsonify({"ok": True})


@categories_bp.get("/<int:category_id>/posts")
def get_category_posts(category_id: int):
    """
    获取某分类下的文章列表（公开接口）

    支持分页，按时间倒序排列。
    """
    category = Category.query.get(category_id)
    if not category:
        abort(404, description="Category not found")

    # 获取分页参数
    try:
        limit = min(int(request.args.get("limit", 20)), 50)
        offset = max(int(request.args.get("offset", 0)), 0)
    except ValueError:
        abort(400, description="Invalid pagination")

    from ..models import Post

    q = Post.query.filter_by(category_id=category_id).order_by(Post.created_at.desc())
    total = q.count()
    items = q.offset(offset).limit(limit).all()

    return jsonify(
        {
            "items": [post.to_dict() for post in items],
            "total": total,
            "category": category.to_dict(),
        }
    )
