import { useState, useMemo } from "react";
import { generateStressInsights, predictNextStress, getRecommendations, generateNarrativeSummary } from "./intelligenceEngine";

const T = {
  bg0:"#09090f", bg1:"#0f0f18", bg2:"#141420", bg3:"#1a1a28", bg4:"#1f1f30",
  t1:"#f1f0f5", t2:"#a09fb8", t3:"#5e5c78",
  line:"#1f1f30", line2:"#2a2a40",
  calm:"#22c55e", calmBg:"rgba(34,197,94,.08)",
  mid:"#f59e0b", midBg:"rgba(245,158,11,.08)",
  high:"#ef4444", highBg:"rgba(239,68,68,.08)",
  accent:"#818cf8", teal:"#2dd4bf",
};

const sevColor = { critical:T.high, warning:T.mid, info:T.accent, positive:T.calm, high:T.high, medium:T.mid, low:T.calm };

/* ── AlertBanner — top-level warning ── */
export function AlertBanner({ stressIndex, predictionHistory=[] }) {
  const si = +stressIndex || 0;
  const prediction = predictNextStress(predictionHistory, si);
  const isRising = prediction.trend === "increasing";

  if (si <= 50 && !isRising) return null;

  const bg = si > 65 ? T.highBg : isRising ? T.midBg : T.midBg;
  const color = si > 65 ? T.high : T.mid;
  const icon = si > 65 ? "⚠️" : "⚡";
  const text = si > 65
    ? `Critical stress detected (SI: ${Math.round(si)}) — immediate action recommended`
    : isRising
      ? `Stress is rising (${prediction.slope > 0 ? "+" : ""}${prediction.slope}/session) — early intervention advised`
      : `Elevated stress (SI: ${Math.round(si)}) — monitor closely`;

  return (
    <div style={{ background:bg, border:`1px solid ${color}33`, borderRadius:10, padding:"12px 16px", marginBottom:16,
      display:"flex", alignItems:"center", gap:10, animation:"popIn .4s ease" }}>
      <span style={{ fontSize:18 }}>{icon}</span>
      <div style={{ flex:1, fontSize:12, fontWeight:600, color }}>
        {text}
      </div>
      <span style={{ fontSize:9, background:color, color:"#fff", padding:"3px 8px", borderRadius:4, fontWeight:700,
        textTransform:"uppercase", letterSpacing:".05em", animation: si > 65 ? "pulse 2s infinite" : "none" }}>
        {si > 65 ? "Urgent" : "Caution"}
      </span>
    </div>
  );
}

/* ── NarrativeSummary — the "thinking system" sentence ── */
export function NarrativeSummary({ stressIndex, predictionHistory=[], params=null }) {
  const summary = useMemo(() => generateNarrativeSummary(stressIndex, predictionHistory, params), [stressIndex, predictionHistory, params]);
  const si = +stressIndex || 0;
  const color = si > 65 ? T.high : si > 35 ? T.mid : T.calm;

  return (
    <div style={{ background:T.bg2, border:`1px solid ${color}22`, borderRadius:14, padding:"18px 22px", marginBottom:20,
      borderLeft:`3px solid ${color}`, position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, right:0, width:120, height:120, borderRadius:"50%",
        background:`radial-gradient(circle, ${color}06, transparent)`, transform:"translate(40px,-40px)" }}/>
      <div style={{ fontSize:10, color:T.t3, textTransform:"uppercase", letterSpacing:".12em", marginBottom:8, fontWeight:600 }}>
        🧠 AI Assessment
      </div>
      <div style={{ fontSize:14, color:T.t1, lineHeight:1.7, fontWeight:500 }}>
        {summary}
      </div>
    </div>
  );
}

/* ── InsightCard ── */
function InsightCard({ insight }) {
  const [expanded, setExpanded] = useState(false);
  const col = sevColor[insight.severity] || T.accent;
  return (
    <div style={{ background:T.bg2, borderRadius:12, padding:"14px 16px", minWidth:240, maxWidth:300, flexShrink:0,
      borderLeft:`3px solid ${col}`, border:`1px solid ${T.line}`, borderLeftWidth:3, borderLeftColor:col,
      cursor:"pointer", transition:"all .2s" }}
      onClick={() => setExpanded(!expanded)}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
        <span style={{ fontSize:18 }}>{insight.icon}</span>
        <span style={{ fontSize:9, fontWeight:700, color:col, background:col+"18",
          padding:"2px 8px", borderRadius:4, textTransform:"uppercase", letterSpacing:".06em" }}>{insight.tag}</span>
        {insight.badge && <span style={{ fontSize:9, fontWeight:700, color:T.t1, background:col+"30",
          padding:"2px 7px", borderRadius:4 }}>{insight.badge}</span>}
      </div>
      <div style={{ fontSize:12, fontWeight:600, color:T.t1, marginBottom:4, lineHeight:1.4 }}>{insight.title}</div>
      {expanded && <div style={{ fontSize:11, color:T.t2, lineHeight:1.6, marginTop:6 }}>{insight.detail}</div>}
      {!expanded && <div style={{ fontSize:10, color:T.t3, marginTop:2 }}>Click to expand ›</div>}
    </div>
  );
}

/* ── InsightCarousel — horizontal scrolling insights ── */
export function InsightCarousel({ stressIndex, predictionHistory=[], params=null }) {
  const insights = useMemo(() => generateStressInsights(stressIndex, predictionHistory, params), [stressIndex, predictionHistory, params]);
  if (!insights.length) return null;
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ fontSize:11, fontWeight:700, color:T.t1, textTransform:"uppercase", letterSpacing:".1em", marginBottom:10,
        display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:14 }}>💡</span> Smart Insights
        <span style={{ fontSize:9, color:T.t3, fontWeight:400, textTransform:"none", letterSpacing:0 }}>({insights.length} detected)</span>
      </div>
      <div style={{ display:"flex", gap:10, overflowX:"auto", paddingBottom:8 }}>
        {insights.map((ins, i) => <InsightCard key={i} insight={ins}/>)}
      </div>
    </div>
  );
}

/* ── PredictionCard — tomorrow's forecast ── */
export function PredictionCard({ stressIndex, predictionHistory=[] }) {
  const prediction = useMemo(() => predictNextStress(predictionHistory, stressIndex), [predictionHistory, stressIndex]);
  const col = prediction.level === "High" ? T.high : prediction.level === "Medium" ? T.mid : T.calm;

  return (
    <div style={{ background:T.bg2, border:`1px solid ${T.line}`, borderRadius:14, padding:"18px 20px", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, right:0, width:80, height:80, borderRadius:"50%",
        background:`radial-gradient(circle, ${col}10, transparent)`, transform:"translate(20px,-20px)" }}/>
      <div style={{ fontSize:10, color:T.t3, textTransform:"uppercase", letterSpacing:".1em", marginBottom:10, fontWeight:600,
        display:"flex", alignItems:"center", gap:6 }}>
        <span>🔮</span> Stress Forecast
        <span style={{ marginLeft:"auto", fontSize:9, background:T.bg4, padding:"2px 7px", borderRadius:4, color:T.t3 }}>
          Confidence: {prediction.confidence}
        </span>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:12 }}>
        <div style={{ width:48, height:48, borderRadius:"50%", background:`${col}15`, display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:22, border:`2px solid ${col}44` }}>
          {prediction.icon}
        </div>
        <div>
          <div style={{ fontSize:22, fontWeight:800, color:col, fontFamily:"'JetBrains Mono',monospace", letterSpacing:"-.03em" }}>
            {prediction.predicted !== undefined ? prediction.predicted : "—"}
          </div>
          <div style={{ fontSize:11, color:T.t2, marginTop:2 }}>
            Predicted SI · {prediction.level}
          </div>
        </div>
        <div style={{ marginLeft:"auto", textAlign:"right" }}>
          <div style={{ fontSize:10, color:T.t3, marginBottom:2 }}>Trend</div>
          <div style={{ fontSize:12, fontWeight:600, color: prediction.trend === "increasing" ? T.high : prediction.trend === "decreasing" ? T.calm : T.t2 }}>
            {prediction.trend === "increasing" ? "↗ Rising" : prediction.trend === "decreasing" ? "↘ Falling" : "→ Stable"}
          </div>
        </div>
      </div>
      <div style={{ fontSize:11, color:T.t2, lineHeight:1.5, padding:"10px 12px", background:T.bg3, borderRadius:8 }}>
        {prediction.detail}
      </div>
    </div>
  );
}

/* ── TrendCard — simple increase/decrease indicator ── */
export function TrendCard({ stressIndex, predictionHistory=[] }) {
  const si = +stressIndex || 0;
  const prev = predictionHistory.length > 0 ? +(predictionHistory[0]?.si || 0) : si;
  const diff = si - prev;
  const pct = prev > 0 ? Math.round((diff / prev) * 100) : 0;
  const isUp = diff > 2;
  const isDown = diff < -2;
  const col = isUp ? T.high : isDown ? T.calm : T.t2;

  return (
    <div style={{ background:T.bg2, border:`1px solid ${T.line}`, borderRadius:12, padding:"14px 16px",
      display:"flex", alignItems:"center", gap:14 }}>
      <div style={{ width:40, height:40, borderRadius:"50%", background:`${col}15`, display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:18, border:`1.5px solid ${col}33`, transition:"all .3s" }}>
        {isUp ? "📈" : isDown ? "📉" : "➡️"}
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:12, fontWeight:600, color:T.t1 }}>
          {isUp ? "Stress Rising" : isDown ? "Stress Falling" : "Stress Stable"}
        </div>
        <div style={{ fontSize:11, color:T.t3, marginTop:2 }}>
          {Math.abs(pct) > 0 ? `${isUp ? "+" : ""}${pct}% since last session` : "No significant change"}
        </div>
      </div>
      <div style={{ fontSize:18, fontWeight:800, color:col, fontFamily:"'JetBrains Mono',monospace" }}>
        {Math.round(si)}
      </div>
    </div>
  );
}

/* ── RecommendationPanel — action suggestions ── */
export function RecommendationPanel({ stressIndex, params=null, predictionHistory=[], onAction }) {
  const recs = useMemo(() => getRecommendations(stressIndex, params, predictionHistory), [stressIndex, params, predictionHistory]);
  const priColor = { critical:T.high, warning:T.mid, high:T.high, medium:T.mid, low:T.accent, positive:T.calm, info:T.teal };

  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ fontSize:11, fontWeight:700, color:T.t1, textTransform:"uppercase", letterSpacing:".1em", marginBottom:10,
        display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:14 }}>🎯</span> What To Do Now
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {recs.map((rec, i) => {
          const col = priColor[rec.priority] || T.accent;
          return (
            <div key={i} onClick={() => rec.action && onAction && onAction(rec.action)}
              style={{ background:T.bg2, border:`1px solid ${T.line}`, borderRadius:10, padding:"12px 16px",
                display:"flex", alignItems:"flex-start", gap:12, cursor:rec.action?"pointer":"default",
                borderLeft:`3px solid ${col}`, transition:"all .15s" }}
              onMouseEnter={e => rec.action && (e.currentTarget.style.background = T.bg3)}
              onMouseLeave={e => e.currentTarget.style.background = T.bg2}>
              <span style={{ fontSize:18, flexShrink:0, marginTop:1 }}>{rec.icon}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:600, color:rec.action ? col : T.t1, marginBottom:3 }}>
                  {rec.title}
                  {rec.priority === "critical" && <span style={{ marginLeft:8, fontSize:9, background:T.highBg, color:T.high, padding:"1px 6px", borderRadius:3, fontWeight:700 }}>URGENT</span>}
                </div>
                <div style={{ fontSize:11, color:T.t2, lineHeight:1.5 }}>{rec.detail}</div>
              </div>
              {rec.action && <span style={{ color:T.t3, fontSize:14, marginTop:2 }}>›</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── StatusBadge — inline stress badge ── */
export function StatusBadge({ stressIndex }) {
  const si = +stressIndex || 0;
  const label = si > 65 ? "High Risk" : si > 50 ? "Elevated" : si > 35 ? "Moderate" : si > 20 ? "Stable" : "Healthy";
  const col = si > 65 ? T.high : si > 50 ? T.mid : si > 35 ? T.mid : T.calm;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, background:`${col}15`, color:col,
      padding:"3px 10px", borderRadius:5, fontSize:10, fontWeight:700, letterSpacing:".04em",
      border:`1px solid ${col}22`, transition:"all .4s" }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:col, animation: si > 65 ? "pulse 1.5s infinite" : "none" }}/>
      {label}
    </span>
  );
}

/* ── Full Intelligence Dashboard (combines all components) ── */
export default function IntelligenceDashboard({ stressIndex, predictionHistory=[], params=null, onAction }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
      <AlertBanner stressIndex={stressIndex} predictionHistory={predictionHistory}/>
      <NarrativeSummary stressIndex={stressIndex} predictionHistory={predictionHistory} params={params}/>
      <InsightCarousel stressIndex={stressIndex} predictionHistory={predictionHistory} params={params}/>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:20 }}>
        <PredictionCard stressIndex={stressIndex} predictionHistory={predictionHistory}/>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <TrendCard stressIndex={stressIndex} predictionHistory={predictionHistory}/>
        </div>
      </div>
      <RecommendationPanel stressIndex={stressIndex} params={params} predictionHistory={predictionHistory} onAction={onAction}/>
    </div>
  );
}
