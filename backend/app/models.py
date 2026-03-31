from __future__ import annotations

from datetime import datetime, timezone

from werkzeug.security import check_password_hash, generate_password_hash

from sqlalchemy import UniqueConstraint
from sqlalchemy.dialects.mysql import LONGTEXT

from .extensions import db


def utcnow() -> datetime:
    # 统一用 UTC 时间，避免服务器/本地时区不同导致的“时间错乱”问题。
    # timezone-aware datetime（带时区信息）更适合在 API 里直接 isoformat() 输出给前端。
    return datetime.now(timezone.utc)


class User(db.Model):
    """
    用户表。
    """

    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("email", name="uq_users_email"),)

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    display_name = db.Column(db.String(120), nullable=False)

    # 博客扩展字段：角色(admin/user)、验证状态、头像
    role = db.Column(db.String(50), nullable=False, default="user")
    is_verified = db.Column(db.Boolean, nullable=False, default=False)
    avatar_url = db.Column(db.String(255), nullable=True)

    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    posts = db.relationship(
        "Post", back_populates="author", cascade="all, delete-orphan"
    )
    comments = db.relationship(
        "Comment", back_populates="author", cascade="all, delete-orphan"
    )

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password, method="pbkdf2:sha256")

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_public_dict(self) -> dict:
        return {
            "id": self.id,
            "email": self.email,
            "displayName": self.display_name,
            "role": self.role,
            "isVerified": self.is_verified,
            "avatarUrl": self.avatar_url,
            "createdAt": self.created_at.isoformat(),
        }


class Category(db.Model):
    __tablename__ = "categories"
    __table_args__ = (UniqueConstraint("slug", name="uq_categories_slug"),)

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    slug = db.Column(db.String(100), nullable=False, index=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    posts = db.relationship("Post", back_populates="category")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
        }


class Tag(db.Model):
    __tablename__ = "tags"
    __table_args__ = (UniqueConstraint("slug", name="uq_tags_slug"),)

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    slug = db.Column(db.String(100), nullable=False, index=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
        }


post_tags = db.Table(
    "post_tags",
    db.Column(
        "post_id",
        db.Integer,
        db.ForeignKey("posts.id", name="fk_post_tags_post_id", ondelete="CASCADE"),
        primary_key=True,
    ),
    db.Column(
        "tag_id",
        db.Integer,
        db.ForeignKey("tags.id", name="fk_post_tags_tag_id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class Post(db.Model):
    """
    内容表（帖子/文章）。
    """

    __tablename__ = "posts"

    id = db.Column(db.Integer, primary_key=True)
    author_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", name="fk_posts_author_id_users", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    category_id = db.Column(
        db.Integer,
        db.ForeignKey(
            "categories.id",
            name="fk_posts_category_id_categories",
            ondelete="SET NULL",
        ),
        nullable=True,
    )

    title = db.Column(db.String(200), nullable=False)
    summary = db.Column(db.String(500), nullable=True)
    content = db.Column(LONGTEXT, nullable=False)

    status = db.Column(
        db.String(20), nullable=False, default="published"
    )  # draft, published
    view_count = db.Column(db.Integer, nullable=False, default=0)
    likes_count = db.Column(db.Integer, nullable=False, default=0)

    seo_title = db.Column(db.String(255), nullable=True)
    seo_description = db.Column(db.String(500), nullable=True)

    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = db.Column(
        db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )

    author = db.relationship("User", back_populates="posts")
    category = db.relationship("Category", back_populates="posts")
    tags = db.relationship(
        "Tag",
        secondary=post_tags,
        lazy="subquery",
        backref=db.backref("posts", lazy=True),
    )
    comments = db.relationship(
        "Comment", back_populates="post", cascade="all, delete-orphan"
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "authorId": self.author_id,
            "categoryId": self.category_id,
            "category": self.category.to_dict() if self.category else None,
            "title": self.title,
            "summary": self.summary,
            "content": self.content,
            "status": self.status,
            "viewCount": self.view_count,
            "likesCount": self.likes_count,
            "tags": [tag.to_dict() for tag in self.tags],
            "createdAt": self.created_at.isoformat(),
            "updatedAt": self.updated_at.isoformat(),
        }


class Comment(db.Model):
    """
    评论表，支持嵌套和审核状态
    """

    __tablename__ = "comments"

    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(
        db.Integer,
        db.ForeignKey("posts.id", name="fk_comments_post_id_posts", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    author_id = db.Column(
        db.Integer,
        db.ForeignKey(
            "users.id", name="fk_comments_author_id_users", ondelete="CASCADE"
        ),
        nullable=False,
    )
    parent_id = db.Column(
        db.Integer,
        db.ForeignKey(
            "comments.id",
            name="fk_comments_parent_id_comments",
            ondelete="CASCADE",
        ),
        nullable=True,
    )

    content = db.Column(db.Text, nullable=False)
    status = db.Column(
        db.String(20), nullable=False, default="approved"
    )  # pending, approved, spam
    likes_count = db.Column(db.Integer, nullable=False, default=0)  # 点赞数，默认0

    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    post = db.relationship("Post", back_populates="comments")
    author = db.relationship("User", back_populates="comments")
    replies = db.relationship(
        "Comment",
        backref=db.backref("parent", remote_side=[id]),
        cascade="all, delete-orphan",
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "postId": self.post_id,
            "authorId": self.author_id,
            "parentId": self.parent_id,
            "content": self.content,
            "status": self.status,
            "likesCount": self.likes_count,  # 点赞数
            "createdAt": self.created_at.isoformat(),
            "author": self.author.to_public_dict() if self.author else None,
        }
