import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()  # 🔥 importante

from config import Config
from extensions import db, jwt

def create_app():
    app = Flask(__name__, instance_relative_config=True)

    os.makedirs(os.path.join(os.path.dirname(__file__), "instance"), exist_ok=True)

    app.config.from_object(Config)

    CORS(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})

    db.init_app(app)
    jwt.init_app(app)

    from models import User, Monitor  # noqa: F401

    from routes_auth import auth_bp
    from routes_monitors import monitors_bp
    from routes_billing import billing_bp
    from routes_me import me_bp
    app.register_blueprint(me_bp, url_prefix="/api/me")
    
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(monitors_bp, url_prefix="/api/monitors")
    app.register_blueprint(billing_bp, url_prefix="/api/billing")
    
    @app.get("/api/health")
    def health():
        return jsonify({"ok": True, "service": "PingTrace API"})

    with app.app_context():
        db.create_all()

    return app

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
