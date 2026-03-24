from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.models import Category
from app.extensions import db
from app.schemas import CategorySchema

bp = Blueprint('categories', __name__, url_prefix='/api/categories')
category_schema = CategorySchema()
categories_schema = CategorySchema(many=True)

@bp.route('', methods=['GET'])
def get_categories():
    categories = Category.query.all()
    return jsonify(categories_schema.dump(categories)), 200

@bp.route('', methods=['POST'])
@jwt_required()
def create_category():
    data = request.get_json()
    if not data or not data.get('name'):
        return jsonify({'message': 'Missing category name'}), 400
        
    if Category.query.filter_by(name=data['name']).first():
        return jsonify({'message': 'Category already exists'}), 400
        
    category = Category(name=data['name'])
    db.session.add(category)
    db.session.commit()
    
    return jsonify(category_schema.dump(category)), 201
