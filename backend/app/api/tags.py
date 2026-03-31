"""
标签相关接口

本模块提供文章标签的增删改查功能，包括：
- 获取标签列表
- 创建标签（需要登录）
- 获取标签详情
- 更新标签（需要登录，只能更新自己的标签？但标签是共享资源，所以需要管理员权限）
- 删除标签（需要管理员权限）

学习要点：
1. 多对多关系的处理（文章-标签）
2. 标签的创建和复用
3. 权限控制的设计
"""

from flask import Blueprint, abort, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
import re

from ..extensions import db
from ..models import Tag, User

# 标签相关接口统一挂在 /api/v1/tags 下
tags_bp = Blueprint("tags", __name__, url_prefix="/tags")


@tags_bp.get("")
def list_tags():
    """
    获取所有标签列表（公开接口）

    返回格式：
    {
        "items": [
            {
                "id": 1,
                "name": "Python",
                "slug": "python",
                "postCount": 5  # 可选：使用该标签的文章数量
            }
        ]
    }
    """
    tags = Tag.query.order_by(Tag.name.asc()).all()

    # 统计每个标签的文章数量
    items = []
    for tag in tags:
        tag_dict = tag.to_dict()
        # 通过多对多关系获取文章数量
        post_count = len(tag.posts)
        tag_dict["postCount"] = post_count
        items.append(tag_dict)

    return jsonify({"items": items})


@tags_bp.post("")
@jwt_required()
def create_tag():
    """
    创建标签（需要登录）

    设计思路：
    - 任何登录用户都可以创建标签（简化权限）
    - 如果标签已存在（通过 slug 判断），则返回已有标签
    - 标签是全局共享的，不是用户私有的

    请求体：
    {
        "name": "Python",
        "slug": "python"  # 可选，如果不提供则自动生成
    }
    """
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    slug = payload.get("slug")

    if not name:
        abort(400, description="Name is required")

    # 如果没有提供 slug，则根据 name 生成
    if not slug:
        # 将中文转换为拼音（简化处理，实际项目需要专门的库）
        # 这里简单处理：转换为小写，替换空格为连字符，移除非字母数字字符
        slug = name.lower()
        slug = re.sub(r"\s+", "-", slug)  # 空格替换为连字符
        slug = re.sub(r"[^a-z0-9-]", "", slug)  # 移除非字母数字字符
        slug = slug.strip("-")  # 移除首尾连字符
        if not slug:
            abort(400, description="Cannot generate valid slug from name")

    # 验证 slug 格式
    if not re.match(r"^[a-z0-9-]+$", slug):
        abort(
            400,
            description="Slug can only contain lowercase letters, numbers, and hyphens",
        )

    # 检查 slug 是否已存在
    existing = Tag.query.filter_by(slug=slug).first()
    if existing:
        # 标签已存在，直接返回（幂等设计）
        return jsonify({"tag": existing.to_dict(), "created": False})

    # 创建新标签
    tag = Tag(name=name, slug=slug)
    db.session.add(tag)
    db.session.commit()

    return jsonify({"tag": tag.to_dict(), "created": True}), 201


@tags_bp.get("/<int:tag_id>")
def get_tag(tag_id: int):
    """
    获取标签详情（公开接口）
    """
    tag = Tag.query.get(tag_id)
    if not tag:
        abort(404, description="Tag not found")

    tag_dict = tag.to_dict()
    tag_dict["postCount"] = len(tag.posts)

    return jsonify({"tag": tag_dict})


@tags_bp.put("/<int:tag_id>")
@jwt_required()
def update_tag(tag_id: int):
    """
    更新标签（需要管理员权限）

    注意：更新标签会影响所有使用该标签的文章，需要谨慎处理。
    """
    # 权限检查：只有管理员可以更新标签
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role != "admin":
        abort(403, description="Admin privileges required")

    tag = Tag.query.get(tag_id)
    if not tag:
        abort(404, description="Tag not found")

    payload = request.get_json(silent=True) or {}
    name = payload.get("name")
    slug = payload.get("slug")

    if name is not None:
        name = name.strip()
        if not name:
            abort(400, description="Name cannot be empty")
        tag.name = name

    if slug is not None:
        slug = slug.strip().lower()
        if not slug:
            abort(400, description="Slug cannot be empty")

        if not re.match(r"^[a-z0-9-]+$", slug):
            abort(
                400,
                description="Slug can only contain lowercase letters, numbers, and hyphens",
            )

        # 检查 slug 是否被其他标签占用
        existing = Tag.query.filter_by(slug=slug).first()
        if existing and existing.id != tag_id:
            abort(409, description="Slug already exists")

        tag.slug = slug

    db.session.commit()
    return jsonify({"tag": tag.to_dict()})


@tags_bp.delete("/<int:tag_id>")
@jwt_required()
def delete_tag(tag_id: int):
    """
    删除标签（需要管理员权限）

    注意：删除标签会同时移除文章与标签的关联（多对多关系）。
    """
    # 权限检查
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role != "admin":
        abort(403, description="Admin privileges required")

    tag = Tag.query.get(tag_id)
    if not tag:
        abort(404, description="Tag not found")

    # 删除标签（关联表中的记录会自动删除，因为模型中设置了 cascade）
    db.session.delete(tag)
    db.session.commit()
    return jsonify({"ok": True})


@tags_bp.get("/<int:tag_id>/posts")
def get_tag_posts(tag_id: int):
    """
    获取某标签下的文章列表（公开接口）

    支持分页，按时间倒序排列。
    """
    tag = Tag.query.get(tag_id)
    if not tag:
        abort(404, description="Tag not found")

    # 获取分页参数
    try:
        limit = min(int(request.args.get("limit", 20)), 50)
        offset = max(int(request.args.get("offset", 0)), 0)
    except ValueError:
        abort(400, description="Invalid pagination")

    # 通过多对多关系获取文章
    # 注意：这里使用懒加载，生产环境建议使用 joinedload 优化查询
    from ..models import Post

    # 获取使用该标签的文章ID
    post_ids = [post.id for post in tag.posts]
    q = Post.query.filter(Post.id.in_(post_ids)).order_by(Post.created_at.desc())
    total = q.count()
    items = q.offset(offset).limit(limit).all()

    return jsonify(
        {
            "items": [post.to_dict() for post in items],
            "total": total,
            "tag": tag.to_dict(),
        }
    )
