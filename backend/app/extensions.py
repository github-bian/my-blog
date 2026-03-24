from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_redis import FlaskRedis
from flask_marshmallow import Marshmallow

db = SQLAlchemy()
jwt = JWTManager()
cors = CORS()
redis_client = FlaskRedis()
ma = Marshmallow()
