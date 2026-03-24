from flask import Flask
from app.config import Config
from app.extensions import db, jwt, cors, redis_client, ma

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app)
    redis_client.init_app(app)
    ma.init_app(app)

    # Register blueprints
    from app.routes import auth, articles, categories
    app.register_blueprint(auth.bp)
    app.register_blueprint(articles.bp)
    app.register_blueprint(categories.bp)

    # Create tables
    with app.app_context():
        db.create_all()

    return app
