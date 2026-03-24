from app.extensions import ma
from app.models import User, Category, Article

class UserSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = User
        exclude = ('password_hash',)

class CategorySchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Category

class ArticleSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Article
        include_fk = True
    
    author = ma.Nested(UserSchema(only=('id', 'username')))
    category = ma.Nested(CategorySchema(only=('id', 'name')))
