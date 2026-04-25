# StressGuard AI — Human Stress Detection from Sleep Cycle
### B.Tech CSE Final Year Project · IBM Collaboration

A **production-grade full-stack ML application** detecting human stress levels
by analysing physiological sleep-cycle signals using Random Forest, Gradient
Boosting and SVM models.

---

## What's included

| Module | Contents |
|--------|----------|
| `ml/train_models.py` | Data generation, feature engineering, 3-model training |
| `ml/EDA_Analysis.ipynb` | Full EDA — distributions, correlation heatmap, scatter plots |
| `backend/app.py` | Flask REST API — auth, patients, predict, report |
| `backend/database.py` | SQLite setup — users, patients, predictions, sessions |
| `backend/pdf_report.py` | Clinical HTML report generator |
| `frontend/src/App.jsx` | React — Landing page, Login, Dashboard, Patients, Trend, Predict |

---

## Quick Start

### Step 1 — Train models (already done, pkl files included)
```bash
cd ml
pip install numpy pandas scikit-learn matplotlib seaborn
python train_models.py
```

### Step 2 — Start Flask backend
```bash
cd backend
pip install flask flask-cors
python app.py
# → http://localhost:5000
```

### Step 3 — Start React frontend
```bash
cd frontend
npm install
npm start
# → http://localhost:3000
```

> **Offline demo mode**: The frontend works without the backend.
> Use doctor1 / doctor123 on the login page.

---

## Default Login Accounts

| Username | Password    | Role   |
|----------|-------------|--------|
| doctor1  | doctor123   | Doctor |
| doctor2  | doctor456   | Doctor |
| admin    | admin123    | Admin  |

---

## API Reference

| Method | Endpoint                        | Auth | Description               |
|--------|---------------------------------|------|---------------------------|
| POST   | `/api/auth/login`               | No   | JWT login                 |
| POST   | `/api/auth/logout`              | Yes  | Invalidate session        |
| GET    | `/api/auth/me`                  | Yes  | Current user info         |
| GET    | `/api/patients`                 | Yes  | All patients              |
| POST   | `/api/patients`                 | Yes  | Create patient            |
| GET    | `/api/patients/<id>/history`    | Yes  | Prediction history        |
| GET    | `/api/patients/<id>/report`     | Yes  | Download HTML report      |
| POST   | `/api/predict`                  | Yes  | Single prediction         |
| POST   | `/api/predict/batch`            | Yes  | Batch predictions         |
| GET    | `/api/model/metrics`            | Yes  | CV scores + feature imp.  |
| GET    | `/api/demo/overview`            | No   | Dataset overview stats    |
| GET    | `/api/demo/subjects`            | No   | Demo subjects             |
| GET    | `/api/demo/trend/<id>`          | No   | 14-night trend            |

---

## Features Used (15 total)

| Feature | Description |
|---------|-------------|
| hrv_rmssd | Root mean square of successive RR differences |
| hrv_lf_hf | Sympathetic/parasympathetic ratio |
| sleep_efficiency | Time asleep / time in bed × 100 |
| rem_percentage | REM sleep proportion |
| deep_percentage | Slow-wave sleep proportion |
| waso_minutes | Wake after sleep onset |
| spo2_dips | Blood oxygen desaturation events |
| sleep_onset_latency | Minutes to fall asleep |
| awakenings | Full awakenings per night |
| resp_rate | Average breaths per minute |
| skin_conductance | Electrodermal activity |
| body_temp | Core body temperature |
| sleep_quality_score | Derived composite score |
| autonomic_balance | HRV RMSSD / LF-HF ratio |
| stress_index | Weighted composite stress indicator |

---

## Model Results

| Model | CV F1 (macro) | Train F1 |
|-------|--------------|----------|
| Gradient Boosting | **95.75%** | 94.87% |
| SVM | 95.43% | 88.91% |
| Random Forest | 95.03% | 93.12% |

---

## Tech Stack

- **ML**: Python, scikit-learn, NumPy, Pandas
- **Backend**: Flask, Flask-CORS, SQLite
- **Frontend**: React 18, Recharts, IBM Plex fonts
- **Auth**: JWT session tokens, SHA-256 passwords
- **Dataset**: WESAD-simulated (drop-in for real WESAD)
- **EDA**: Matplotlib, Seaborn, Jupyter
