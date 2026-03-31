"""
数据库种子脚本 - 插入示例数据

用于学习目的，创建分类、用户、文章、评论等示例数据。
运行此脚本将清空现有数据并重新创建示例数据。
"""

import sys
from datetime import datetime, timezone

from app import create_app
from app.extensions import db
from app.models import User, Category, Tag, Post, Comment


def clear_data():
    """清空所有表数据（按外键依赖顺序删除）"""
    print("正在清空现有数据...")
    Comment.query.delete()
    Post.query.delete()  # 这会同时删除 post_tags 关联
    Tag.query.delete()
    Category.query.delete()
    User.query.delete()
    db.session.commit()
    print("数据清空完成。")


def create_categories():
    """创建分类"""
    print("正在创建分类...")
    categories = [
        Category(name="技术", slug="tech"),
        Category(name="生活", slug="life"),
        Category(name="随笔", slug="notes"),
        Category(name="教程", slug="tutorials"),
    ]
    db.session.add_all(categories)
    db.session.commit()
    print(f"已创建 {len(categories)} 个分类。")
    return categories


def create_tags():
    """创建标签"""
    print("正在创建标签...")
    tags = [
        Tag(name="Python", slug="python"),
        Tag(name="Flask", slug="flask"),
        Tag(name="React", slug="react"),
        Tag(name="前端", slug="frontend"),
        Tag(name="后端", slug="backend"),
        Tag(name="数据库", slug="database"),
        Tag(name="学习笔记", slug="study-notes"),
        Tag(name="日常", slug="daily"),
    ]
    db.session.add_all(tags)
    db.session.commit()
    print(f"已创建 {len(tags)} 个标签。")
    return tags


def create_users():
    """创建用户"""
    print("正在创建用户...")
    users = [
        User(email="admin@example.com", display_name="管理员", role="admin"),
        User(email="user1@example.com", display_name="张三", role="user"),
        User(email="user2@example.com", display_name="李四", role="user"),
        User(email="user3@example.com", display_name="王五", role="user"),
    ]
    # 设置密码（都是 "password123"）
    for user in users:
        user.set_password("password123")
    db.session.add_all(users)
    db.session.commit()
    print(f"已创建 {len(users)} 个用户。")
    return users


def create_posts(categories, tags, users):
    """创建文章"""
    print("正在创建文章...")
    admin, user1, user2, user3 = users
    tech, life, notes, tutorials = categories
    (
        python_tag,
        flask_tag,
        react_tag,
        frontend_tag,
        backend_tag,
        db_tag,
        study_tag,
        daily_tag,
    ) = tags

    posts = [
        Post(
            author_id=admin.id,
            category_id=tech.id,
            title="Flask 入门教程：从零开始构建 Web 应用",
            summary="本文将介绍如何使用 Flask 框架快速构建一个简单的 Web 应用。",
            content="""
# Flask 入门教程

Flask 是一个轻量级的 Python Web 框架，非常适合初学者学习。

## 安装 Flask

```bash
pip install flask
```

## 第一个 Flask 应用

```python
from flask import Flask
app = Flask(__name__)

@app.route('/')
def hello():
    return 'Hello, World!'

if __name__ == '__main__':
    app.run()
```

## 路由和视图函数

Flask 使用装饰器来定义路由...

## 模板渲染

使用 Jinja2 模板引擎...

## 数据库集成

集成 SQLAlchemy...

""",
            status="published",
            view_count=156,
            likes_count=23,
        ),
        Post(
            author_id=user1.id,
            category_id=life.id,
            title="我的周末日常：咖啡与代码",
            summary="记录一个程序员的周末生活，享受编程的乐趣。",
            content="""
# 周末日常

周六早上，我喜欢去咖啡馆写代码。

## 上午：学习新技术

今天学习了 React Hooks...

## 下午：个人项目开发

完善我的博客系统...

## 晚上：放松时间

看一部电影，休息一下。

""",
            status="published",
            view_count=89,
            likes_count=12,
        ),
        Post(
            author_id=user2.id,
            category_id=tutorials.id,
            title="React Hooks 完全指南",
            summary="深入理解 React Hooks 的使用方法和最佳实践。",
            content="""
# React Hooks 指南

Hooks 是 React 16.8 引入的新特性。

## useState

```javascript
const [count, setCount] = useState(0);
```

## useEffect

处理副作用...

## useContext

共享状态...

## 自定义 Hooks

创建可复用的逻辑...

""",
            status="published",
            view_count=234,
            likes_count=45,
        ),
        Post(
            author_id=admin.id,
            category_id=notes.id,
            title="学习笔记：数据库设计原则",
            summary="记录一些数据库设计的基本原则和最佳实践。",
            content="""
# 数据库设计原则

## 1. 规范化

- 第一范式（1NF）
- 第二范式（2NF）
- 第三范式（3NF）

## 2. 索引优化

- 为经常查询的字段创建索引
- 避免过多的索引

## 3. 数据类型选择

选择适当的数据类型...

""",
            status="published",
            view_count=67,
            likes_count=8,
        ),
        Post(
            author_id=user3.id,
            category_id=tech.id,
            title="Python 异步编程入门",
            summary="介绍 Python 的异步编程概念和 asyncio 库的使用。",
            content="""
# Python 异步编程

## 为什么需要异步编程？

提高 I/O 密集型应用的性能...

## asyncio 基础

```python
import asyncio

async def main():
    await asyncio.sleep(1)
    print('Hello')

asyncio.run(main())
```

## 协程和任务

创建和管理协程...

## 异步上下文管理器

...

""",
            status="published",
            view_count=112,
            likes_count=19,
        ),
    ]

    # 为文章添加标签
    posts[0].tags.extend([python_tag, flask_tag, backend_tag, study_tag])
    posts[1].tags.extend([daily_tag])
    posts[2].tags.extend([react_tag, frontend_tag, study_tag])
    posts[3].tags.extend([db_tag, study_tag])
    posts[4].tags.extend([python_tag, backend_tag])

    db.session.add_all(posts)
    db.session.commit()
    print(f"已创建 {len(posts)} 篇文章。")
    return posts


def create_comments(posts, users):
    """创建评论"""
    print("正在创建评论...")
    post1, post2, post3, post4, post5 = posts
    admin, user1, user2, user3 = users

    comments = [
        # 第一篇文章的评论
        Comment(
            post_id=post1.id,
            author_id=user1.id,
            content="写得很详细，对初学者很有帮助！",
            likes_count=5,
        ),
        Comment(
            post_id=post1.id,
            author_id=user2.id,
            content="Flask 确实很适合入门。",
            likes_count=3,
        ),
        Comment(
            post_id=post1.id,
            author_id=user3.id,
            content="请问如何处理用户认证？",
            likes_count=1,
        ),
        # 回复第三条评论
        Comment(
            post_id=post1.id,
            author_id=admin.id,
            parent_id=3,
            content="可以使用 Flask-JWT-Extended 扩展，我在其他文章中有介绍。",
            likes_count=2,
        ),
        # 第二篇文章的评论
        Comment(
            post_id=post2.id,
            author_id=admin.id,
            content="生活与工作的平衡很重要。",
            likes_count=4,
        ),
        Comment(
            post_id=post2.id,
            author_id=user2.id,
            content="我也喜欢在咖啡馆写代码！",
            likes_count=2,
        ),
        # 第三篇文章的评论
        Comment(
            post_id=post3.id,
            author_id=user1.id,
            content="Hooks 真是改变了 React 的开发方式。",
            likes_count=6,
        ),
        Comment(
            post_id=post3.id,
            author_id=user3.id,
            content="自定义 Hooks 很强大。",
            likes_count=3,
        ),
        Comment(
            post_id=post3.id,
            author_id=admin.id,
            content="建议补充 Hooks 的性能优化部分。",
            likes_count=1,
        ),
        # 第四篇文章的评论
        Comment(
            post_id=post4.id,
            author_id=user1.id,
            content="规范化很重要，但也要考虑实际需求。",
            likes_count=2,
        ),
        # 第五篇文章的评论
        Comment(
            post_id=post5.id,
            author_id=admin.id,
            content="异步编程是 Python 的重要特性。",
            likes_count=3,
        ),
        Comment(
            post_id=post5.id,
            author_id=user2.id,
            content="asyncio 的学习曲线有点陡。",
            likes_count=1,
        ),
    ]

    db.session.add_all(comments)
    db.session.commit()
    print(f"已创建 {len(comments)} 条评论。")
    return comments


def main():
    """主函数"""
    app = create_app()
    with app.app_context():
        try:
            # 清空现有数据
            clear_data()

            # 创建数据
            categories = create_categories()
            tags = create_tags()
            users = create_users()
            posts = create_posts(categories, tags, users)
            comments = create_comments(posts, users)

            print("\n" + "=" * 50)
            print("示例数据创建完成！")
            print("=" * 50)
            print(f"用户数量: {len(users)}")
            print(f"分类数量: {len(categories)}")
            print(f"标签数量: {len(tags)}")
            print(f"文章数量: {len(posts)}")
            print(f"评论数量: {len(comments)}")
            print("\n测试账号:")
            print("管理员: admin@example.com / password123")
            print("普通用户: user1@example.com / password123")
            print("普通用户: user2@example.com / password123")
            print("普通用户: user3@example.com / password123")
            print("\n可以使用这些账号登录测试。")

        except Exception as e:
            db.session.rollback()
            print(f"创建数据时出错: {e}")
            sys.exit(1)


if __name__ == "__main__":
    main()
