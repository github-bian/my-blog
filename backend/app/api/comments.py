"""
评论相关接口

本模块提供文章评论的增删改查功能，包括：
- 获取文章的评论列表
- 发表评论（需要登录）
- 更新评论（只能更新自己的评论）
- 删除评论（只能删除自己的评论）

学习要点：
1. RESTful 风格的 URL 设计
2. 权限控制：确保用户只能操作自己的评论
3. 分页查询的实现
4. 外键约束的处理（评论必须属于某篇文章）
"""

from flask import Blueprint, abort, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..extensions import db
from ..models import Comment, Post, User

# 评论相关接口统一挂在 /api/v1/comments 下
comments_bp = Blueprint("comments", __name__, url_prefix="/comments")


@comments_bp.get("/post/<int:post_id>")
def list_comments(post_id: int):
    """
    获取某篇文章的评论列表（公开接口）

    设计思路：
    - 评论应该按时间正序排列（最早的评论在最上面）
    - 支持分页，避免一次返回太多数据
    - 每条评论都包含作者信息（用户名、头像等）

    参数：
    - post_id: 文章ID（路径参数）
    - limit: 每页条数（查询参数，默认20，最大50）
    - offset: 偏移量（查询参数，默认0）

    返回：
    {
        "items": [
            {
                "id": 1,
                "postId": 1,
                "authorId": 1,
                "parentId": null,
                "content": "评论内容",
                "status": "approved",
                "createdAt": "2023-01-01T00:00:00+00:00",
                "author": {
                    "id": 1,
                    "email": "user@example.com",
                    "displayName": "用户",
                    "role": "user",
                    "isVerified": false,
                    "avatarUrl": null,
                    "createdAt": "2023-01-01T00:00:00+00:00"
                }
            }
        ],
        "total": 10
    }
    """
    # 验证文章是否存在
    post = Post.query.get(post_id)
    if not post:
        abort(404, description="Post not found")

    # 获取分页参数，并做范围限制
    try:
        limit = min(int(request.args.get("limit", 20)), 50)
        offset = max(int(request.args.get("offset", 0)), 0)
    except ValueError:
        abort(400, description="Invalid pagination")

    # 查询评论：按创建时间正序，支持分页
    q = Comment.query.filter_by(post_id=post_id).order_by(Comment.created_at.asc())
    total = q.count()
    items = q.offset(offset).limit(limit).all()

    # 将评论对象转换为字典，并包含作者信息
    comments_data = []
    for comment in items:
        comment_dict = comment.to_dict()
        # 单独查询作者信息（避免 N+1 查询问题，学习阶段可以这样写）
        author = User.query.get(comment.author_id)
        if author:
            comment_dict["author"] = author.to_public_dict()
        comments_data.append(comment_dict)

    return jsonify({"items": comments_data, "total": total})


@comments_bp.post("/post/<int:post_id>")
@jwt_required()
def create_comment(post_id: int):
    """
    发表评论（需要登录）

    功能：
    1. 验证文章是否存在
    2. 验证用户是否存在
    3. 支持回复评论（通过 parentId 字段）
    4. 创建评论并保存到数据库

    请求体：
    {
        "content": "评论内容",
        "parentId": 1  # 可选，回复哪条评论
    }

    返回：新创建的评论对象
    """
    # 验证文章是否存在
    post = Post.query.get(post_id)
    if not post:
        abort(404, description="Post not found")

    # 获取当前用户信息
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        abort(401, description="Invalid token user")

    # 解析请求体
    payload = request.get_json(silent=True) or {}
    content = (payload.get("content") or "").strip()
    parent_id = payload.get("parentId")

    # 基本验证
    if not content:
        abort(400, description="Content is required")

    # 如果指定了 parentId，需要验证父评论是否存在
    if parent_id is not None:
        parent_comment = Comment.query.get(parent_id)
        if not parent_comment:
            abort(404, description="Parent comment not found")
        # 可选：验证父评论是否属于同一篇文章
        if parent_comment.post_id != post_id:
            abort(400, description="Parent comment does not belong to this post")

    # 创建评论对象
    comment = Comment(
        post_id=post_id,
        author_id=user.id,
        parent_id=parent_id,
        content=content,
        status="approved",  # 默认直接通过，生产环境可能需要审核
    )

    db.session.add(comment)
    db.session.commit()

    # 返回创建的评论（包含作者信息）
    comment_dict = comment.to_dict()
    comment_dict["author"] = user.to_public_dict()

    return jsonify({"comment": comment_dict}), 201


@comments_bp.put("/<int:comment_id>")
@jwt_required()
def update_comment(comment_id: int):
    """
    更新评论（只能更新自己的评论）

    设计要点：
    - 只能更新自己的评论（权限控制）
    - 只允许更新 content 字段
    - 内容不能为空

    请求体：
    {
        "content": "新的评论内容"
    }
    """
    comment = Comment.query.get(comment_id)
    if not comment:
        abort(404, description="Comment not found")

    user_id = int(get_jwt_identity())
    # 权限控制：只能改自己的评论
    if comment.author_id != user_id:
        abort(403, description="Forbidden")

    payload = request.get_json(silent=True) or {}
    content = payload.get("content")

    if content is not None:
        content = content.strip()
        if not content:
            abort(400, description="Content cannot be empty")
        comment.content = content
        # 更新时间可以由数据库自动更新，也可以手动设置
        # comment.updated_at = utcnow()

    db.session.commit()
    return jsonify({"comment": comment.to_dict()})


@comments_bp.delete("/<int:comment_id>")
@jwt_required()
def delete_comment(comment_id: int):
    """
    删除评论（只能删除自己的评论）

    注意：删除评论时，需要考虑子评论的处理。
    目前采用级联删除（在模型中设置 cascade="all, delete-orphan"）。
    生产环境可能需要更复杂的策略，比如软删除。
    """
    comment = Comment.query.get(comment_id)
    if not comment:
        abort(404, description="Comment not found")

    user_id = int(get_jwt_identity())
    # 权限控制：只能删自己的评论
    if comment.author_id != user_id:
        abort(403, description="Forbidden")

    db.session.delete(comment)
    db.session.commit()
    return jsonify({"ok": True})


@comments_bp.post("/<int:comment_id>/like")
def like_comment(comment_id: int):
    """
    点赞评论（公开接口）

    设计思路：点赞功能通常不需要登录，可以匿名点赞。
    注意：实际项目中可能需要防止重复点赞（比如通过 IP 限制）。
    """
    comment = Comment.query.get(comment_id)
    if not comment:
        abort(404, description="Comment not found")

    # 增加点赞数
    comment.likes_count = (comment.likes_count or 0) + 1
    db.session.commit()

    return jsonify({"comment": comment.to_dict()})
