"""
database.py — SQLite setup for StressGuard AI
Tables: users, patients, predictions, reports
"""
import sqlite3, hashlib, os, secrets
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "stressguard.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()

    c.executescript("""
    CREATE TABLE IF NOT EXISTS users (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        username    TEXT UNIQUE NOT NULL,
        password    TEXT NOT NULL,
        role        TEXT NOT NULL DEFAULT 'doctor',
        full_name   TEXT,
        created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS patients (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id  TEXT UNIQUE NOT NULL,
        name        TEXT NOT NULL,
        age         INTEGER,
        gender      TEXT,
        notes       TEXT,
        created_by  INTEGER REFERENCES users(id),
        created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS predictions (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id      TEXT REFERENCES patients(patient_id),
        model_used      TEXT,
        label           TEXT,
        confidence      REAL,
        stress_prob     REAL,
        baseline_prob   REAL,
        amusement_prob  REAL,
        hrv_rmssd       REAL,
        hrv_lf_hf       REAL,
        sleep_efficiency REAL,
        rem_percentage  REAL,
        deep_percentage REAL,
        waso_minutes    REAL,
        spo2_dips       REAL,
        sleep_onset_latency REAL,
        awakenings      REAL,
        resp_rate       REAL,
        skin_conductance REAL,
        body_temp       REAL,
        stress_index    REAL,
        sleep_quality_score REAL,
        created_by      INTEGER REFERENCES users(id),
        created_at      TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
        token       TEXT PRIMARY KEY,
        user_id     INTEGER REFERENCES users(id),
        expires_at  TEXT,
        created_at  TEXT DEFAULT (datetime('now'))
    );
    """)

    # Seed default users
    def hash_pw(pw):
        return hashlib.sha256(pw.encode()).hexdigest()

    c.execute("SELECT COUNT(*) FROM users")
    if c.fetchone()[0] == 0:
        c.executemany("INSERT INTO users (username, password, role, full_name) VALUES (?,?,?,?)", [
            ("admin",   hash_pw("admin123"),  "admin",  "Dr. Admin"),
            ("doctor1", hash_pw("doctor123"), "doctor", "Dr. Priya Sharma"),
            ("doctor2", hash_pw("doctor456"), "doctor", "Dr. Ravi Kumar"),
        ])
        # Seed sample patients
        import random, string
        random.seed(42)
        names = ["Amit Singh","Priya Patel","Rohit Verma","Sneha Gupta","Arjun Mehta",
                 "Pooja Yadav","Vikram Joshi","Ananya Das","Suresh Nair","Meera Reddy"]
        for i, name in enumerate(names):
            pid = f"PAT{str(i+1).padStart if False else str(i+1).zfill(3)}"
            c.execute("""INSERT OR IGNORE INTO patients
                         (patient_id, name, age, gender, notes, created_by)
                         VALUES (?,?,?,?,?,1)""",
                      (f"PAT{str(i+1).zfill(3)}", name,
                       random.randint(22, 58),
                       random.choice(["Male","Female"]),
                       "WESAD study participant"))
        conn.commit()

    conn.close()

def hash_password(pw):
    return hashlib.sha256(pw.encode()).hexdigest()

def create_session(user_id):
    token = secrets.token_hex(32)
    from datetime import timedelta
    expires = (datetime.utcnow() + timedelta(hours=8)).isoformat()
    conn = get_db()
    conn.execute("DELETE FROM sessions WHERE user_id=?", (user_id,))
    conn.execute("INSERT INTO sessions (token, user_id, expires_at) VALUES (?,?,?)",
                 (token, user_id, expires))
    conn.commit()
    conn.close()
    return token

def validate_token(token):
    if not token:
        return None
    conn = get_db()
    row = conn.execute("""
        SELECT u.id, u.username, u.role, u.full_name
        FROM sessions s JOIN users u ON s.user_id=u.id
        WHERE s.token=? AND s.expires_at > datetime('now')
    """, (token,)).fetchone()
    conn.close()
    return dict(row) if row else None

def save_prediction(patient_id, result, inputs, model_used, user_id):
    conn = get_db()
    conn.execute("""
        INSERT INTO predictions
        (patient_id, model_used, label, confidence,
         stress_prob, baseline_prob, amusement_prob,
         hrv_rmssd, hrv_lf_hf, sleep_efficiency, rem_percentage, deep_percentage,
         waso_minutes, spo2_dips, sleep_onset_latency, awakenings,
         resp_rate, skin_conductance, body_temp,
         stress_index, sleep_quality_score, created_by)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, (
        patient_id, model_used,
        result["label"], result["confidence"],
        result["probabilities"].get("Stressed", 0),
        result["probabilities"].get("Baseline", 0),
        result["probabilities"].get("Amusement", 0),
        inputs.get("hrv_rmssd"), inputs.get("hrv_lf_hf"),
        inputs.get("sleep_efficiency"), inputs.get("rem_percentage"),
        inputs.get("deep_percentage"), inputs.get("waso_minutes"),
        inputs.get("spo2_dips"), inputs.get("sleep_onset_latency"),
        inputs.get("awakenings"), inputs.get("resp_rate"),
        inputs.get("skin_conductance"), inputs.get("body_temp"),
        inputs.get("stress_index"), inputs.get("sleep_quality_score"),
        user_id
    ))
    conn.commit()
    conn.close()

def get_patient_history(patient_id):
    conn = get_db()
    rows = conn.execute("""
        SELECT * FROM predictions WHERE patient_id=?
        ORDER BY created_at DESC LIMIT 30
    """, (patient_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_all_patients(user_id=None):
    conn = get_db()
    rows = conn.execute("SELECT * FROM patients ORDER BY name").fetchall()
    conn.close()
    return [dict(r) for r in rows]
