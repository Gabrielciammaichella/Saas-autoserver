# routes_billing.py
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models import User

billing_bp = Blueprint("billing", __name__)

@billing_bp.post("/upgrade")
@jwt_required()
def upgrade():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Usuario no encontrado"}), 404

    user.plan = User.PLAN_PRO
    db.session.commit()

    return jsonify({"ok": True, "user": user.to_dict()}), 200
