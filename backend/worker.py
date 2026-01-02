import time
from datetime import datetime, timezone

import requests

from app import create_app
from extensions import db
from models import Monitor


def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)  # naive UTC para SQLite


def should_check(m: Monitor) -> bool:
    if not m.last_checked_at:
        return True
    elapsed = (utcnow() - m.last_checked_at).total_seconds()
    return elapsed >= (m.interval_seconds or 60)


def check_one(m: Monitor, timeout_seconds: int = 10):
    started = time.perf_counter()
    try:
        r = requests.get(m.url, timeout=timeout_seconds, allow_redirects=True)
        latency_ms = int((time.perf_counter() - started) * 1000)

        m.last_code = r.status_code
        m.last_latency_ms = latency_ms
        m.last_status = "up" if 200 <= r.status_code < 400 else "down"
        m.last_checked_at = utcnow()
    except Exception:
        latency_ms = int((time.perf_counter() - started) * 1000)
        m.last_code = None
        m.last_latency_ms = latency_ms
        m.last_status = "down"
        m.last_checked_at = utcnow()


def run_once():
    app = create_app()
    with app.app_context():
        monitors = Monitor.query.all()
        touched = 0

        for m in monitors:
            if should_check(m):
                check_one(m)
                touched += 1

        if touched:
            db.session.commit()

        print(f"[worker] checked={touched} total={len(monitors)} at={utcnow().isoformat()}")


def run_forever(poll_seconds: int = 5):
    while True:
        run_once()
        time.sleep(poll_seconds)


if __name__ == "__main__":
    run_forever()
