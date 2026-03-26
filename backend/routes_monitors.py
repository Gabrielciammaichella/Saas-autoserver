from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import Monitor, User

monitors_bp = Blueprint("monitors", __name__)

@monitors_bp.get("", strict_slashes=False)
@jwt_required()
def list_monitors():
    user_id = int(get_jwt_identity())
    monitors = Monitor.query.filter_by(user_id=user_id).all()
    return jsonify([m.to_dict() for m in monitors]), 200


@monitors_bp.post("", strict_slashes=False)
@jwt_required()
def create_monitor():
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    name = (data.get("name") or "").strip()
    url = (data.get("url") or "").strip()
    interval_raw = data.get("interval_seconds", 60)

    if not name or not url:
        return jsonify({"error": "name y url son obligatorios"}), 400

    if not (url.startswith("http://") or url.startswith("https://")):
        url = "https://" + url

    try:
        interval = int(interval_raw)
    except (TypeError, ValueError):
        interval = 60

    if interval < 5:
        interval = 5
    if interval > 3600:
        interval = 3600

    # ✅ LÍMITE FREE/PRO
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Usuario no encontrado"}), 404

    if (user.plan or "FREE").upper() != "PRO":
        count = Monitor.query.filter_by(user_id=user_id).count()
        if count >= 3:
            return jsonify({
                "error": "Límite del plan FREE alcanzado (máx 3). Pasate a PRO para ilimitados."
            }), 402

    monitor = Monitor(
        user_id=user_id,
        name=name,
        url=url,
        interval_seconds=interval,
    )

    db.session.add(monitor)
    db.session.commit()

    return jsonify(monitor.to_dict()), 201


@monitors_bp.delete("/<int:monitor_id>", strict_slashes=False)
@jwt_required()
def delete_monitor(monitor_id: int):
    user_id = int(get_jwt_identity())

    monitor = Monitor.query.filter_by(id=monitor_id, user_id=user_id).first()
    if not monitor:
        return jsonify({"error": "Monitor no encontrado"}), 404

    db.session.delete(monitor)
    db.session.commit()
    return jsonify({"ok": True}), 200
