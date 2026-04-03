from flask import Blueprint, jsonify


profile_bp = Blueprint("profile", __name__, url_prefix="/profile")


@profile_bp.get("")
def get_profile():
    """公开的个人资料接口，供前端 About 区域展示。"""
    return jsonify(
        {
            "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
            "name": "Marcus",
            "title": "全栈开发工程师 / 创作者",
            "hobbies": ["Photography", "Traveling", "Reading", "Coding"],
            "skills": [
                {"name": "React", "level": "advanced"},
                {"name": "TypeScript", "level": "advanced"},
                {"name": "Node.js", "level": "intermediate"},
                {"name": "Python", "level": "intermediate"},
                {"name": "Flask", "level": "intermediate"},
                {"name": "Docker", "level": "beginner"},
                {"name": "Figma", "level": "beginner"},
            ],
        }
    )