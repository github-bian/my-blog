from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import Article, Category
from app.extensions import db
from app.schemas import ArticleSchema

bp = Blueprint('articles', __name__, url_prefix='/api/articles')
article_schema = ArticleSchema()
articles_schema = ArticleSchema(many=True)

@bp.route('', methods=['GET'])
def get_articles():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    category_id = request.args.get('category_id', type=int)
    
    query = Article.query.order_by(Article.created_at.desc())
    if category_id:
        query = query.filter_by(category_id=category_id)
        
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'items': articles_schema.dump(pagination.items),
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    }), 200

@bp.route('/<int:id>', methods=['GET'])
def get_article(id):
    article = Article.query.get_or_404(id)
    article.views += 1
    db.session.commit()
    return jsonify(article_schema.dump(article)), 200

@bp.route('', methods=['POST'])
@jwt_required()
def create_article():
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data or not data.get('title') or not data.get('content'):
        return jsonify({'message': 'Missing title or content'}), 400
        
    article = Article(
        title=data['title'],
        content=data['content'],
        user_id=current_user_id,
        category_id=data.get('category_id')
    )
    db.session.add(article)
    db.session.commit()
    
    return jsonify(article_schema.dump(article)), 201

@bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
def update_article(id):
    current_user_id = int(get_jwt_identity())
    article = Article.query.get_or_404(id)
    
    if article.user_id != current_user_id:
        return jsonify({'message': 'Unauthorized'}), 403
        
    data = request.get_json()
    if 'title' in data:
        article.title = data['title']
    if 'content' in data:
        article.content = data['content']
    if 'category_id' in data:
        article.category_id = data['category_id']
        
    db.session.commit()
    return jsonify(article_schema.dump(article)), 200

@bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_article(id):
    current_user_id = int(get_jwt_identity())
    article = Article.query.get_or_404(id)
    
    if article.user_id != current_user_id:
        return jsonify({'message': 'Unauthorized'}), 403
        
    db.session.delete(article)
    db.session.commit()
    return jsonify({'message': 'Article deleted'}), 200
