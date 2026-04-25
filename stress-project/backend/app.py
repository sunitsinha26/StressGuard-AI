"""
backend/app.py  —  StressGuard AI · Full Flask API
"""
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import pickle, json, os
import numpy as np
import pandas as pd
from functools import wraps

from database import (init_db, hash_password, create_session, validate_token,
                      save_prediction, get_patient_history, get_all_patients, get_db)
from pdf_report import generate_report_bytes
from wearable_routes import wearable_bp

app = Flask(__name__)
CORS(app, supports_credentials=True)
app.register_blueprint(wearable_bp)

BASE      = os.path.dirname(__file__)
MODEL_DIR = os.path.join(BASE, "models")

def load(fname):
    with open(os.path.join(MODEL_DIR, fname), "rb") as f:
        return pickle.load(f)

rf_model  = load("rf_model.pkl")
xgb_model = load("xgb_model.pkl")
svm_model = load("svm_model.pkl")
scaler    = load("scaler.pkl")
FEATURES  = load("features.pkl")

with open(os.path.join(MODEL_DIR, "results.json")) as f:
    RESULTS = json.load(f)

df_sample = pd.read_csv(os.path.join(MODEL_DIR, "sample_data.csv"))
LABEL_MAP = {0: "Baseline", 1: "Stressed", 2: "Amusement"}
COLOR_MAP  = {0: "#10b981", 1: "#ef4444",  2: "#f59e0b"}
MODEL_MAP  = {"rf": rf_model, "xgb": xgb_model, "svm": svm_model}

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        user  = validate_token(token)
        if not user:
            return jsonify({"error": "Unauthorized"}), 401
        request.current_user = user
        return f(*args, **kwargs)
    return decorated

def predict_one(data, model_key="rf"):
    vec   = np.array([[data.get(f, 0) for f in FEATURES]])
    vec   = scaler.transform(vec)
    model = MODEL_MAP.get(model_key, rf_model)
    pred  = int(model.predict(vec)[0])
    proba = model.predict_proba(vec)[0].tolist()
    return {
        "prediction": pred,
        "label":      LABEL_MAP[pred],
        "color":      COLOR_MAP[pred],
        "confidence": round(max(proba) * 100, 1),
        "probabilities": {LABEL_MAP[i]: round(p*100, 1) for i, p in enumerate(proba)}
    }

# AUTH
@app.route("/api/auth/login", methods=["POST"])
def login():
    body = request.get_json(force=True)
    conn = get_db()
    user = conn.execute(
        "SELECT * FROM users WHERE username=? AND password=?",
        (body.get("username","").strip(), hash_password(body.get("password","")))
    ).fetchone()
    conn.close()
    if not user:
        return jsonify({"error": "Invalid credentials"}), 401
    token = create_session(user["id"])
    return jsonify({"token": token,
                    "user": {"id":user["id"],"username":user["username"],
                             "role":user["role"],"full_name":user["full_name"]}})

@app.route("/api/auth/logout", methods=["POST"])
@require_auth
def logout():
    token = request.headers.get("Authorization","").replace("Bearer ","")
    conn  = get_db()
    conn.execute("DELETE FROM sessions WHERE token=?", (token,))
    conn.commit(); conn.close()
    return jsonify({"message": "Logged out"})

@app.route("/api/auth/me")
@require_auth
def me():
    return jsonify(request.current_user)

# PATIENTS
@app.route("/api/patients")
@require_auth
def patients():
    return jsonify(get_all_patients())

@app.route("/api/patients", methods=["POST"])
@require_auth
def create_patient():
    body = request.get_json(force=True)
    import random, string
    pid  = "PAT" + "".join(random.choices(string.digits, k=4))
    conn = get_db()
    conn.execute(
        "INSERT INTO patients (patient_id,name,age,gender,notes,created_by) VALUES (?,?,?,?,?,?)",
        (pid, body["name"], body.get("age"), body.get("gender"),
         body.get("notes",""), request.current_user["id"])
    )
    conn.commit(); conn.close()
    return jsonify({"patient_id": pid, "message": "Patient created"})

@app.route("/api/patients/<patient_id>/history")
@require_auth
def patient_history(patient_id):
    return jsonify({"patient_id": patient_id, "history": get_patient_history(patient_id)})

@app.route("/api/patients/<patient_id>/report")
@require_auth
def patient_report(patient_id):
    conn    = get_db()
    patient = conn.execute("SELECT * FROM patients WHERE patient_id=?", (patient_id,)).fetchone()
    conn.close()
    if not patient:
        return jsonify({"error": "Patient not found"}), 404
    history  = get_patient_history(patient_id)
    total    = len(history)
    stressed = sum(1 for h in history if h["label"]=="Stressed")
    avg_eff  = sum(h.get("sleep_efficiency") or 0 for h in history) / max(total,1)
    avg_hrv  = sum(h.get("hrv_rmssd") or 0 for h in history) / max(total,1)
    summary  = {"total":total, "stress_pct":round(stressed/max(total,1)*100,1),
                "avg_sleep_eff":round(avg_eff,1), "avg_hrv":round(avg_hrv,1)}
    html_bytes = generate_report_bytes(dict(patient), history, summary)
    return Response(html_bytes, mimetype="text/html",
                    headers={"Content-Disposition": f'attachment; filename="report_{patient_id}.html"'})

# PREDICT
@app.route("/api/predict", methods=["POST"])
@require_auth
def predict():
    body       = request.get_json(force=True)
    model_key  = body.pop("model","rf")
    patient_id = body.pop("patient_id",None)
    try:
        result = predict_one(body, model_key)
        if patient_id:
            save_prediction(patient_id, result, body, model_key, request.current_user["id"])
        return jsonify({"success":True, **result})
    except Exception as e:
        return jsonify({"success":False, "error":str(e)}), 400

@app.route("/api/predict/batch", methods=["POST"])
@require_auth
def predict_batch():
    body    = request.get_json(force=True)
    results = [predict_one(r, body.get("model","rf")) for r in body.get("records",[])]
    return jsonify({"success":True, "predictions":results, "count":len(results)})

# ── Simple-input pipeline ───────────────────────────────────────────────────
def derive_features(sleep_hours, oxygen_level, heart_rate, workload):
    """Convert plain user inputs into the 15 ML features expected by the model."""
    wl = {"Low": 0, "Medium": 1, "High": 2}.get(workload, 1)
    sleep_efficiency    = min(100, max(40, (sleep_hours / 8) * 100))
    rem_percentage      = max(5,   22 - wl * 3)
    deep_percentage     = max(3,   15 - wl * 2)
    waso_minutes        = max(0,   10 + (8 - sleep_hours) * 5 + wl * 8)
    spo2_dips           = max(0,   (100 - oxygen_level) * 1.5)
    hrv_rmssd           = max(5,   50 - (heart_rate - 60) * 0.5 - wl * 5)
    hrv_lf_hf           = round(1.0 + wl * 0.8 + (heart_rate - 60) * 0.02, 2)
    resp_rate           = round(12 + (heart_rate - 60) * 0.1, 1)
    skin_conductance    = round(3 + wl * 2.5, 1)
    body_temp           = 36.6
    sleep_onset_latency = max(5, waso_minutes / 2)
    awakenings          = max(0, round(waso_minutes / 15))
    sleep_quality_score = (sleep_efficiency * 0.4 + rem_percentage * 1.5
                           + deep_percentage * 2 - waso_minutes * 0.3)
    autonomic_balance   = hrv_rmssd / (hrv_lf_hf + 1e-6)
    stress_index        = min(100, max(0, hrv_lf_hf * 10 + spo2_dips * 5 + wl * 10))
    return {
        "hrv_rmssd": hrv_rmssd, "hrv_lf_hf": hrv_lf_hf,
        "sleep_efficiency": sleep_efficiency, "rem_percentage": rem_percentage,
        "deep_percentage": deep_percentage, "waso_minutes": waso_minutes,
        "spo2_dips": spo2_dips, "sleep_onset_latency": sleep_onset_latency,
        "awakenings": awakenings, "resp_rate": resp_rate,
        "skin_conductance": skin_conductance, "body_temp": body_temp,
        "sleep_quality_score": sleep_quality_score,
        "autonomic_balance": autonomic_balance, "stress_index": stress_index,
    }

def make_insight(label, sleep_hours, oxygen_level, heart_rate, workload):
    """Build a human-readable insight string from inputs and prediction label."""
    reasons = []
    if sleep_hours  < 6:        reasons.append("low sleep duration")
    if oxygen_level < 96:       reasons.append("reduced SpO\u2082 saturation")
    if heart_rate   > 90:       reasons.append("elevated heart rate")
    if workload == "High":      reasons.append("high workload pressure")
    icon = "\u26a0\ufe0f" if label == "Stressed" else ("\u2705" if label == "Baseline" else "\U0001f60c")
    base = (f"{icon} High stress detected" if label == "Stressed"
            else f"{icon} Normal stress level" if label == "Baseline"
            else f"{icon} Low stress \u2014 relaxed state")
    return f"{base} due to {' and '.join(reasons)}" if reasons else base

@app.route("/api/predict/simple", methods=["POST"])
@require_auth
def predict_simple():
    """Accept plain-language health inputs, derive ML features, run prediction."""
    body = request.get_json(force=True)
    try:
        sleep_hours  = float(body.get("sleep_hours",  7))
        oxygen_level = float(body.get("oxygen_level", 98))
        heart_rate   = float(body.get("heart_rate",   72))
        workload     = str(body.get("workload",        "Medium"))
        patient_id   = body.get("patient_id", None)
        model_key    = body.get("model", "rf")

        features = derive_features(sleep_hours, oxygen_level, heart_rate, workload)
        result   = predict_one(features, model_key)

        if patient_id:
            save_prediction(patient_id, result, features, model_key,
                            request.current_user["id"])

        insight = make_insight(result["label"], sleep_hours, oxygen_level,
                               heart_rate, workload)
        return jsonify({
            "success": True, **result,
            "insight": insight,
            "inputs":  {"sleep_hours": sleep_hours, "oxygen_level": oxygen_level,
                        "heart_rate": heart_rate, "workload": workload},
            "derived_features": features,
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

# METRICS
@app.route("/api/model/metrics")
@require_auth
def model_metrics():
    summary = {}
    for name in ["random_forest","gradient_boosting","svm"]:
        r = RESULTS.get(name,{})
        summary[name] = {"cv_f1":r.get("cv_f1_mean"),"cv_std":r.get("cv_f1_std"),"train_f1":r.get("train_f1")}
    summary["feature_importances"] = RESULTS.get("feature_importances",{})
    return jsonify(summary)

# DEMO (no auth)
@app.route("/api/health")
def health():
    return jsonify({"status":"ok"})

@app.route("/api/demo/overview")
def demo_overview():
    total=len(df_sample); stressed=int((df_sample["label"]==1).sum())
    return jsonify({"total_records":total,"stressed":stressed,
        "baseline":int((df_sample["label"]==0).sum()),
        "amusement":int((df_sample["label"]==2).sum()),
        "stress_rate":round(stressed/total*100,1),
        "avg_sleep_eff":round(df_sample["sleep_efficiency"].mean(),1),
        "avg_hrv":round(df_sample["hrv_rmssd"].mean(),1),
        "subjects":int(df_sample["subject_id"].nunique())})

@app.route("/api/demo/subjects")
def demo_subjects():
    out=[]
    for sid in df_sample["subject_id"].unique()[:12]:
        sub=df_sample[df_sample["subject_id"]==sid]; total=len(sub)
        sp=round(int((sub["label"]==1).sum())/total*100,1)
        out.append({"id":int(sid),"name":f"Subject {int(sid)+1:02d}",
            "stress_level":"High" if sp>40 else("Moderate" if sp>20 else "Low"),
            "stress_pct":sp,"avg_sleep_eff":round(sub["sleep_efficiency"].mean(),1),
            "avg_hrv":round(sub["hrv_rmssd"].mean(),1),"total_epochs":total})
    return jsonify(out)

@app.route("/api/demo/trend/<int:subject_id>")
def demo_trend(subject_id):
    sub=df_sample[df_sample["subject_id"]==subject_id].head(14)
    nights=[{"night":i+1,"sleep_efficiency":round(row["sleep_efficiency"],1),
              "hrv_rmssd":round(row["hrv_rmssd"],1),"rem_pct":round(row["rem_percentage"],1),
              "deep_pct":round(row["deep_percentage"],1),"stress_index":round(row["stress_index"],1),
              "label":LABEL_MAP[int(row["label"])],"waso":round(row["waso_minutes"],1)}
             for i,(_,row) in enumerate(sub.iterrows())]
    return jsonify({"subject_id":subject_id,"nights":nights})

if __name__=="__main__":
    init_db()
    print("Database initialised. Starting server…")
    app.run(debug=True, port=5000)
