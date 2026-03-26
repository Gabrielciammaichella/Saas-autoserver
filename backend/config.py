import os
from datetime import timedelta

def _csv(name: str, default: str):
    return [x.strip() for x in os.getenv(name, default).split(",") if x.strip()]

class Config:
    # ENV
    FLASK_ENV = os.getenv("FLASK_ENV", "development")
    DEBUG = FLASK_ENV != "production"

    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret")

    # JWT
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        seconds=int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES_SECONDS", str(60 * 60 * 24 * 7)))
    )
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_HEADER_NAME = "Authorization"
    JWT_HEADER_TYPE = "Bearer"

    # DB
    DB_PATH = os.path.join(os.path.dirname(__file__), "instance", "pingtrace.sqlite")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # CORS
    CORS_ORIGINS = _csv("CORS_ORIGINS", "http://localhost:5173")
