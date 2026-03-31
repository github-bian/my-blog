from __future__ import annotations

from flask import Flask, jsonify, render_template_string, request


SWAGGER_UI_HTML = """
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Personal Homepage API Docs</title>
    <link
      rel="stylesheet"
      href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"
    />
    <style>
      html { box-sizing: border-box; overflow-y: scroll; }
      *, *::before, *::after { box-sizing: inherit; }
      body { margin: 0; background: #101828; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: "/openapi.json",
        dom_id: "#swagger-ui",
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis],
        layout: "BaseLayout"
      });
    </script>
  </body>
</html>
"""


def _openapi_spec(base_url: str) -> dict:
    bearer_security = [{"bearerAuth": []}]

    return {
        "openapi": "3.0.3",
        "info": {
            "title": "Personal Homepage API",
            "version": "1.0.0",
            "description": "个人主页项目 API 文档，覆盖认证、内容、用户和系统统计接口。",
        },
        "servers": [{"url": base_url}],
        "tags": [
            {"name": "Health", "description": "服务健康检查"},
            {"name": "Auth", "description": "注册与登录"},
            {"name": "Users", "description": "当前用户信息"},
            {"name": "Posts", "description": "帖子查询、发布、点赞与管理"},
            {"name": "System", "description": "系统与设备统计"},
        ],
        "components": {
            "securitySchemes": {
                "bearerAuth": {
                    "type": "http",
                    "scheme": "bearer",
                    "bearerFormat": "JWT",
                }
            },
            "schemas": {
                "AuthPayload": {
                    "type": "object",
                    "required": ["email", "password"],
                    "properties": {
                        "email": {"type": "string", "example": "demo@example.com"},
                        "password": {"type": "string", "example": "bian1234"},
                    },
                },
                "RegisterPayload": {
                    "allOf": [
                        {"$ref": "#/components/schemas/AuthPayload"},
                        {
                            "type": "object",
                            "required": ["displayName"],
                            "properties": {
                                "displayName": {"type": "string", "example": "演示用户"}
                            },
                        },
                    ]
                },
                "User": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "integer", "example": 1},
                        "email": {"type": "string", "example": "demo@example.com"},
                        "displayName": {"type": "string", "example": "演示用户"},
                        "createdAt": {"type": "string", "format": "date-time"},
                    },
                },
                "AuthResponse": {
                    "type": "object",
                    "properties": {
                        "user": {"$ref": "#/components/schemas/User"},
                        "accessToken": {"type": "string"},
                    },
                },
                "PostPayload": {
                    "type": "object",
                    "required": ["title", "content"],
                    "properties": {
                        "title": {"type": "string", "example": "我的新帖子"},
                        "content": {"type": "string", "example": "这里是内容正文。"},
                    },
                },
                "Post": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "integer", "example": 1},
                        "authorId": {"type": "integer", "example": 1},
                        "title": {"type": "string", "example": "第一篇：本地项目跑通记录"},
                        "content": {"type": "string", "example": "帖子内容"},
                        "likesCount": {"type": "integer", "example": 12},
                        "createdAt": {"type": "string", "format": "date-time"},
                        "updatedAt": {"type": "string", "format": "date-time"},
                    },
                },
                "PostListResponse": {
                    "type": "object",
                    "properties": {
                        "items": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/Post"},
                        },
                        "total": {"type": "integer", "example": 3},
                    },
                },
                "SystemStats": {
                    "type": "object",
                    "properties": {
                        "system": {
                            "type": "object",
                            "properties": {
                                "platform": {"type": "string", "example": "Darwin"},
                                "release": {"type": "string", "example": "24.0.0"},
                                "machine": {"type": "string", "example": "arm64"},
                                "cpuCoresLogical": {"type": "integer", "example": 16},
                                "cpuCoresPhysical": {"type": "integer", "example": 16},
                                "cpuPercent": {"type": "number", "example": 5.6},
                                "memory": {
                                    "type": "object",
                                    "properties": {
                                        "totalBytes": {"type": "integer"},
                                        "usedBytes": {"type": "integer"},
                                        "availableBytes": {"type": "integer"},
                                        "percent": {"type": "number", "example": 47.2},
                                    },
                                },
                            },
                        }
                    },
                },
                "ErrorResponse": {
                    "type": "object",
                    "properties": {
                        "error": {
                            "type": "object",
                            "properties": {
                                "code": {"type": "integer", "example": 400},
                                "name": {"type": "string", "example": "Bad Request"},
                                "message": {"type": "string", "example": "Invalid input"},
                            },
                        }
                    },
                },
            },
        },
        "paths": {
            "/health": {
                "get": {
                    "tags": ["Health"],
                    "summary": "健康检查",
                    "responses": {"200": {"description": "服务正常"}},
                }
            },
            "/api/v1/auth/register": {
                "post": {
                    "tags": ["Auth"],
                    "summary": "注册",
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/RegisterPayload"}
                            }
                        },
                    },
                    "responses": {
                        "201": {
                            "description": "注册成功",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/AuthResponse"}
                                }
                            },
                        },
                        "409": {"description": "邮箱已存在"},
                    },
                }
            },
            "/api/v1/auth/login": {
                "post": {
                    "tags": ["Auth"],
                    "summary": "登录",
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/AuthPayload"}
                            }
                        },
                    },
                    "responses": {
                        "200": {
                            "description": "登录成功",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/AuthResponse"}
                                }
                            },
                        },
                        "401": {"description": "账号或密码错误"},
                    },
                }
            },
            "/api/v1/users/me": {
                "get": {
                    "tags": ["Users"],
                    "summary": "获取当前登录用户",
                    "security": bearer_security,
                    "responses": {
                        "200": {
                            "description": "成功",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "user": {"$ref": "#/components/schemas/User"}
                                        },
                                    }
                                }
                            },
                        },
                        "401": {"description": "未授权"},
                    },
                }
            },
            "/api/v1/posts": {
                "get": {
                    "tags": ["Posts"],
                    "summary": "获取帖子列表",
                    "parameters": [
                        {"name": "limit", "in": "query", "schema": {"type": "integer", "default": 20}},
                        {"name": "offset", "in": "query", "schema": {"type": "integer", "default": 0}},
                    ],
                    "responses": {
                        "200": {
                            "description": "成功",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/PostListResponse"}
                                }
                            },
                        }
                    },
                },
                "post": {
                    "tags": ["Posts"],
                    "summary": "创建帖子",
                    "security": bearer_security,
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/PostPayload"}
                            }
                        },
                    },
                    "responses": {
                        "201": {
                            "description": "创建成功",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "post": {"$ref": "#/components/schemas/Post"}
                                        },
                                    }
                                }
                            },
                        }
                    },
                },
            },
            "/api/v1/posts/{postId}": {
                "get": {
                    "tags": ["Posts"],
                    "summary": "获取帖子详情",
                    "parameters": [
                        {"name": "postId", "in": "path", "required": True, "schema": {"type": "integer"}}
                    ],
                    "responses": {
                        "200": {
                            "description": "成功",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "post": {"$ref": "#/components/schemas/Post"}
                                        },
                                    }
                                }
                            },
                        }
                    },
                },
                "put": {
                    "tags": ["Posts"],
                    "summary": "更新帖子",
                    "security": bearer_security,
                    "parameters": [
                        {"name": "postId", "in": "path", "required": True, "schema": {"type": "integer"}}
                    ],
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/PostPayload"}
                            }
                        },
                    },
                    "responses": {"200": {"description": "更新成功"}},
                },
                "delete": {
                    "tags": ["Posts"],
                    "summary": "删除帖子",
                    "security": bearer_security,
                    "parameters": [
                        {"name": "postId", "in": "path", "required": True, "schema": {"type": "integer"}}
                    ],
                    "responses": {"200": {"description": "删除成功"}},
                },
            },
            "/api/v1/posts/{postId}/like": {
                "post": {
                    "tags": ["Posts"],
                    "summary": "公开点赞",
                    "description": "访客无需登录即可点赞。",
                    "parameters": [
                        {"name": "postId", "in": "path", "required": True, "schema": {"type": "integer"}}
                    ],
                    "responses": {
                        "200": {
                            "description": "点赞成功",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "post": {"$ref": "#/components/schemas/Post"}
                                        },
                                    }
                                }
                            },
                        }
                    },
                }
            },
            "/api/v1/system/stats": {
                "get": {
                    "tags": ["System"],
                    "summary": "获取系统统计",
                    "responses": {
                        "200": {
                            "description": "成功",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/SystemStats"}
                                }
                            },
                        }
                    },
                }
            },
        },
    }


def register_docs(app: Flask) -> None:
    @app.get("/openapi.json")
    def openapi_json():
        return jsonify(_openapi_spec(request.url_root.rstrip("/")))

    @app.get("/docs")
    def swagger_docs():
        return render_template_string(SWAGGER_UI_HTML)