from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from extensions import db
from models import User

auth_bp = Blueprint("auth", __name__)

@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "email y password son requeridos"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Ese email ya está registrado"}), 409

    user = User(email=email, plan=User.PLAN_FREE)
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=user.id)
    return jsonify({"access_token": token, "user": user.to_dict()}), 201


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Credenciales inválidas"}), 401

    token = create_access_token(identity=user.id)
    return jsonify({"access_token": token, "user": user.to_dict()}), 200


# ✅ NUEVO: traer usuario actual (plan, email, etc.)
@auth_bp.get("/me")
@jwt_required()
def me():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Usuario no encontrado"}), 404
    return jsonify({"user": user.to_dict()}), 200


# ✅ NUEVO: upgrade mock a PRO (sin pagos)
@auth_bp.post("/upgrade")
@jwt_required()
def upgrade():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Usuario no encontrado"}), 404

    user.plan = User.PLAN_PRO
    db.session.commit()

    return jsonify({"ok": True, "user": user.to_dict()}), 200
