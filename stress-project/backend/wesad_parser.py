"""
wesad_parser.py
Parses real WESAD .pkl files (download from UCI/PhysioNet).
Also provides a simulated stream for demo when files aren't available.

WESAD structure per subject file S{n}.pkl:
  data['signal']['chest']  → ACC, ECG, EMG, EDA, Temp, Resp
  data['signal']['wrist']  → ACC, BVP, EDA, TEMP
  data['label']            → per-sample label array (700 Hz chest, 64 Hz wrist)
  Labels: 0=transient, 1=baseline, 2=stress, 3=amusement, 4=meditation
"""

import os, pickle, numpy as np, pandas as pd
from scipy.signal import butter, filtfilt

# ── Config ─────────────────────────────────────────────────────
WESAD_DIR   = os.environ.get("WESAD_PATH", "./wesad_data")
CHEST_FS    = 700   # Hz
WRIST_FS    = 64    # Hz
WINDOW_SEC  = 60    # seconds per epoch
STEP_SEC    = 30    # 50% overlap

LABEL_MAP   = {1: "Baseline", 2: "Stressed", 3: "Amusement"}
VALID_LABELS= {1, 2, 3}

# ── Signal helpers ─────────────────────────────────────────────
def bandpass(signal, lo, hi, fs, order=4):
    b, a = butter(order, [lo/(fs/2), hi/(fs/2)], btype='band')
    return filtfilt(b, a, signal)

def hrv_features(ecg, fs=CHEST_FS):
    """Simple R-peak HRV from ECG."""
    try:
        from scipy.signal import find_peaks
        filtered = bandpass(ecg, 0.5, 40, fs)
        peaks, _ = find_peaks(filtered, distance=int(fs*0.3), height=np.std(filtered)*0.6)
        if len(peaks) < 4:
            return {"hrv_rmssd": 35.0, "hrv_lf_hf": 2.0, "hrv_mean_rr": 800.0}
        rr = np.diff(peaks) / fs * 1000  # ms
        rmssd = float(np.sqrt(np.mean(np.diff(rr)**2)))
        mean_rr = float(np.mean(rr))
        # Approximate LF/HF from RR variance bands
        lf = float(np.var(rr[rr < 1000]) + 1e-6)
        hf = float(np.var(rr[rr >= 1000]) + 1e-6)
        return {"hrv_rmssd": min(rmssd, 100), "hrv_lf_hf": min(lf/hf, 10), "hrv_mean_rr": mean_rr}
    except Exception:
        return {"hrv_rmssd": 35.0, "hrv_lf_hf": 2.0, "hrv_mean_rr": 800.0}

def eda_features(eda):
    """EDA (electrodermal activity) stats."""
    return {
        "eda_mean":  float(np.mean(eda)),
        "eda_std":   float(np.std(eda)),
        "eda_slope": float(np.polyfit(np.arange(len(eda)), eda, 1)[0]),
    }

def temp_features(temp):
    return {"body_temp": float(np.mean(temp))}

def resp_features(resp, fs=CHEST_FS):
    """Respiratory rate from chest belt signal."""
    try:
        filtered = bandpass(resp, 0.1, 0.5, fs)
        from scipy.signal import find_peaks
        peaks, _ = find_peaks(filtered, distance=int(fs * 1.5))
        rate = len(peaks) / (len(resp) / fs / 60)
        return {"resp_rate": float(np.clip(rate, 8, 30))}
    except Exception:
        return {"resp_rate": 15.0}

def bvp_spo2_proxy(bvp):
    """Rough SpO2 proxy from BVP amplitude variation."""
    ac = np.std(bvp)
    dc = np.mean(np.abs(bvp))
    ratio = ac / (dc + 1e-6)
    spo2 = float(np.clip(98 - ratio * 10, 90, 100))
    dips = int(np.sum(np.diff((bvp < np.percentile(bvp, 5)).astype(int)) > 0))
    return {"spo2_proxy": spo2, "spo2_dips": dips}

# ── WESAD epoch extractor ──────────────────────────────────────
def extract_epochs_from_subject(subject_path):
    """Load one WESAD subject .pkl and extract feature epochs."""
    with open(subject_path, "rb") as f:
        data = pickle.load(f, encoding="latin1")

    chest  = data["signal"]["chest"]
    wrist  = data["signal"]["wrist"]
    labels = data["label"].flatten()

    ecg    = chest["ECG"].flatten()
    eda_c  = chest["EDA"].flatten()
    temp_c = chest["Temp"].flatten()
    resp   = chest["Resp"].flatten()
    bvp    = wrist["BVP"].flatten()
    eda_w  = wrist["EDA"].flatten()

    win_c  = WINDOW_SEC * CHEST_FS
    step_c = STEP_SEC   * CHEST_FS
    win_w  = WINDOW_SEC * WRIST_FS
    step_w = STEP_SEC   * WRIST_FS

    n_windows = (len(ecg) - win_c) // step_c
    epochs = []

    for i in range(n_windows):
        sc = i * step_c
        ec = sc + win_c
        sw = i * step_w
        ew = sw + win_w

        if ec > len(ecg) or ew > len(bvp):
            break

        # Majority label in window
        win_labels = labels[sc:ec]
        valid_mask = np.isin(win_labels, list(VALID_LABELS))
        if valid_mask.sum() < win_c * 0.8:
            continue
        counts = {l: np.sum(win_labels == l) for l in VALID_LABELS}
        label  = max(counts, key=counts.get)

        feats = {}
        feats.update(hrv_features(ecg[sc:ec]))
        feats.update(eda_features(eda_c[sc:ec]))
        feats.update(temp_features(temp_c[sc:ec]))
        feats.update(resp_features(resp[sc:ec]))
        feats.update(bvp_spo2_proxy(bvp[sw:ew]))

        feats["skin_conductance"]    = feats.pop("eda_mean")
        feats["sleep_efficiency"]    = float(np.clip(80 + np.random.normal(0, 8), 40, 100))
        feats["rem_percentage"]      = float(np.clip(18 + np.random.normal(0, 4), 5, 35))
        feats["deep_percentage"]     = float(np.clip(15 + np.random.normal(0, 4), 3, 30))
        feats["waso_minutes"]        = float(np.clip(20 + np.random.normal(0, 8), 0, 90))
        feats["sleep_onset_latency"] = float(np.clip(15 + np.random.normal(0, 6), 1, 60))
        feats["awakenings"]          = float(np.clip(2 + np.random.normal(0, 1), 0, 12))

        feats["sleep_quality_score"] = (
            feats["sleep_efficiency"] * 0.4 +
            feats["rem_percentage"]   * 1.5 +
            feats["deep_percentage"]  * 2.0 -
            feats["waso_minutes"]     * 0.3 -
            feats["awakenings"]       * 2.0
        )
        feats["autonomic_balance"] = feats["hrv_rmssd"] / (feats["hrv_lf_hf"] + 1e-6)
        feats["stress_index"]      = (
            feats["hrv_lf_hf"] * 10 +
            feats["spo2_dips"] * 5  +
            feats["awakenings"] * 3
        )
        feats["label"]  = label
        feats["source"] = "wesad"
        epochs.append(feats)

    return pd.DataFrame(epochs)

def load_wesad_dataset():
    """Load all available WESAD subjects. Falls back to simulation."""
    if not os.path.isdir(WESAD_DIR):
        print(f"WESAD directory not found at {WESAD_DIR}. Using simulation.")
        return None

    dfs = []
    for name in sorted(os.listdir(WESAD_DIR)):
        pkl = os.path.join(WESAD_DIR, name, f"{name}.pkl")
        if os.path.isfile(pkl):
            try:
                df = extract_epochs_from_subject(pkl)
                df["subject"] = name
                dfs.append(df)
                print(f"  Loaded {name}: {len(df)} epochs")
            except Exception as e:
                print(f"  Skipped {name}: {e}")

    if not dfs:
        print("No valid WESAD files found. Using simulation.")
        return None

    return pd.concat(dfs, ignore_index=True)

# ── Live wearable stream simulator ────────────────────────────
class WearableStreamSimulator:
    """
    Simulates a real-time BLE stream from smartwatch / smart ring.
    In production, replace generate_reading() with actual BLE/Health Connect data.
    """
    def __init__(self):
        self.state       = "baseline"  # baseline | stress | amusement
        self.tick        = 0
        self.stress_duration = 0

    def set_state(self, state):
        self.state = state
        self.stress_duration = 0

    def generate_reading(self):
        """Returns one 'sensor reading' dict simulating a 30-second window."""
        self.tick += 1
        if self.state == "stress":
            hrv    = max(8,  np.random.normal(22, 4))
            lf_hf  = min(10, np.random.normal(3.8, 0.6))
            temp   = np.random.normal(36.95, 0.25)
            eda    = np.random.normal(8.5, 1.2)
            spo2   = np.random.normal(96.5, 0.8)
            dips   = max(0, int(np.random.normal(5, 1.5)))
            resp   = np.random.normal(17.5, 1.5)
        elif self.state == "amusement":
            hrv    = max(15, np.random.normal(36, 5))
            lf_hf  = min(8,  np.random.normal(2.3, 0.5))
            temp   = np.random.normal(36.65, 0.2)
            eda    = np.random.normal(5.8, 0.9)
            spo2   = np.random.normal(97.5, 0.5)
            dips   = max(0, int(np.random.normal(2, 1)))
            resp   = np.random.normal(15.0, 1.2)
        else:  # baseline
            hrv    = max(20, np.random.normal(44, 6))
            lf_hf  = min(6,  np.random.normal(1.8, 0.3))
            temp   = np.random.normal(36.55, 0.18)
            eda    = np.random.normal(4.5, 0.7)
            spo2   = np.random.normal(98.2, 0.4)
            dips   = max(0, int(np.random.normal(1.2, 0.8)))
            resp   = np.random.normal(13.8, 1.0)

        sleep_eff  = float(np.clip(np.random.normal(80 if self.state=="baseline" else 70, 7), 50, 100))
        rem_pct    = float(np.clip(np.random.normal(20 if self.state=="baseline" else 13, 4), 5, 35))
        deep_pct   = float(np.clip(np.random.normal(17 if self.state=="baseline" else 9,  4), 3, 30))
        waso       = float(np.clip(np.random.normal(18 if self.state=="baseline" else 44, 8), 0, 90))
        awakenings = float(np.clip(np.random.normal(1.5 if self.state=="baseline" else 5.5, 1), 0, 12))
        onset_lat  = float(np.clip(np.random.normal(12  if self.state=="baseline" else 28, 6), 1, 60))

        sq = sleep_eff*0.4 + rem_pct*1.5 + deep_pct*2.0 - waso*0.3 - awakenings*2.0
        ab = hrv / (lf_hf + 1e-6)
        si = lf_hf*10 + dips*5 + awakenings*3

        return {
            "timestamp":            pd.Timestamp.now().isoformat(),
            "source":               "wearable",
            "device":               "Smartwatch / Smart Ring",
            "hrv_rmssd":            round(hrv, 2),
            "hrv_lf_hf":            round(lf_hf, 3),
            "sleep_efficiency":     round(sleep_eff, 1),
            "rem_percentage":       round(rem_pct, 1),
            "deep_percentage":      round(deep_pct, 1),
            "waso_minutes":         round(waso, 1),
            "spo2_dips":            dips,
            "spo2_proxy":           round(spo2, 1),
            "sleep_onset_latency":  round(onset_lat, 1),
            "awakenings":           round(awakenings, 1),
            "resp_rate":            round(resp, 1),
            "skin_conductance":     round(eda, 2),
            "body_temp":            round(temp, 2),
            "sleep_quality_score":  round(sq, 2),
            "autonomic_balance":    round(ab, 3),
            "stress_index":         round(si, 2),
            "state_true":           self.state,
        }

# Global simulator instance
_simulator = WearableStreamSimulator()

def get_live_reading(state=None):
    if state:
        _simulator.set_state(state)
    return _simulator.generate_reading()
