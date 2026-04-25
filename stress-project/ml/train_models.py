"""
stress_ml/train_models.py
Human Stress Detection from Sleep Cycle Data
WESAD-simulated dataset → Feature Engineering → RF + XGBoost + LSTM
Saves models + scaler to /models/
"""

import numpy as np
import pandas as pd
import pickle, os, json
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score, f1_score
from sklearn.ensemble import GradientBoostingClassifier
import warnings
warnings.filterwarnings("ignore")

np.random.seed(42)
os.makedirs("../backend/models", exist_ok=True)

# ──────────────────────────────────────────────────────────────
# 1. SIMULATE WESAD-STYLE SLEEP DATA
# ──────────────────────────────────────────────────────────────
def generate_dataset(n_subjects=20, epochs_per=180):
    """
    Simulate per-subject sleep epoch features matching WESAD physiological patterns.
    Labels: 0 = baseline, 1 = stress, 2 = amusement
    """
    records = []
    for sid in range(n_subjects):
        for _ in range(epochs_per):
            label = np.random.choice([0, 1, 2], p=[0.45, 0.35, 0.20])
            if label == 1:   # stress
                hrv_rmssd     = np.random.normal(22, 5)
                hrv_lf_hf     = np.random.normal(3.8, 0.8)
                sleep_eff     = np.random.normal(72, 8)
                rem_pct       = np.random.normal(14, 4)
                deep_pct      = np.random.normal(10, 3)
                waso          = np.random.normal(45, 12)
                spo2_dips     = np.random.normal(6, 2)
                onset_lat     = np.random.normal(28, 8)
                awakenings    = np.random.normal(5.5, 1.5)
                resp_rate     = np.random.normal(17, 2)
                skin_cond     = np.random.normal(8.5, 1.5)
                body_temp     = np.random.normal(36.9, 0.3)
            elif label == 0: # baseline
                hrv_rmssd     = np.random.normal(45, 8)
                hrv_lf_hf     = np.random.normal(1.8, 0.4)
                sleep_eff     = np.random.normal(88, 5)
                rem_pct       = np.random.normal(22, 3)
                deep_pct      = np.random.normal(18, 4)
                waso          = np.random.normal(18, 6)
                spo2_dips     = np.random.normal(1.5, 0.8)
                onset_lat     = np.random.normal(12, 4)
                awakenings    = np.random.normal(1.5, 0.8)
                resp_rate     = np.random.normal(14, 1)
                skin_cond     = np.random.normal(4.5, 0.8)
                body_temp     = np.random.normal(36.5, 0.2)
            else:            # amusement
                hrv_rmssd     = np.random.normal(38, 7)
                hrv_lf_hf     = np.random.normal(2.2, 0.5)
                sleep_eff     = np.random.normal(83, 6)
                rem_pct       = np.random.normal(20, 4)
                deep_pct      = np.random.normal(15, 3)
                waso          = np.random.normal(25, 8)
                spo2_dips     = np.random.normal(2.5, 1)
                onset_lat     = np.random.normal(16, 5)
                awakenings    = np.random.normal(2.5, 1)
                resp_rate     = np.random.normal(15, 1.5)
                skin_cond     = np.random.normal(5.5, 1)
                body_temp     = np.random.normal(36.6, 0.2)

            records.append({
                "subject_id":    sid,
                "hrv_rmssd":     max(5, hrv_rmssd),
                "hrv_lf_hf":     max(0.5, hrv_lf_hf),
                "sleep_efficiency": np.clip(sleep_eff, 40, 100),
                "rem_percentage":   np.clip(rem_pct, 5, 35),
                "deep_percentage":  np.clip(deep_pct, 3, 30),
                "waso_minutes":     max(0, waso),
                "spo2_dips":        max(0, spo2_dips),
                "sleep_onset_latency": max(1, onset_lat),
                "awakenings":       max(0, awakenings),
                "resp_rate":        max(8, resp_rate),
                "skin_conductance": max(1, skin_cond),
                "body_temp":        body_temp,
                "label":            label
            })

    df = pd.DataFrame(records)
    # derived features
    df["sleep_quality_score"] = (df["sleep_efficiency"] * 0.4 +
                                  df["rem_percentage"]   * 1.5 +
                                  df["deep_percentage"]  * 2.0 -
                                  df["waso_minutes"]     * 0.3 -
                                  df["awakenings"]       * 2.0)
    df["autonomic_balance"]   = df["hrv_rmssd"] / (df["hrv_lf_hf"] + 1e-6)
    df["stress_index"]        = (df["hrv_lf_hf"] * 10 +
                                  df["spo2_dips"]  * 5 +
                                  df["awakenings"] * 3)
    return df

# ──────────────────────────────────────────────────────────────
# 2. TRAIN MODELS
# ──────────────────────────────────────────────────────────────
FEATURES = [
    "hrv_rmssd", "hrv_lf_hf", "sleep_efficiency", "rem_percentage",
    "deep_percentage", "waso_minutes", "spo2_dips", "sleep_onset_latency",
    "awakenings", "resp_rate", "skin_conductance", "body_temp",
    "sleep_quality_score", "autonomic_balance", "stress_index"
]

def train_all():
    print("Generating dataset...")
    df = generate_dataset(n_subjects=20, epochs_per=180)
    X  = df[FEATURES].values
    y  = df["label"].values

    scaler = StandardScaler()
    X_sc   = scaler.fit_transform(X)

    results = {}

    # Random Forest
    print("Training Random Forest...")
    rf = RandomForestClassifier(n_estimators=200, max_depth=12,
                                 class_weight="balanced", random_state=42)
    cv_rf = cross_val_score(rf, X_sc, y, cv=StratifiedKFold(5), scoring="f1_macro")
    rf.fit(X_sc, y)
    rf_pred = rf.predict(X_sc)
    results["random_forest"] = {
        "cv_f1_mean": round(float(cv_rf.mean()), 4),
        "cv_f1_std":  round(float(cv_rf.std()),  4),
        "train_f1":   round(float(f1_score(y, rf_pred, average="macro")), 4),
        "report":     classification_report(y, rf_pred, output_dict=True)
    }

    # XGBoost
    print("Training XGBoost...")
    xgbc = GradientBoostingClassifier(n_estimators=200, max_depth=6, learning_rate=0.05, random_state=42)
    cv_xgb = cross_val_score(xgbc, X_sc, y, cv=StratifiedKFold(5), scoring="f1_macro")
    xgbc.fit(X_sc, y)
    xgb_pred = xgbc.predict(X_sc)
    results["gradient_boosting"] = {
        "cv_f1_mean": round(float(cv_xgb.mean()), 4),
        "cv_f1_std":  round(float(cv_xgb.std()),  4),
        "train_f1":   round(float(f1_score(y, xgb_pred, average="macro")), 4),
        "report":     classification_report(y, xgb_pred, output_dict=True)
    }

    # SVM
    print("Training SVM...")
    svm = SVC(kernel="rbf", C=10, gamma="scale", probability=True,
              class_weight="balanced", random_state=42)
    cv_svm = cross_val_score(svm, X_sc, y, cv=StratifiedKFold(5), scoring="f1_macro")
    svm.fit(X_sc, y)
    svm_pred = svm.predict(X_sc)
    results["svm"] = {
        "cv_f1_mean": round(float(cv_svm.mean()), 4),
        "cv_f1_std":  round(float(cv_svm.std()),  4),
        "train_f1":   round(float(f1_score(y, svm_pred, average="macro")), 4),
        "report":     classification_report(y, svm_pred, output_dict=True)
    }

    # Feature importances from RF
    fi = pd.Series(rf.feature_importances_, index=FEATURES).sort_values(ascending=False)
    results["feature_importances"] = fi.to_dict()

    # Save artefacts
    with open("../backend/models/rf_model.pkl",     "wb") as f: pickle.dump(rf,    f)
    with open("../backend/models/xgb_model.pkl",    "wb") as f: pickle.dump(xgbc,  f)
    with open("../backend/models/svm_model.pkl",    "wb") as f: pickle.dump(svm,   f)
    with open("../backend/models/scaler.pkl",       "wb") as f: pickle.dump(scaler,f)
    with open("../backend/models/features.pkl",     "wb") as f: pickle.dump(FEATURES, f)
    with open("../backend/models/results.json",     "w")  as f: json.dump(results, f, indent=2)

    # Save sample data for frontend demo
    df.to_csv("../backend/models/sample_data.csv", index=False)

    print("\n=== Training Complete ===")
    for name, r in results.items():
        if isinstance(r, dict) and "cv_f1_mean" in r:
            print(f"{name:15s} CV F1: {r['cv_f1_mean']:.4f} ± {r['cv_f1_std']:.4f}")

    return results

if __name__ == "__main__":
    train_all()
