"""
pdf_report.py — Generates a styled stress analysis PDF report
Uses only stdlib + fpdf2 (falls back to plain text if unavailable)
"""
import os, json
from datetime import datetime

def generate_report_html(patient, predictions, summary):
    """
    Returns an HTML string that can be printed/saved as PDF via browser or weasyprint.
    This approach works without any extra PDF library.
    """
    label_color = {"Stressed": "#ef4444", "Baseline": "#10b981", "Amusement": "#f59e0b"}

    rows = ""
    for p in predictions[:15]:
        c = label_color.get(p.get("label", ""), "#6b7280")
        rows += f"""
        <tr>
          <td>{p.get('created_at','')[:16]}</td>
          <td style="color:{c};font-weight:600">{p.get('label','—')}</td>
          <td>{p.get('confidence','—')}%</td>
          <td>{p.get('hrv_rmssd','—')}</td>
          <td>{p.get('sleep_efficiency','—')}%</td>
          <td>{p.get('waso_minutes','—')} min</td>
          <td>{p.get('model_used','—')}</td>
        </tr>"""

    stress_pct = summary.get("stress_pct", 0)
    avg_eff    = summary.get("avg_sleep_eff", 0)
    avg_hrv    = summary.get("avg_hrv", 0)
    total      = summary.get("total", 0)

    rec = ("⚠ Elevated stress markers detected across multiple sessions. "
           "Recommend clinical review, sleep hygiene intervention, and "
           "cortisol-level testing." if stress_pct > 40 else
           "✓ Sleep parameters are within healthy range. Continue monitoring "
           "and maintain current sleep schedule." if stress_pct < 20 else
           "◎ Moderate stress indicators present. Monitor trend over next 7 nights.")

    html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600;700&family=IBM+Plex+Mono&display=swap');
  * {{ margin:0; padding:0; box-sizing:border-box; }}
  body {{ font-family:'IBM Plex Sans',sans-serif; background:#fff; color:#111; padding:40px; }}
  .header {{ display:flex; justify-content:space-between; align-items:flex-start;
             border-bottom:3px solid #0f62fe; padding-bottom:20px; margin-bottom:28px; }}
  .brand {{ font-size:22px; font-weight:700; color:#0f62fe; }}
  .brand-sub {{ font-size:11px; color:#6b7280; letter-spacing:0.1em; text-transform:uppercase; }}
  .meta {{ font-size:11px; color:#6b7280; text-align:right; line-height:1.8; }}
  h2 {{ font-size:14px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em;
        color:#0f62fe; margin:24px 0 12px; border-left:3px solid #0f62fe; padding-left:10px; }}
  .patient-grid {{ display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; margin-bottom:24px; }}
  .info-card {{ background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:14px; }}
  .info-label {{ font-size:10px; text-transform:uppercase; letter-spacing:0.1em; color:#6b7280; }}
  .info-value {{ font-size:18px; font-weight:700; color:#111; font-family:'IBM Plex Mono',monospace; margin-top:2px; }}
  .kpi-grid {{ display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:12px; margin-bottom:24px; }}
  .kpi {{ background:#0f62fe; border-radius:8px; padding:16px; color:#fff; text-align:center; }}
  .kpi.danger {{ background:#ef4444; }}
  .kpi.success {{ background:#10b981; }}
  .kpi.warn {{ background:#f59e0b; color:#111; }}
  .kpi-val {{ font-size:26px; font-weight:700; font-family:'IBM Plex Mono',monospace; }}
  .kpi-lbl {{ font-size:10px; opacity:0.85; margin-top:2px; text-transform:uppercase; letter-spacing:0.06em; }}
  table {{ width:100%; border-collapse:collapse; font-size:12px; }}
  th {{ background:#0f62fe; color:#fff; padding:8px 10px; text-align:left;
        font-size:10px; text-transform:uppercase; letter-spacing:0.06em; }}
  td {{ padding:8px 10px; border-bottom:1px solid #f1f5f9; }}
  tr:nth-child(even) td {{ background:#f8fafc; }}
  .rec-box {{ background:#fefce8; border:1px solid #fbbf24; border-radius:8px;
              padding:16px; font-size:13px; line-height:1.7; margin-top:24px; }}
  .footer {{ margin-top:40px; padding-top:16px; border-top:1px solid #e2e8f0;
             font-size:10px; color:#9ca3af; display:flex; justify-content:space-between; }}
  @media print {{ body {{ padding:20px; }} }}
</style>
</head>
<body>

<div class="header">
  <div>
    <div class="brand">StressGuard AI</div>
    <div class="brand-sub">Sleep-Based Stress Detection · IBM Project</div>
  </div>
  <div class="meta">
    Report generated: {datetime.now().strftime('%d %b %Y, %H:%M')}<br>
    Report type: Patient Stress Analysis<br>
    Confidential — Clinical Use Only
  </div>
</div>

<h2>Patient Information</h2>
<div class="patient-grid">
  <div class="info-card">
    <div class="info-label">Patient Name</div>
    <div class="info-value" style="font-size:15px">{patient.get('name','—')}</div>
  </div>
  <div class="info-card">
    <div class="info-label">Patient ID</div>
    <div class="info-value">{patient.get('patient_id','—')}</div>
  </div>
  <div class="info-card">
    <div class="info-label">Age / Gender</div>
    <div class="info-value" style="font-size:15px">{patient.get('age','—')} / {patient.get('gender','—')}</div>
  </div>
</div>

<h2>Summary Statistics</h2>
<div class="kpi-grid">
  <div class="kpi {'danger' if stress_pct > 40 else 'success' if stress_pct < 20 else 'warn'}">
    <div class="kpi-val">{stress_pct:.1f}%</div>
    <div class="kpi-lbl">Stress Rate</div>
  </div>
  <div class="kpi">
    <div class="kpi-val">{total}</div>
    <div class="kpi-lbl">Total Sessions</div>
  </div>
  <div class="kpi success">
    <div class="kpi-val">{avg_eff:.1f}%</div>
    <div class="kpi-lbl">Avg Sleep Eff.</div>
  </div>
  <div class="kpi">
    <div class="kpi-val">{avg_hrv:.1f}</div>
    <div class="kpi-lbl">Avg HRV (ms)</div>
  </div>
</div>

<h2>Session History (Last {min(total,15)} Records)</h2>
<table>
  <thead>
    <tr>
      <th>Date &amp; Time</th><th>Prediction</th><th>Confidence</th>
      <th>HRV RMSSD</th><th>Sleep Eff.</th><th>WASO</th><th>Model</th>
    </tr>
  </thead>
  <tbody>{rows}</tbody>
</table>

<div class="rec-box">
  <strong>Clinical Recommendation:</strong><br>{rec}
</div>

<div class="footer">
  <span>StressGuard AI · B.Tech CSE Project · IBM Collaboration · WESAD Dataset</span>
  <span>Models: Random Forest · Gradient Boosting · SVM</span>
</div>

</body>
</html>"""
    return html


def generate_report_bytes(patient, predictions, summary):
    """Returns HTML bytes — browser can print-to-PDF or use window.print()"""
    html = generate_report_html(patient, predictions, summary)
    return html.encode("utf-8")
