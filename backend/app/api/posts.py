import re

from flask import Blueprint, abort, jsonify, request
from flask_jwt_extended import (
    get_jwt_identity,
    jwt_required,
    verify_jwt_in_request,
)

from ..extensions import db
from ..models import Category, Post, Tag, User

# 内容相关接口统一挂在 /api/v1/posts 下
posts_bp = Blueprint("posts", __name__, url_prefix="/posts")


def _current_user_optional() -> User | None:
    """尽量获取当前登录用户；未登录时返回 None。"""
    try:
        verify_jwt_in_request(optional=True)
    except Exception:
        return None

    identity = get_jwt_identity()
    if not identity:
        return None

    try:
        return User.query.get(int(identity))
    except (TypeError, ValueError):
        return None


def _normalize_status(payload: dict) -> str:
    if payload.get("is_draft") is True:
        return "draft"

    raw_status = str(payload.get("status") or "published").strip().lower()
    if raw_status not in {"draft", "published"}:
        abort(400, description="Invalid status")
    return raw_status


def _parse_category_id(payload: dict) -> int | None:
    raw_value = payload.get("categoryId")
    if raw_value in (None, "", 0, "0"):
        return None

    try:
        category_id = int(raw_value)
    except (TypeError, ValueError):
        abort(400, description="Invalid categoryId")

    category = Category.query.get(category_id)
    if not category:
        abort(400, description="Category not found")
    return category.id


def _parse_tag_ids(payload: dict) -> list[int]:
    raw_tag_ids = payload.get("tagIds")
    raw_tags = payload.get("tags")

    collected: list[int] = []
    if isinstance(raw_tag_ids, list):
        collected.extend(raw_tag_ids)

    if isinstance(raw_tags, list):
        for item in raw_tags:
            if isinstance(item, dict) and item.get("id") is not None:
                collected.append(item.get("id"))
            elif isinstance(item, int):
                collected.append(item)

    parsed_ids: list[int] = []
    for value in collected:
        try:
            parsed_ids.append(int(value))
        except (TypeError, ValueError):
            abort(400, description="Invalid tagIds")

    if not parsed_ids:
        return []

    tags = Tag.query.filter(Tag.id.in_(parsed_ids)).all()
    found_ids = {tag.id for tag in tags}
    missing_ids = [tag_id for tag_id in parsed_ids if tag_id not in found_ids]
    if missing_ids:
        abort(400, description=f"Tags not found: {', '.join(map(str, missing_ids))}")

    # 去重并保留原顺序，便于前端选中态稳定
    deduped_ids: list[int] = []
    seen: set[int] = set()
    for tag_id in parsed_ids:
        if tag_id in seen:
            continue
        seen.add(tag_id)
        deduped_ids.append(tag_id)
    return deduped_ids


def _apply_post_payload(post: Post, payload: dict) -> None:
    title = payload.get("title")
    content = payload.get("content")
    summary = payload.get("summary")

    if title is not None:
        title = str(title).strip()
        if not title:
            abort(400, description="title cannot be empty")
        post.title = title

    if content is not None:
        content = str(content).strip()
        if not content:
            abort(400, description="content cannot be empty")
        post.content = content

    if summary is not None:
        post.summary = str(summary).strip() or None

    if "categoryId" in payload:
        post.category_id = _parse_category_id(payload)

    if "tagIds" in payload or "tags" in payload:
        tag_ids = _parse_tag_ids(payload)
        post.tags = Tag.query.filter(Tag.id.in_(tag_ids)).all() if tag_ids else []

    if "status" in payload or "is_draft" in payload:
        post.status = _normalize_status(payload)


def _ensure_post_visible(post: Post, current_user: User | None) -> None:
    if post.status == "published":
        return

    if not current_user:
        abort(404, description="Post not found")

    if current_user.role == "admin" or current_user.id == post.author_id:
        return

    abort(404, description="Post not found")


@posts_bp.get("")
def list_posts():
    """
    获取内容列表（公开接口，不需要登录）

    支持分页和筛选：
    - limit: 每页条数（最大 50）
    - offset: 偏移量
    - categoryId: 按分类筛选
    - tagId: 按标签筛选
    - authorId: 按作者筛选
    - search: 搜索关键词（标题和内容）
    """
    try:
        limit = min(int(request.args.get("limit", 20)), 50)
        offset = max(int(request.args.get("offset", 0)), 0)
    except ValueError:
        abort(400, description="Invalid pagination")

    # 构建查询
    q = Post.query.filter(Post.status == "published")

    # 分类筛选
    category_id = request.args.get("categoryId")
    if category_id:
        try:
            q = q.filter(Post.category_id == int(category_id))
        except ValueError:
            abort(400, description="Invalid categoryId")

    # 标签筛选（通过多对多关系）
    tag_id = request.args.get("tagId")
    if tag_id:
        try:
            tag_id = int(tag_id)
            # 使用 join 和 filter 来筛选有特定标签的文章
            q = q.join(Post.tags).filter(Tag.id == tag_id)
        except ValueError:
            abort(400, description="Invalid tagId")

    # 作者筛选
    author_id = request.args.get("authorId")
    if author_id:
        try:
            q = q.filter(Post.author_id == int(author_id))
        except ValueError:
            abort(400, description="Invalid authorId")

    # 搜索关键词（简单 LIKE 搜索，生产环境建议使用全文搜索）
    search = request.args.get("search")
    if search:
        search_pattern = f"%{search}%"
        q = q.filter(
            db.or_(Post.title.ilike(search_pattern), Post.content.ilike(search_pattern))
        )

    # 按时间倒序
    q = q.order_by(Post.created_at.desc())
    total = q.count()
    items = q.offset(offset).limit(limit).all()
    return jsonify({"items": [p.to_dict() for p in items], "total": total})


@posts_bp.post("")
@jwt_required()
def create_post():
    """
    创建内容（需要登录）。

    关键点：
    - @jwt_required() 会保证 token 合法
    - get_jwt_identity() 取出当前用户 id
    - 这里再次查用户，是为了确保 token 对应的用户仍然存在
    """
    payload = request.get_json(silent=True) or {}
    title = (payload.get("title") or "").strip()
    content = (payload.get("content") or "").strip()
    if not title:
        abort(400, description="title is required")
    if not content:
        abort(400, description="content is required")

    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        abort(401, description="Invalid token user")

    post = Post(
        author_id=user.id,
        title=title,
        content=content,
        summary=(payload.get("summary") or "").strip() or None,
        status=_normalize_status(payload),
        category_id=_parse_category_id(payload),
    )
    tag_ids = _parse_tag_ids(payload)
    if tag_ids:
        post.tags = Tag.query.filter(Tag.id.in_(tag_ids)).all()

    db.session.add(post)
    db.session.commit()
    return jsonify({"post": post.to_dict()}), 201


@posts_bp.get("/<int:post_id>")
def get_post(post_id: int):
    """获取单篇内容详情（公开接口）。"""
    post = Post.query.get(post_id)
    if not post:
        abort(404, description="Post not found")
    _ensure_post_visible(post, _current_user_optional())
    return jsonify({"post": post.to_dict()})


@posts_bp.post("/<int:post_id>/like")
def like_post(post_id: int):
    """公开点赞接口：不需要登录，允许访客直接点赞。"""
    post = Post.query.get(post_id)
    if not post:
        abort(404, description="Post not found")

    post.likes_count = int(post.likes_count or 0) + 1
    db.session.commit()
    return jsonify({"post": post.to_dict()})


@posts_bp.put("/<int:post_id>")
@jwt_required()
def update_post(post_id: int):
    """
    更新内容（需要登录，且只能更新自己的内容）。

    更新策略（常见 REST 写法）：
    - title/content 允许只传其中一个（partial update）
    - 但如果传了，就不允许传空字符串
    """
    post = Post.query.get(post_id)
    if not post:
        abort(404, description="Post not found")

    user_id = int(get_jwt_identity())
    # 权限控制：只能改自己的内容
    if post.author_id != user_id:
        abort(403, description="Forbidden")

    payload = request.get_json(silent=True) or {}
    _apply_post_payload(post, payload)

    db.session.commit()
    return jsonify({"post": post.to_dict()})


@posts_bp.delete("/<int:post_id>")
@jwt_required()
def delete_post(post_id: int):
    """删除内容（需要登录，且只能删除自己的内容）。"""
    post = Post.query.get(post_id)
    if not post:
        abort(404, description="Post not found")

    user_id = int(get_jwt_identity())
    if post.author_id != user_id:
        abort(403, description="Forbidden")

    db.session.delete(post)
    db.session.commit()
    return jsonify({"ok": True})


@posts_bp.get("/search")
def search_posts():
    """
    搜索文章（公开接口）

    提供全文搜索功能，支持标题和内容搜索。
    """
    search = request.args.get("q")
    if not search or len(search.strip()) < 2:
        abort(400, description="Search query must be at least 2 characters")

    # 分页参数
    try:
        limit = min(int(request.args.get("limit", 20)), 50)
        offset = max(int(request.args.get("offset", 0)), 0)
    except ValueError:
        abort(400, description="Invalid pagination")

    search_pattern = f"%{search}%"
    q = (
        Post.query.filter(Post.status == "published")
        .filter(db.or_(Post.title.ilike(search_pattern), Post.content.ilike(search_pattern)))
        .order_by(Post.created_at.desc())
    )

    total = q.count()
    items = q.offset(offset).limit(limit).all()

    return jsonify(
        {"items": [p.to_dict() for p in items], "total": total, "query": search}
    )
