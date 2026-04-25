"""
wearable_routes.py
Flask Blueprint — all /api/live/* and /api/wesad/* endpoints

Mount in app.py:
    from wearable_routes import wearable_bp
    app.register_blueprint(wearable_bp)
"""

from flask import Blueprint, request, jsonify
import threading, time, json
from collections import deque
from wesad_parser import get_live_reading, load_wesad_dataset

wearable_bp = Blueprint("wearable", __name__)

# ── In-memory ring buffer for live readings (last 60) ─────────
_live_buffer  = deque(maxlen=60)
_stream_state = {"running": False, "state": "baseline", "device": "simulator"}
_buffer_lock  = threading.Lock()

def _stream_worker():
    """Background thread — generates one reading every 3 seconds."""
    while _stream_state["running"]:
        reading = get_live_reading(_stream_state["state"])
        with _buffer_lock:
            _live_buffer.append(reading)
        time.sleep(3)

# ── WESAD dataset cache ───────────────────────────────────────
_wesad_cache = {"loaded": False, "data": None, "summary": {}}

def _load_wesad():
    df = load_wesad_dataset()
    if df is not None:
        total    = len(df)
        stressed = int((df["label"] == 2).sum())
        baseline = int((df["label"] == 1).sum())
        amusement= int((df["label"] == 3).sum())
        subjects = int(df["subject"].nunique()) if "subject" in df.columns else "N/A"
        _wesad_cache["data"]    = df
        _wesad_cache["summary"] = {
            "total": total, "stressed": stressed,
            "baseline": baseline, "amusement": amusement,
            "stress_rate": round(stressed/total*100, 1),
            "subjects": subjects, "source": "real_wesad"
        }
    else:
        _wesad_cache["summary"] = {"source": "simulated", "note": "Place WESAD files in /wesad_data/"}
    _wesad_cache["loaded"] = True

# ════════════════════════════════════════════════════════════════
#  LIVE WEARABLE ROUTES
# ════════════════════════════════════════════════════════════════

@wearable_bp.route("/api/live/start", methods=["POST"])
def live_start():
    body  = request.get_json(force=True) or {}
    state = body.get("state", "baseline")
    _stream_state["state"]   = state
    _stream_state["device"]  = body.get("device", "simulator")
    if not _stream_state["running"]:
        _stream_state["running"] = True
        t = threading.Thread(target=_stream_worker, daemon=True)
        t.start()
    return jsonify({"status": "streaming", "state": state})

@wearable_bp.route("/api/live/stop", methods=["POST"])
def live_stop():
    _stream_state["running"] = False
    return jsonify({"status": "stopped"})

@wearable_bp.route("/api/live/state", methods=["POST"])
def live_set_state():
    body  = request.get_json(force=True) or {}
    state = body.get("state", "baseline")
    _stream_state["state"] = state
    get_live_reading(state)  # reset simulator
    return jsonify({"status": "ok", "state": state})

@wearable_bp.route("/api/live/latest")
def live_latest():
    """Returns the most recent reading + last 30 for sparkline."""
    with _buffer_lock:
        buf = list(_live_buffer)
    if not buf:
        buf = [get_live_reading(_stream_state["state"])]
    return jsonify({
        "latest":  buf[-1],
        "history": buf[-30:],
        "running": _stream_state["running"],
        "state":   _stream_state["state"],
        "device":  _stream_state["device"],
    })

@wearable_bp.route("/api/live/reading")
def live_single_reading():
    """One fresh reading on demand (for manual refresh)."""
    reading = get_live_reading(_stream_state["state"])
    with _buffer_lock:
        _live_buffer.append(reading)
    return jsonify(reading)

# ════════════════════════════════════════════════════════════════
#  WESAD DATASET ROUTES
# ════════════════════════════════════════════════════════════════

@wearable_bp.route("/api/wesad/load", methods=["POST"])
def wesad_load():
    if not _wesad_cache["loaded"]:
        threading.Thread(target=_load_wesad, daemon=True).start()
        return jsonify({"status": "loading"})
    return jsonify({"status": "ready", **_wesad_cache["summary"]})

@wearable_bp.route("/api/wesad/status")
def wesad_status():
    return jsonify({
        "loaded":  _wesad_cache["loaded"],
        "summary": _wesad_cache["summary"],
        "has_real_data": _wesad_cache.get("data") is not None
    })

@wearable_bp.route("/api/wesad/sample")
def wesad_sample():
    """Returns 50 random epochs from WESAD (or simulated)."""
    import numpy as np
    df = _wesad_cache.get("data")
    if df is not None:
        sample = df.sample(min(50, len(df))).to_dict(orient="records")
    else:
        # Simulated WESAD-style sample
        from wesad_parser import WearableStreamSimulator
        sim = WearableStreamSimulator()
        sample = []
        for state in (["baseline"]*20 + ["stress"]*20 + ["amusement"]*10):
            sim.set_state(state)
            r = sim.generate_reading()
            r["source"] = "simulated_wesad"
            sample.append(r)
    return jsonify({"records": sample, "count": len(sample)})

@wearable_bp.route("/api/wesad/subjects")
def wesad_subjects():
    df = _wesad_cache.get("data")
    if df is None:
        return jsonify({"subjects": [], "note": "WESAD not loaded"})
    subjects = []
    for subj in df["subject"].unique():
        sub = df[df["subject"] == subj]
        stressed = int((sub["label"] == 2).sum())
        total    = len(sub)
        subjects.append({
            "id":           subj,
            "total_epochs": total,
            "stress_pct":   round(stressed/total*100, 1),
            "avg_hrv":      round(sub["hrv_rmssd"].mean(), 1),
            "avg_stress_idx": round(sub["stress_index"].mean(), 1),
        })
    return jsonify({"subjects": subjects})

@wearable_bp.route("/api/wesad/signals/<subject>")
def wesad_signals(subject):
    df = _wesad_cache.get("data")
    if df is None:
        return jsonify({"error": "WESAD not loaded"}), 400
    sub = df[df["subject"] == subject].head(50)
    return jsonify({
        "subject": subject,
        "signals": sub[["hrv_rmssd","hrv_lf_hf","stress_index","label"]].to_dict(orient="records")
    })
