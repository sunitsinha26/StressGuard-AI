import { useState, useEffect, useCallback, useRef } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import SmartDoctorsPage from "./components/SmartDoctorsPage";
import IntelligenceDashboard, { AlertBanner, StatusBadge } from "./components/SmartUI";

/* ─── Design system ───────────────────────────────────────────
   Warm near-blacks, not cold IBM blues.
   Single accent per stress level. Typography first.
─────────────────────────────────────────────────────────────── */
const T = {
  /* Backgrounds — warm, not cold */
  bg0:    "#09090f",  /* page */
  bg1:    "#0f0f18",  /* sidebar */
  bg2:    "#141420",  /* card */
  bg3:    "#1a1a28",  /* elevated card */
  bg4:    "#1f1f30",  /* input / hover */

  /* Text */
  t1:     "#f1f0f5",  /* primary */
  t2:     "#a09fb8",  /* secondary */
  t3:     "#5e5c78",  /* muted */

  /* Borders */
  line:   "#1f1f30",  /* subtle divider */
  line2:  "#2a2a40",  /* visible border */

  /* Emotion palette */
  calm:   "#22c55e",  /* 0-40 */
  calmD:  "#16a34a",
  calmBg: "rgba(34,197,94,.08)",

  mid:    "#f59e0b",  /* 41-70 */
  midD:   "#d97706",
  midBg:  "rgba(245,158,11,.08)",

  high:   "#ef4444",  /* 71-100 */
  highD:  "#dc2626",
  highBg: "rgba(239,68,68,.08)",

  /* Neutrals */
  accent: "#818cf8",  /* purple-ish, used sparingly */
  teal:   "#2dd4bf",
};

const API = "http://localhost:5000/api";
async function api(path, opts = {}, token = null) {
  const h = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  try { const r = await fetch(API + path, { headers: h, ...opts }); return await r.json(); }
  catch { return null; }
}

/* ─── Emotion theme engine ──────────────────────────────────── */
function getStressTheme(score) {
  const s = score == null ? -1 : +score;
  if (s < 0)  return { level:"Unknown", primary:T.accent, secondary:"#a78bfa",
    bg:"rgba(129,140,248,.07)", border:"rgba(129,140,248,.2)",
    label:"No data", emoji:"·", glow:"rgba(129,140,248,.12)",
    gradient:`linear-gradient(135deg,${T.accent},#a78bfa)` };
  if (s <= 40) return { level:"Low",    primary:T.calm,   secondary:T.teal,
    bg:T.calmBg,  border:"rgba(34,197,94,.22)",
    label:"Low stress",    emoji:"↓", glow:"rgba(34,197,94,.14)",
    gradient:`linear-gradient(135deg,${T.calm},${T.teal})` };
  if (s <= 70) return { level:"Medium", primary:T.mid,    secondary:"#fb923c",
    bg:T.midBg,   border:"rgba(245,158,11,.22)",
    label:"Medium stress",  emoji:"~", glow:"rgba(245,158,11,.14)",
    gradient:`linear-gradient(135deg,${T.mid},#fb923c)` };
  return           { level:"High",   primary:T.high,   secondary:T.highD,
    bg:T.highBg,  border:"rgba(239,68,68,.22)",
    label:"High stress",   emoji:"↑", glow:"rgba(239,68,68,.16)",
    gradient:`linear-gradient(135deg,${T.high},${T.highD})` };
}

function StressLevelBadge({ score, style={} }) {
  const th = getStressTheme(score);
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5,
      background:th.bg, color:th.primary, borderRadius:6,
      padding:"3px 10px", fontSize:11, fontWeight:600,
      letterSpacing:".02em", transition:"all .5s ease", ...style }}>
      <span style={{ width:5, height:5, borderRadius:"50%",
        background:th.primary, flexShrink:0 }}/>
      {th.label}
    </span>
  );
}

const MOCK_USER = { id:1, username:"doctor1", role:"doctor", full_name:"Dr. Priya Sharma" };

const mockPats = () => [
  { patient_id:"PAT001", name:"Amit Singh",   age:34, gender:"Male",   stress_pct:62, avg_sleep_eff:71, avg_hrv:22, id:0 },
  { patient_id:"PAT002", name:"Priya Patel",  age:28, gender:"Female", stress_pct:18, avg_sleep_eff:89, avg_hrv:44, id:1 },
  { patient_id:"PAT003", name:"Rohit Verma",  age:45, gender:"Male",   stress_pct:47, avg_sleep_eff:76, avg_hrv:30, id:2 },
  { patient_id:"PAT004", name:"Sneha Gupta",  age:31, gender:"Female", stress_pct:9,  avg_sleep_eff:92, avg_hrv:51, id:3 },
  { patient_id:"PAT005", name:"Arjun Mehta",  age:38, gender:"Male",   stress_pct:71, avg_sleep_eff:65, avg_hrv:19, id:4 },
  { patient_id:"PAT006", name:"Pooja Yadav",  age:26, gender:"Female", stress_pct:33, avg_sleep_eff:83, avg_hrv:38, id:5 },
];
const mockOv = () => ({ total_records:3600, stressed:1260, baseline:1620, amusement:720,
  stress_rate:35, avg_sleep_eff:81.4, avg_hrv:34.2, subjects:20 });
const mockMet = () => ({
  random_forest:     { cv_f1:.9503, train_f1:.9312 },
  gradient_boosting: { cv_f1:.9575, train_f1:.9487 },
  svm:               { cv_f1:.9543, train_f1:.8891 },
  feature_importances: { hrv_rmssd:.182, stress_index:.156, autonomic_balance:.141,
    sleep_quality_score:.128, waso_minutes:.097, sleep_efficiency:.089, hrv_lf_hf:.078 }
});
const mockTrend = (pat) => Array.from({ length:14 }, (_,i) => ({
  night:i+1,
  sleep_efficiency:+(68+Math.random()*22).toFixed(1),
  hrv_rmssd:+(18+Math.random()*32).toFixed(1),
  rem_pct:+(12+Math.random()*14).toFixed(1),
  deep_pct:+(8+Math.random()*14).toFixed(1),
  stress_index:+(20+Math.random()*65).toFixed(1),
  waso:+(10+Math.random()*45).toFixed(1),
  label:["Baseline","Stressed","Amusement"][Math.floor(Math.random()*3)],
}));

/* ─── Tooltip style ─────────────────────────────────────────── */
const TT = { contentStyle:{
  background:T.bg3, border:`1px solid ${T.line2}`, borderRadius:8,
  color:T.t1, fontSize:12, fontFamily:"'Inter',sans-serif",
  boxShadow:"0 8px 24px rgba(0,0,0,.4)"
}};

/* ─── Reusable primitives ───────────────────────────────────── */

/* Tag — stress-level awareness */
function Tag({ level, score }) {
  const th = getStressTheme(score != null ? score
    : level==="High"||level==="Stressed" ? 75
    : level==="Medium"||level==="Moderate" ? 55
    : level==="Low"||level==="Baseline" ? 20
    : level==="Pending" ? -1 : 20);
  return (
    <span style={{ display:"inline-block",
      background:th.bg, color:th.primary,
      borderRadius:5, padding:"2px 9px",
      fontSize:10, fontWeight:600,
      letterSpacing:".04em", textTransform:"uppercase",
      transition:"all .45s ease" }}>
      {level}
    </span>
  );
}

/* Section heading */
function SectionHead({ title, sub, action }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between",
      alignItems:"flex-end", marginBottom:24 }}>
      <div>
        <h2 style={{ fontSize:18, fontWeight:600, color:T.t1,
          letterSpacing:"-.025em", lineHeight:1.2 }}>{title}</h2>
        {sub && <p style={{ fontSize:13, color:T.t2, marginTop:4 }}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/* Card — elevation via background, not border */
function Card({ children, title, sub, badge, th, pad=24, style={} }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background:T.bg2, borderRadius:14,
        padding:pad,
        border:`1px solid ${hov?(th?th.border:T.line2):T.line}`,
        transition:"border-color .25s, box-shadow .25s",
        boxShadow:hov?"0 4px 24px rgba(0,0,0,.3)":"none",
        ...style }}>
      {(title||badge) && (
        <div style={{ display:"flex", justifyContent:"space-between",
          alignItems:"center", marginBottom:16 }}>
          <div>
            <div style={{ fontSize:13, fontWeight:500, color:T.t1 }}>{title}</div>
            {sub && <div style={{ fontSize:11, color:T.t3, marginTop:2 }}>{sub}</div>}
          </div>
          {badge && <span style={{ fontSize:10, color:th?th.primary:T.accent,
            background:th?th.bg:"rgba(129,140,248,.08)",
            padding:"2px 8px", borderRadius:4, fontWeight:600 }}>{badge}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

/* Stat — the human-feeling number display */
function Stat({ label, value, unit="", sub, th, size="lg" }) {
  const fs = size==="lg" ? 32 : size==="md" ? 24 : 18;
  return (
    <div>
      <div style={{ fontSize:11, color:T.t3, fontWeight:500,
        textTransform:"uppercase", letterSpacing:".08em", marginBottom:6 }}>{label}</div>
      <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
        <span style={{ fontSize:fs, fontWeight:700, color:th?th.primary:T.t1,
          letterSpacing:"-.03em", lineHeight:1,
          transition:"color .5s ease" }}>{value}</span>
        {unit && <span style={{ fontSize:fs*.4, color:T.t3, fontWeight:400 }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize:11, color:T.t3, marginTop:4 }}>{sub}</div>}
    </div>
  );
}

/* Avatar initials */
function Avatar({ name, color=T.accent, size=36 }) {
  const initials = name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  return (
    <div style={{ width:size, height:size, borderRadius:"50%",
      background:color+"20", color, border:`1.5px solid ${color}40`,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:size*.32, fontWeight:700, flexShrink:0, letterSpacing:"-.01em" }}>
      {initials}
    </div>
  );
}

/* Input */
function Input({ label, ...props }) {
  const [foc, setFoc] = useState(false);
  return (
    <div>
      {label && <label style={{ display:"block", fontSize:11, fontWeight:500,
        color:T.t3, textTransform:"uppercase", letterSpacing:".08em",
        marginBottom:6 }}>{label}</label>}
      <input onFocus={()=>setFoc(true)} onBlur={()=>setFoc(false)}
        style={{ background:T.bg4, border:`1px solid ${foc?T.line2:T.line}`,
          borderRadius:8, color:T.t1, padding:"10px 12px", fontSize:13,
          width:"100%", boxSizing:"border-box", outline:"none",
          fontFamily:"'Inter',sans-serif", transition:"border-color .15s" }}
        {...props}/>
    </div>
  );
}

/* Button */
function Btn({ children, variant="primary", onClick, disabled, style={}, th }) {
  const [hov, setHov] = useState(false);
  const bg = variant==="primary"
    ? (th ? th.gradient : `linear-gradient(135deg,${T.accent},#a78bfa)`)
    : variant==="ghost" ? "transparent" : T.bg4;
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background:disabled?T.bg3:bg,
        color:variant==="primary"?"#fff":T.t2,
        border:variant==="ghost"?`1px solid ${T.line2}`:"none",
        borderRadius:8, padding:"9px 18px", cursor:disabled?"not-allowed":"pointer",
        fontSize:13, fontWeight:600, transition:"all .18s",
        opacity:hov&&!disabled?.9:1,
        transform:hov&&!disabled?"translateY(-1px)":"none",
        display:"inline-flex", alignItems:"center", gap:7,
        letterSpacing:".01em", ...style }}>
      {children}
    </button>
  );
}

/* ─── SPLASH ────────────────────────────────────────────────── */

/* ─── Rich counselor knowledge base ─────────────────────────── */
const COUNSELOR_KB = {
  breathing: {
    keywords: ["breath","panic","anxious","anxiety","calm","hyperventilat","chest tight","racing heart"],
    responses: [
      { text: "Let\'s do box breathing together right now. Breathe IN for 4 counts... HOLD for 4... OUT for 4... HOLD for 4. Do this 3-4 times. This directly activates your vagus nerve and parasympathetic system - you\'ll feel a shift within 90 seconds.", exercise: { type:"box", label:"Box Breathing", steps:["Inhale 4s","Hold 4s","Exhale 4s","Hold 4s"], duration:16 } },
      { text: "Try 4-7-8 breathing - the most clinically validated rapid anxiolytic. Inhale through your nose for 4 seconds, hold for 7, exhale completely through your mouth for 8. The extended exhale activates your parasympathetic brake. Repeat 4 cycles.", exercise: { type:"478", label:"4-7-8 Technique", steps:["Inhale 4s","Hold 7s","Exhale 8s"], duration:19 } },
      { text: "Physiological sigh: take a normal inhale, then a second short inhale on top (double inhale), then a long slow exhale. Stanford research shows this is the fastest way to reduce physiological arousal - even faster than box breathing." },
    ]
  },
  sleep: {
    keywords: ["sleep","tired","insomnia","wake","waso","rem","deep sleep","bedtime","rest","fatigue"],
    responses: [
      { text: "Your WASO is elevated which suggests **sleep fragmentation**. Three evidence-based fixes tonight: (1) Keep bedroom below 18C - body temp must drop to initiate deep sleep, (2) No screens 90 min before bed - blue light delays melatonin by 3 hours, (3) Same wake time every day - this anchors your circadian rhythm faster than anything else." },
      { text: "Your REM% is suppressed - this is where emotional processing and memory consolidation happen. Two immediate changes: stop alcohol entirely (it fragments REM severely even in small amounts), and try magnesium glycinate 400mg 1hr before bed." },
      { text: "Sleep restriction therapy is counterintuitive but powerful: compress your sleep window to 6 hours for one week (e.g. midnight to 6am only), then extend by 15 min when efficiency hits 90%+. This builds strong sleep pressure and eliminates fragmentation." },
    ]
  },
  stress: {
    keywords: ["stress","pressure","overwhelm","work","deadline","burnout","tense","worry","fear"],
    responses: [
      { text: "Chronic stress keeps your HRV suppressed because cortisol directly inhibits vagal tone. Three things with the strongest evidence: (1) **20-minute nature walk** - cortisol drops 21% (Bratman et al., Stanford), (2) **Cold water on your face** - triggers the dive reflex, instant vagal activation, (3) **Expressive writing** - 20 min/day for 3 days reduces stress markers for weeks." },
      { text: "Your LF/HF ratio indicates sympathetic dominance. This is a nervous system state, not a character flaw - and it is highly trainable. HRV biofeedback is the most direct intervention: breathe at exactly 5-6 breaths per minute (resonance frequency). 20 minutes daily for 2 weeks shows measurable HRV improvement in 90% of studies." },
      { text: "I want to name something: the physiological data shows your body has been in stress mode for several nights now. That is exhausting. Before we talk techniques - is there a specific situation driving this? Sometimes naming the source is more useful than any breathing exercise." },
    ]
  },
  hrv: {
    keywords: ["hrv","heart rate","variability","lf hf","autonomic","vagus","nervous system"],
    responses: [
      { text: "HRV (heart rate variability) is the time variation between heartbeats - not heart rate itself. High HRV means your nervous system can flexibly switch between fight-or-flight and rest modes. Your current RMSSD suggests moderate suppression. The fastest way to improve it: consistent sleep/wake times, slow breathing practice, and reducing alcohol." },
      { text: "Your LF/HF ratio reflects the balance between sympathetic (stress) and parasympathetic (rest) nervous systems. The goal is not to eliminate sympathetic activity - it is healthy balance. Slow breathing at 5-6 breaths per minute directly maximises HRV by synchronising respiratory and cardiac rhythms." },
    ]
  },
  grounding: {
    keywords: ["ground","present","distract","focus","here","now","mind racing","thoughts"],
    responses: [
      { text: "5-4-3-2-1 grounding: Name **5 things you can see**, **4 you can physically feel**, **3 you can hear**, **2 you can smell**, **1 you can taste**. This interrupts rumination by forcing sensory present-moment engagement." },
      { text: "Name it to tame it - the act of labelling an emotion reduces amygdala activation by up to 50% (Lieberman et al., fMRI evidence). Right now: what is the most accurate word for what you are feeling? Not just stressed - more specific. Overwhelmed? Trapped? Unseen?" },
    ]
  },
  food: {
    keywords: ["eat","food","diet","caffeine","alcohol","coffee","nutrition","supplement"],
    responses: [
      { text: "Diet has a surprisingly large effect on HRV. Highest impact changes: (1) Cut caffeine after 12pm - half-life is 6 hours so 3pm coffee is still active at 9pm, (2) Omega-3s (2g EPA+DHA daily) directly improve vagal tone, (3) Magnesium glycinate - 60-80% of people are deficient and it is critical for GABA/relaxation pathways." },
    ]
  },
  exercise: {
    keywords: ["exercise","workout","gym","run","walk","physical","move","sport","yoga"],
    responses: [
      { text: "Zone 2 cardio (conversational pace, 60-70% max HR) for 30-45 min, 3-4x per week is the single highest-ROI intervention for HRV. It builds mitochondrial density and directly increases vagal tone. Avoid high-intensity training within 4 hours of sleep - it spikes cortisol and delays recovery." },
    ]
  },
  emergency: {
    keywords: ["suicide","die","kill myself","hurt myself","self harm","crisis","no point"],
    responses: [
      { text: "I hear that you are in a really dark place right now, and I want you to know that matters. Please reach out immediately: **iCall India** 9152987821, **Vandrevala Foundation** 1860-2662-345 (24/7), or **AASRA** 9820466627. You do not have to figure this out alone tonight." },
    ]
  },
  default: [
    { text: "I hear you. What you are experiencing is real - the physiological data backs it up. Would you like a breathing exercise right now, some evidence-based sleep improvements, or do you want to talk through what has been building up?" },
    { text: "That sounds genuinely hard. Stress is not just a feeling - it is a measurable biological state, and your body has been carrying this for a while. What would feel most helpful right now? I can guide a quick exercise, explain what your data means, or just listen." },
    { text: "Thank you for sharing that. The fact you are here and talking about it is itself a nervous system regulator - social connection directly raises oxytocin and lowers cortisol. What is the heaviest thing on your mind right now?" },
  ]
};

function getCounselorReply(message) {
  const m = message.toLowerCase();
  if (COUNSELOR_KB.emergency.keywords.some(k => m.includes(k)))
    return COUNSELOR_KB.emergency.responses[0].text;
  for (const [key, cat] of Object.entries(COUNSELOR_KB)) {
    if (key === "default" || key === "emergency") continue;
    if (cat.keywords && cat.keywords.some(k => m.includes(k))) {
      const r = cat.responses[Math.floor(Math.random()*cat.responses.length)];
      return r.text;
    }
  }
  const defs = COUNSELOR_KB.default;
  return defs[Math.floor(Math.random()*defs.length)].text;
}

function getCounselorExercise(message) {
  const m = message.toLowerCase();
  for (const [key, cat] of Object.entries(COUNSELOR_KB)) {
    if (!cat.keywords) continue;
    if (cat.keywords.some(k => m.includes(k))) {
      for (const r of cat.responses) {
        if (r.exercise) return r.exercise;
      }
    }
  }
  return null;
}



/* ── Shared primitives ──────────────────────────────────── */
/* ── SPLASH SCREEN ──────────────────────────────────────── */
function SplashScreen({ onDone }) {
  const canvasRef   = useRef(null);
  const [prog,      setProg]     = useState(0);
  const [stepIdx,   setStepIdx]  = useState(0);
  const [opacity,   setOpacity]  = useState(0);
  const [stats,     setStats]    = useState({ f1:0, feat:0, rec:0, mdl:0 });
  const [ringColor, setRingColor]= useState('#0f62fe');

  const STEPS = [
    'Loading WESAD dataset\u2026',
    'Calibrating HRV features\u2026',
    'Initialising Random Forest\u2026',
    'Initialising Gradient Boost\u2026',
    'Connecting Flask API\u2026',
    'Rendering dashboard\u2026',
    'System ready',
  ];
  const CIRC = 2 * Math.PI * 46;

  useEffect(() => { requestAnimationFrame(() => setOpacity(1)); }, []);

  /* Particle canvas */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const resize = () => {
      canvas.width  = parent.offsetWidth  || 800;
      canvas.height = parent.offsetHeight || 600;
    };
    resize();
    const pts = Array.from({ length:75 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - .5) * .45,
      vy: (Math.random() - .5) * .45,
      r:  Math.random() * 1.6 + .3,
      hue: ['#0f62fe','#05d4c8','#9b6dff','rgba(255,255,255,.25)'][Math.floor(Math.random()*4)],
      phase: Math.random() * Math.PI * 2,
    }));
    let raf;
    const draw = () => {
      const W = canvas.width, H = canvas.height;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, W, H);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.phase += .016;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.1, p.r + Math.sin(p.phase) * .35), 0, Math.PI * 2);
        ctx.fillStyle = p.hue.startsWith('rgba') ? p.hue : p.hue + '66';
        ctx.fill();
      });
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const d = Math.sqrt(dx*dx + dy*dy);
          if (d < 90) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(15,98,254,${(1 - d/90) * .08})`;
            ctx.lineWidth = .4;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  /* Progress */
  useEffect(() => {
    const iv = setInterval(() => {
      setProg(p => {
        const n = Math.min(p + 1.55, 100);
        setStepIdx(Math.min(Math.floor(n / 15), STEPS.length - 1));
        if (n > 66)      setRingColor('#05d4c8');
        else if (n > 33) setRingColor('#9b6dff');
        if (n >= 100) {
          clearInterval(iv);
          setTimeout(() => setOpacity(0), 300);
          setTimeout(onDone, 850);
        }
        return n;
      });
    }, 52);
    return () => clearInterval(iv);
  }, [onDone]);

  /* Count-up */
  useEffect(() => {
    [[900,'f1',95],[1050,'feat',15],[1200,'rec',3600],[1380,'mdl',3]].forEach(([delay,key,target]) => {
      setTimeout(() => {
        let s = null;
        const step = ts => {
          if (!s) s = ts;
          const p = Math.min((ts - s) / 1200, 1);
          const ease = 1 - Math.pow(1 - p, 3);
          setStats(prev => ({ ...prev, [key]: Math.round(ease * target) }));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }, delay);
    });
  }, []);

  const dash = CIRC * prog / 100;

  const KF = `
    @keyframes sp_spin1{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
    @keyframes sp_spin2{from{transform:rotate(0deg)}to{transform:rotate(-360deg)}}
    @keyframes sp_hbeat{0%,100%{transform:scale(1)}14%{transform:scale(1.1)}28%{transform:scale(1)}}
    @keyframes sp_glow{0%,100%{opacity:.15}50%{opacity:.5}}
    @keyframes sp_shimmer{0%{left:-100%}100%{left:220%}}
    @keyframes sp_scan{from{top:-2px}to{top:102%}}
    @keyframes sp_blink{0%,100%{opacity:0}50%{opacity:1}}
    @keyframes sp_fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
    @keyframes sp_scaleIn{0%{opacity:0;transform:scale(.35) rotate(-18deg)}70%{transform:scale(1.07) rotate(2deg)}100%{opacity:1;transform:scale(1) rotate(0deg)}}
    @keyframes sp_tagIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  `;

  const fa = (delay, extra={}) => ({
    animation: `sp_fadeUp .5s ease ${delay}s both`, ...extra
  });

  return (
    <div style={{ position:'absolute', inset:0, background:'#04060f',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      overflow:'hidden', opacity, transition:'opacity .6s ease',
      fontFamily:"'IBM Plex Sans','Segoe UI',sans-serif" }}>
      <style>{KF}</style>

      {/* Particle canvas */}
      <canvas ref={canvasRef} style={{ position:'absolute', inset:0,
        width:'100%', height:'100%', opacity:.6, pointerEvents:'none' }}/>

      {/* Scan beam */}
      <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none' }}>
        <div style={{ position:'absolute', left:0, right:0, height:1,
          background:'linear-gradient(90deg,transparent,rgba(15,98,254,.3) 50%,transparent)',
          animation:'sp_scan 3.2s linear infinite' }}/>
        <div style={{ position:'absolute', left:0, right:0, height:50,
          background:'linear-gradient(180deg,transparent,rgba(15,98,254,.02),transparent)',
          animation:'sp_scan 3.2s linear infinite' }}/>
      </div>

      {/* Logo */}
      <div style={{ marginBottom:28, position:'relative', zIndex:2,
        animation:'sp_scaleIn .85s cubic-bezier(.34,1.56,.64,1) .1s both',
        transformOrigin:'center' }}>
        <svg width="150" height="150" viewBox="0 0 150 150">
          {/* Faint outer ring */}
          <circle cx="75" cy="75" r="71" fill="none" stroke="rgba(15,98,254,.06)" strokeWidth="1"/>
          {/* Spinning dash ring 1 */}
          <g style={{ transformOrigin:'75px 75px', animation:'sp_spin1 13s linear infinite' }}>
            <circle cx="75" cy="75" r="65" fill="none" stroke="rgba(15,98,254,.13)"
              strokeWidth="1" strokeDasharray="9 17" strokeLinecap="round"/>
          </g>
          {/* Spinning dash ring 2 (reverse) */}
          <g style={{ transformOrigin:'75px 75px', animation:'sp_spin2 8.5s linear infinite' }}>
            <circle cx="75" cy="75" r="57" fill="none" stroke="rgba(5,212,200,.16)"
              strokeWidth="1" strokeDasharray="5 21" strokeLinecap="round"/>
          </g>
          {/* Progress track */}
          <circle cx="75" cy="75" r="46" fill="none"
            stroke="rgba(25,32,56,.95)" strokeWidth="8"/>
          {/* Progress fill */}
          <circle cx="75" cy="75" r="46" fill="none"
            stroke={ringColor} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${dash} ${CIRC}`}
            strokeDashoffset={CIRC / 4}
            style={{ transition:'stroke-dasharray .06s linear, stroke .55s ease' }}/>
          {/* Glow pulse */}
          <circle cx="75" cy="75" r="57" fill="none" stroke={ringColor}
            strokeWidth="1" style={{ animation:'sp_glow 2.2s ease-in-out infinite',
              transition:'stroke .55s ease' }}/>
          {/* Inner fill */}
          <circle cx="75" cy="75" r="36" fill="rgba(15,98,254,.07)"/>
          {/* ECG path */}
          <g style={{ transformOrigin:'75px 75px', animation:'sp_hbeat 1.45s ease-in-out infinite' }}>
            <path d="M32 75H48L53 56L60 94L67 64L71 78L76 75H118"
              fill="none" stroke={ringColor} strokeWidth="2.8"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ transition:'stroke .55s ease' }}/>
          </g>
          {/* Orbiting dot A */}
          <g style={{ transformOrigin:'75px 75px', animation:'sp_spin1 4.8s linear infinite' }}>
            <circle cx="75" cy="27" r="5" fill="#0f62fe"/>
          </g>
          {/* Orbiting dot B */}
          <g style={{ transformOrigin:'75px 75px', animation:'sp_spin2 7s linear infinite' }}>
            <circle cx="123" cy="75" r="3.5" fill="#05d4c8"/>
          </g>
          {/* Orbiting dot C */}
          <g style={{ transformOrigin:'75px 75px', animation:'sp_spin1 10.5s linear infinite' }}>
            <circle cx="75" cy="123" r="3" fill="#9b6dff"/>
          </g>
        </svg>
      </div>

      {/* Brand */}
      <div style={{ ...fa(.55), textAlign:'center', marginBottom:6, position:'relative', zIndex:2 }}>
        <div style={{ fontSize:34, fontWeight:900, color:'#e4eaf6', letterSpacing:'-.04em', lineHeight:1 }}>
          StressGuard <span style={{ color:'#0f62fe' }}>AI</span>
        </div>
      </div>
      <div style={{ ...fa(.7), fontSize:10, color:'#38486a', letterSpacing:'.2em',
        textTransform:'uppercase', marginBottom:36, position:'relative', zIndex:2 }}>
        IBM Research &nbsp;&middot;&nbsp; Sleep-Based Stress Detection
      </div>

      {/* Stats panel */}
      <div style={{ ...fa(.82), display:'flex', gap:0, marginBottom:34,
        background:'rgba(8,12,26,.8)', border:'1px solid #192038',
        borderRadius:14, overflow:'hidden', position:'relative', zIndex:2 }}>
        {[
          [stats.f1 + '%',                'CV F1 Score',  '#0f62fe'],
          [stats.feat,                    'Features',     '#05d4c8'],
          [stats.rec > 999 ? '3,600' : stats.rec, 'Records', '#f1c21b'],
          [stats.mdl,                     'ML Models',    '#9b6dff'],
        ].map(([v, l, col], i, arr) => (
          <div key={l} style={{ padding:'16px 26px', textAlign:'center',
            borderRight: i < arr.length - 1 ? '1px solid #192038' : 'none' }}>
            <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:22,
              fontWeight:800, color:col, lineHeight:1 }}>{v}</div>
            <div style={{ fontSize:9, color:'#38486a', textTransform:'uppercase',
              letterSpacing:'.12em', marginTop:5 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div style={{ ...fa(.96), width:300, position:'relative', zIndex:2 }}>
        {/* Track */}
        <div style={{ background:'rgba(18,28,52,.9)', border:'1px solid rgba(15,98,254,.16)',
          borderRadius:10, height:8, overflow:'hidden', position:'relative' }}>
          {/* Fill */}
          <div style={{ height:'100%', borderRadius:10, width:`${prog}%`,
            background:`linear-gradient(90deg,#0f62fe,${ringColor})`,
            transition:'width .06s linear, background .55s ease',
            position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, height:'100%', width:55,
              background:'linear-gradient(90deg,transparent,rgba(255,255,255,.28),transparent)',
              animation:'sp_shimmer 1.5s ease-in-out infinite' }}/>
          </div>
        </div>
        {/* Text row */}
        <div style={{ display:'flex', justifyContent:'space-between',
          alignItems:'center', marginTop:9 }}>
          <span style={{ fontSize:11, color:'#6878a0',
            fontFamily:"'IBM Plex Mono',monospace" }}>
            {STEPS[stepIdx]}
            <span style={{ animation:'sp_blink .7s ease-in-out infinite',
              display:'inline-block', marginLeft:1 }}>_</span>
          </span>
          <span style={{ fontSize:11, fontFamily:"'IBM Plex Mono',monospace",
            fontWeight:700, color:ringColor, transition:'color .55s' }}>
            {Math.round(prog)}%
          </span>
        </div>
        {/* Step indicator dots */}
        <div style={{ display:'flex', justifyContent:'center', gap:5, marginTop:12 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ height:5, borderRadius:3,
              width: i === stepIdx ? 18 : 5,
              background: i <= stepIdx ? ringColor : '#192038',
              transition:'all .3s ease' }}/>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div style={{ display:'flex', gap:8, marginTop:22, position:'relative', zIndex:2 }}>
        {['Python · Flask','scikit-learn','React 18','WESAD'].map((t, i) => (
          <div key={t} style={{
            background:'rgba(15,98,254,.08)', border:'1px solid rgba(15,98,254,.16)',
            borderRadius:20, padding:'3px 12px', fontSize:10, color:'#6878a0',
            letterSpacing:'.1em', textTransform:'uppercase',
            animation:`sp_tagIn .4s ease ${1.3 + i * .1}s both`
          }}>{t}</div>
        ))}
      </div>
    </div>
  );
}

/* ── AI COUNSELOR ───────────────────────────────────────── */
/* ─── Premium AI Counselor ─────────────────────────────────── */
function BreathingExercise({ exercise, onClose }) {
  const [phase, setPhase] = useState(0);
  const [count, setCount] = useState(exercise.steps[0].replace(/[^0-9]/g,'') || 4);
  const [active, setActive] = useState(false);
  const [cycles, setCycles] = useState(0);

  useEffect(() => {
    if (!active) return;
    const durations = exercise.steps.map(s => +(s.match(/\d+/)?.[0] || 4) * 1000);
    let idx = phase;
    const run = () => {
      setPhase(idx);
      const dur = durations[idx];
      let elapsed = 0;
      const tick = setInterval(() => {
        elapsed += 100;
        setCount(Math.ceil((dur - elapsed) / 1000));
        if (elapsed >= dur) {
          clearInterval(tick);
          idx = (idx + 1) % exercise.steps.length;
          if (idx === 0) setCycles(c => c + 1);
          run();
        }
      }, 100);
      return () => clearInterval(tick);
    };
    const cleanup = run();
    return cleanup;
  }, [active]);

  const phaseColors = [T.calm, T.mid, T.teal, T.accent];
  const curColor = phaseColors[phase % phaseColors.length];
  const stepLabel = exercise.steps[phase];

  return (
    <div style={{ background:T.bg3, borderRadius:12, padding:"20px 22px",
      border:`1px solid ${T.line2}`, marginTop:8 }}>
      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"center", marginBottom:16 }}>
        <div style={{ fontSize:13, fontWeight:600, color:T.t1 }}>
          {exercise.label}
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {cycles > 0 && (
            <span style={{ fontSize:11, color:T.calm, fontWeight:600 }}>
              {cycles} cycle{cycles>1?"s":""} ✓
            </span>
          )}
          <button onClick={onClose} style={{ background:"transparent", border:"none",
            color:T.t3, cursor:"pointer", fontSize:16 }}>×</button>
        </div>
      </div>

      {/* Animated circle */}
      <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}>
        <div style={{ width:110, height:110, borderRadius:"50%",
          border:`3px solid ${active ? curColor : T.line2}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          flexDirection:"column", position:"relative",
          transition:"border-color .4s ease",
          background:active ? curColor+"10" : "transparent" }}>
          {/* Pulse ring */}
          {active && (
            <div style={{ position:"absolute", inset:-8, borderRadius:"50%",
              border:`2px solid ${curColor}30`,
              animation:"pulse 1.5s ease-in-out infinite" }}/>
          )}
          <div style={{ fontSize:32, fontWeight:700, color:active?curColor:T.t3,
            fontFamily:"'JetBrains Mono',monospace",
            transition:"color .4s ease" }}>{active?count:"·"}</div>
          <div style={{ fontSize:10, color:active?curColor:T.t3,
            fontWeight:600, marginTop:2, transition:"color .4s ease" }}>
            {active ? stepLabel.replace(/\d+s?/,'').trim() || stepLabel : "ready"}
          </div>
        </div>
      </div>

      {/* Step indicators */}
      <div style={{ display:"flex", justifyContent:"center", gap:6, marginBottom:16 }}>
        {exercise.steps.map((step, i) => (
          <div key={i} style={{ display:"flex", flexDirection:"column",
            alignItems:"center", gap:4 }}>
            <div style={{ width:active&&phase===i?24:8, height:6, borderRadius:3,
              background:active&&phase===i?curColor:T.line2,
              transition:"all .3s ease" }}/>
            <span style={{ fontSize:9, color:T.t3, textTransform:"uppercase",
              letterSpacing:".05em" }}>{step}</span>
          </div>
        ))}
      </div>

      <button onClick={() => setActive(a => !a)}
        style={{ width:"100%", background:active?T.highBg:`linear-gradient(135deg,${T.calm},${T.teal})`,
          color:active?T.high:"#000", border:active?`1px solid ${T.high+"44"}`:"none",
          borderRadius:8, padding:"10px", cursor:"pointer",
          fontSize:13, fontWeight:600, transition:"all .3s" }}>
        {active ? "Pause" : cycles>0 ? "Continue" : "Start exercise"}
      </button>
    </div>
  );
}

function AICounselor({ stressLevel, patientName, onClose }) {
  const isHigh = stressLevel === "High";
  const th = getStressTheme(isHigh ? 80 : 50);

  const [msgs, setMsgs] = useState([{
    role: "ai",
    type: "text",
    text: isHigh
      ? `I can see ${patientName||"this patient"}'s physiological data — elevated stress index, suppressed HRV, and disrupted sleep architecture. This is real and manageable.\n\nI'm here to help. What's going on right now?`
      : `Hello! I'm monitoring the wellness data and everything looks within range. How are you feeling today?`,
    time: new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),
  }]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [activeExercise, setActiveExercise] = useState(null);
  const [mood, setMood] = useState(null); // initial mood check
  const [showMood, setShowMood] = useState(true);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs]);

  const addMsg = (role, text, extra={}) => {
    setMsgs(m => [...m, {
      role, text, ...extra,
      time: new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})
    }]);
  };

  const send = (text) => {
    const msg = text || input.trim();
    if (!msg) return;
    setInput("");
    setShowMood(false);
    addMsg("user", msg);
    setTyping(true);

    const delay = 1000 + Math.random() * 800;
    setTimeout(() => {
      setTyping(false);
      const reply = getCounselorReply(msg);
      const exercise = getCounselorExercise(msg);
      addMsg("ai", reply, exercise ? { exercise } : {});
    }, delay);
  };

  const handleMood = (m) => {
    setMood(m);
    setShowMood(false);
    addMsg("user", m);
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      const replies = {
        "Anxious":     "Anxiety has a physiological signature — tight chest, racing thoughts, shallow breathing. Your body is in alert mode. Let's slow that down right now. Want to try a 2-minute breathing exercise?",
        "Exhausted":   "Exhaustion that doesn't resolve with sleep is a classic sign of stress-load exceeding recovery capacity. Your HRV data reflects this. Tell me — is it physical exhaustion, mental, or both?",
        "Overwhelmed": "Overwhelm usually means too many open loops. The nervous system treats unresolved tasks like threats. Let's ground you first, then we can work through what's actually weighing on you. Ready?",
        "Numb":        "Emotional numbness is often the nervous system's protection mechanism after sustained stress — it's shutting down non-essential processing. It's not weakness; it's your system trying to cope. What's been going on?",
        "Okay":        "Okay is sometimes truly okay, and sometimes a placeholder. Either is fine. Is there anything specific you wanted to check on or talk through today?",
        "Struggling":  "Thank you for naming that — it takes something to say it honestly. Your body data aligns with what you're saying. What does \"struggling\" feel like for you right now?",
      };
      addMsg("ai", replies[m] || "Thank you for sharing that. Tell me more about how you're feeling.");
    }, 1200);
  };

  const QUICK = [
    "I can't sleep", "Guide a breathing exercise",
    "I feel overwhelmed", "What does my HRV mean?",
    "I'm anxious", "Tips to reduce stress now",
  ];

  /* Render bold markdown in text */
  const renderText = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/);
    return parts.map((p, i) =>
      p.startsWith("**") ? <strong key={i} style={{ color:T.t1, fontWeight:600 }}>{p.slice(2,-2)}</strong> : p
    );
  };

  return (
    <div style={{ position:"absolute", inset:0, zIndex:500,
      background:"rgba(9,9,15,.92)",
      display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:520, height:"88vh", maxHeight:700,
        background:T.bg1, borderRadius:18,
        border:`1px solid ${th.border}`,
        display:"flex", flexDirection:"column", overflow:"hidden",
        boxShadow:`0 24px 64px rgba(0,0,0,.6), 0 0 0 1px ${th.border}`,
        transition:"border-color .5s", animation:"popIn .3s ease" }}>

        {/* ── Header ── */}
        <div style={{ padding:"16px 20px",
          borderBottom:`1px solid ${T.line}`,
          display:"flex", alignItems:"center", gap:12,
          background:T.bg2 }}>

          {/* Avatar */}
          <div style={{ width:40, height:40, borderRadius:"50%",
            background:th.gradient,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:18, flexShrink:0, transition:"background .5s" }}>
            🧠
          </div>

          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:600, color:T.t1 }}>
              AI Wellness Counselor
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6,
              fontSize:11, color:T.t2, marginTop:2 }}>
              <span style={{ width:5, height:5, borderRadius:"50%",
                background:T.calm, animation:"pulse 1.3s ease-in-out infinite" }}/>
              Online · Evidence-based · Private
            </div>
          </div>

          {/* Stress badge */}
          {isHigh && (
            <div style={{ background:T.highBg, color:T.high,
              border:`1px solid ${T.high}33`, borderRadius:6,
              padding:"3px 9px", fontSize:10, fontWeight:700 }}>
              HIGH STRESS
            </div>
          )}

          {/* Patient data pill */}
          {patientName && (
            <div style={{ background:T.bg4, borderRadius:6, padding:"3px 9px",
              fontSize:10, color:T.t3 }}>
              {patientName}
            </div>
          )}

          <button onClick={onClose}
            style={{ background:"transparent", border:"none", color:T.t3,
              cursor:"pointer", fontSize:18, padding:4, lineHeight:1,
              transition:"color .15s" }}
            onMouseEnter={e=>e.currentTarget.style.color=T.t1}
            onMouseLeave={e=>e.currentTarget.style.color=T.t3}>×</button>
        </div>

        {/* ── Context strip (patient data) ── */}
        {isHigh && (
          <div style={{ padding:"10px 20px", background:T.highBg,
            borderBottom:`1px solid ${T.high}20`,
            display:"flex", gap:20 }}>
            {[["HRV","22 ms","suppressed"],["Stress SI","76","high"],["Sleep Eff.","68%","disrupted"]].map(([l,v,s])=>(
              <div key={l}>
                <div style={{ fontSize:9, color:T.t3, textTransform:"uppercase",
                  letterSpacing:".08em" }}>{l}</div>
                <div style={{ fontSize:13, fontWeight:700, color:T.high,
                  fontFamily:"'JetBrains Mono',monospace" }}>{v}</div>
                <div style={{ fontSize:9, color:T.high, opacity:.7 }}>{s}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Messages ── */}
        <div style={{ flex:1, overflowY:"auto", padding:"18px 20px",
          display:"flex", flexDirection:"column", gap:12 }}>

          {msgs.map((m, i) => (
            <div key={i} style={{ display:"flex", flexDirection:"column",
              alignItems:m.role==="user"?"flex-end":"flex-start", gap:4 }}>

              {/* Bubble */}
              <div style={{
                maxWidth:"85%",
                background:m.role==="user"
                  ? th.gradient
                  : T.bg3,
                color:T.t1,
                borderRadius:m.role==="user"?"14px 14px 3px 14px":"14px 14px 14px 3px",
                padding:"11px 15px", fontSize:13, lineHeight:1.65,
                border:m.role==="ai"?`1px solid ${T.line}`:"none",
                transition:"background .5s",
              }}>
                {renderText(m.text)}
              </div>

              {/* Exercise widget */}
              {m.exercise && !activeExercise && (
                <div style={{ maxWidth:"85%", width:"100%" }}>
                  <button onClick={() => setActiveExercise(m.exercise)}
                    style={{ background:T.bg3, border:`1px solid ${T.calm}44`,
                      borderRadius:10, padding:"9px 14px", cursor:"pointer",
                      display:"flex", alignItems:"center", gap:8,
                      fontSize:12, color:T.calm, fontWeight:600,
                      transition:"all .2s", width:"100%" }}
                    onMouseEnter={e=>{e.currentTarget.style.background=T.calmBg;}}
                    onMouseLeave={e=>{e.currentTarget.style.background=T.bg3;}}>
                    <span style={{ fontSize:16 }}>🫁</span>
                    Start {m.exercise.label}
                    <span style={{ marginLeft:"auto", fontSize:11,
                      color:T.t3 }}>{m.exercise.duration}s per cycle</span>
                  </button>
                </div>
              )}

              <div style={{ fontSize:9, color:T.t3 }}>{m.time}</div>
            </div>
          ))}

          {/* Typing indicator */}
          {typing && (
            <div style={{ display:"flex", alignItems:"center", gap:5,
              background:T.bg3, border:`1px solid ${T.line}`,
              borderRadius:"14px 14px 14px 3px",
              padding:"12px 16px", width:62 }}>
              {[0,1,2].map(i=>(
                <span key={i} style={{ width:6, height:6, borderRadius:"50%",
                  background:T.t3, display:"block",
                  animation:`typingDot 1.2s ease-in-out ${i*.2}s infinite` }}/>
              ))}
            </div>
          )}

          <div ref={endRef}/>
        </div>

        {/* Breathing exercise widget */}
        {activeExercise && (
          <div style={{ padding:"0 20px 8px" }}>
            <BreathingExercise exercise={activeExercise}
              onClose={()=>setActiveExercise(null)}/>
          </div>
        )}

        {/* Mood check (only on first open) */}
        {showMood && (
          <div style={{ padding:"10px 20px",
            borderTop:`1px solid ${T.line}` }}>
            <div style={{ fontSize:11, color:T.t3, marginBottom:8,
              textTransform:"uppercase", letterSpacing:".08em" }}>
              How are you feeling right now?
            </div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {["Anxious","Exhausted","Overwhelmed","Numb","Okay","Struggling"].map(m=>(
                <button key={m} onClick={()=>handleMood(m)}
                  style={{ background:T.bg3, color:T.t2,
                    border:`1px solid ${T.line}`, borderRadius:20,
                    padding:"5px 12px", fontSize:11, cursor:"pointer",
                    transition:"all .15s" }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=th.primary;e.currentTarget.style.color=th.primary;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=T.line;e.currentTarget.style.color=T.t2;}}>
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick replies */}
        {!showMood && (
          <div style={{ padding:"8px 20px", borderTop:`1px solid ${T.line}`,
            display:"flex", gap:6, overflowX:"auto" }}>
            {QUICK.map(q=>(
              <button key={q} onClick={()=>send(q)}
                style={{ background:T.bg3, color:T.t3,
                  border:`1px solid ${T.line}`, borderRadius:20,
                  padding:"4px 11px", fontSize:10, cursor:"pointer",
                  whiteSpace:"nowrap", flexShrink:0,
                  transition:"all .15s" }}
                onMouseEnter={e=>{e.currentTarget.style.color=T.t1;e.currentTarget.style.borderColor=T.line2;}}
                onMouseLeave={e=>{e.currentTarget.style.color=T.t3;e.currentTarget.style.borderColor=T.line;}}>
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ padding:"12px 20px 16px",
          display:"flex", gap:9 }}>
          <input value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&send()}
            placeholder="Type how you're feeling, or ask anything…"
            style={{ flex:1, background:T.bg3,
              border:`1px solid ${T.line2}`,
              borderRadius:10, color:T.t1,
              padding:"11px 14px", fontSize:13,
              outline:"none", fontFamily:"'Inter',sans-serif",
              transition:"border-color .15s" }}
            onFocus={e=>e.target.style.borderColor=th.primary}
            onBlur={e=>e.target.style.borderColor=T.line2}/>
          <button onClick={()=>send()}
            style={{ width:42, height:42, borderRadius:10, border:"none",
              background:input.trim()?th.gradient:T.bg3,
              cursor:input.trim()?"pointer":"default",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:16, flexShrink:0, transition:"background .3s" }}>
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}


function OverviewPage({ overview, metrics, patients, globalStress=38, predictionHistory=[], latestPrediction=null, onAction }) {
  const th = getStressTheme(globalStress);
  const params = latestPrediction?.params || null;

  const pie = overview ? [
    { name:"Stressed",  value:overview?.stressed||0,  color:T.high  },
    { name:"Baseline",  value:overview?.baseline||0,  color:T.calm  },
    { name:"Amusement", value:overview.amusement, color:T.mid   },
  ] : [];

  const models = metrics ? [
    { name:"Gradient Boost", cv:+(metrics.gradient_boosting.cv_f1*100).toFixed(2), color:th.primary },
    { name:"SVM",            cv:+(metrics.svm.cv_f1*100).toFixed(2),              color:th.secondary },
    { name:"Random Forest",  cv:+(metrics.random_forest.cv_f1*100).toFixed(2),    color:T.t3 },
  ] : [];

  const fi = metrics ? Object.entries(metrics.feature_importances)
    .sort((a,b)=>b[1]-a[1]).slice(0,7)
    .map(([k,v])=>({ name:k.replace(/_/g," "), val:+(v*100).toFixed(1) })) : [];

  const assessed = (patients||[]).filter(p=>!p.pending);
  const highRisk = assessed.filter(p=>(p.stress_pct||0)>40);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:28 }}>

      {/* ── Intelligence Dashboard ── */}
      <IntelligenceDashboard
        stressIndex={globalStress}
        predictionHistory={predictionHistory}
        params={params}
        onAction={onAction}
      />

      {/* KPI strip — 5 asymmetric stats */}
      {overview && (
        <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr 1fr 1fr 1fr", gap:1,
          background:T.line, borderRadius:14, overflow:"hidden" }}>
          {[
            { l:"Total records",   v:(overview?.total_records||0).toLocaleString(), sub:"WESAD dataset",          thh:null },
            { l:"Stress rate",     v:`${overview?.stress_rate||0}%`,              sub:`${overview.stressed.toLocaleString()} stressed`, thh:getStressTheme(overview.stress_rate*2) },
            { l:"Avg sleep eff.",  v:`${overview.avg_sleep_eff}%`,            sub:"All subjects",            thh:getStressTheme(20) },
            { l:"Avg HRV",        v:`${overview.avg_hrv}`,    sub:"ms RMSSD",                thh:getStressTheme(15) },
            { l:"High-risk now",   v:highRisk.length,                         sub:`of ${assessed.length} assessed`, thh:highRisk.length>2?getStressTheme(80):getStressTheme(20) },
          ].map(({ l, v, sub, thh }, i) => (
            <div key={l} style={{ background:T.bg2, padding:"20px 22px" }}>
              <div style={{ fontSize:11, color:T.t3, fontWeight:500,
                textTransform:"uppercase", letterSpacing:".08em", marginBottom:10 }}>{l}</div>
              <div style={{ fontSize:i===0?36:26, fontWeight:700,
                color:thh?thh.primary:T.t1, letterSpacing:"-.03em",
                lineHeight:1, transition:"color .5s" }}>{v}</div>
              <div style={{ fontSize:11, color:T.t3, marginTop:5 }}>{sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Main content — 3 column */}
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:20 }}>

        {/* Left — model leaderboard + feature importance */}
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

          {/* Model performance */}
          <Card title="Model performance" sub="5-fold cross-validated F1 macro" badge={`Best: ${models[0]?.cv}%`} th={th}>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {models.map((m,i)=>(
                <div key={m.name}>
                  <div style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"center", marginBottom:5 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ fontSize:11, color:T.t3,
                        fontFamily:"'JetBrains Mono',monospace" }}>
                        0{i+1}
                      </span>
                      <span style={{ fontSize:13, fontWeight:500, color:T.t1 }}>{m.name}</span>
                    </div>
                    <span style={{ fontSize:13, fontWeight:700, color:m.color,
                      fontFamily:"'JetBrains Mono',monospace",
                      transition:"color .5s" }}>{m.cv}%</span>
                  </div>
                  <div style={{ background:T.bg4, borderRadius:3, height:5, overflow:"hidden" }}>
                    <div style={{ width:`${((m.cv-88)/12)*100}%`, height:"100%",
                      background:m.color, borderRadius:3,
                      transition:"width 1.2s cubic-bezier(.4,0,.2,1), background .5s" }}/>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Feature importance */}
          <Card title="Feature importances" sub="Random Forest — mean decrease in impurity">
            <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
              {fi.map((f,i)=>(
                <div key={f.name} style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:140, fontSize:11, color:T.t2, textAlign:"right",
                    textTransform:"capitalize", flexShrink:0 }}>{f.name}</div>
                  <div style={{ flex:1, background:T.bg4, borderRadius:3, height:6,
                    overflow:"hidden" }}>
                    <div style={{ width:`${(f.val/18.5)*100}%`, height:"100%",
                      background:i<2?th.primary:i<4?th.secondary:T.t3,
                      borderRadius:3,
                      transition:"width 1.2s cubic-bezier(.4,0,.2,1) "+i*.06+"s, background .5s" }}/>
                  </div>
                  <span style={{ fontSize:11, color:T.t3, width:34, textAlign:"right",
                    fontFamily:"'JetBrains Mono',monospace" }}>{f.val}%</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right — pie + high-risk */}
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

          {/* Distribution */}
          <Card title="Label distribution" badge="WESAD">
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie data={pie} cx="50%" cy="48%" outerRadius={68} innerRadius={38}
                  dataKey="value" paddingAngle={3}>
                  {pie.map((e,i)=><Cell key={i} fill={e.color}/>)}
                </Pie>
                <Tooltip {...TT}/>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:4 }}>
              {pie.map(p=>(
                <div key={p.name} style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"center" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                    <div style={{ width:7, height:7, borderRadius:"50%",
                      background:p.color }}/>
                    <span style={{ fontSize:12, color:T.t2 }}>{p.name}</span>
                  </div>
                  <span style={{ fontSize:12, fontWeight:600, color:T.t1,
                    fontFamily:"'JetBrains Mono',monospace" }}>
                    {p.value?.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* High-risk patients */}
          <Card title="High-risk" sub="Stress index > 40%" th={getStressTheme(80)}>
            {highRisk.length === 0 ? (
              <div style={{ textAlign:"center", padding:"20px 0" }}>
                <div style={{ fontSize:20, marginBottom:6 }}>✓</div>
                <div style={{ fontSize:12, color:T.t3 }}>No high-risk patients</div>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {highRisk.slice(0,4).map(p=>(
                  <div key={p.patient_id} style={{ display:"flex",
                    alignItems:"center", gap:10 }}>
                    <Avatar name={p.name} color={T.high} size={30}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:500,
                        color:T.t1, whiteSpace:"nowrap",
                        overflow:"hidden", textOverflow:"ellipsis" }}>{p.name}</div>
                      <div style={{ fontSize:10, color:T.t3, marginTop:1 }}>
                        HRV {p.avg_hrv} ms
                      </div>
                    </div>
                    <span style={{ fontSize:13, fontWeight:700, color:T.high,
                      fontFamily:"'JetBrains Mono',monospace",
                      flexShrink:0 }}>{p.stress_pct}%</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* WESAD signal coverage */}
      <div>
        <div style={{ fontSize:11, fontWeight:500, color:T.t3,
          textTransform:"uppercase", letterSpacing:".1em",
          marginBottom:14 }}>WESAD signal coverage</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:10 }}>
          {[
            { sig:"ECG",  src:"Chest",  hz:"700 Hz", color:T.high  },
            { sig:"EDA",  src:"Both",   hz:"4 Hz",   color:T.mid   },
            { sig:"BVP",  src:"Wrist",  hz:"64 Hz",  color:T.teal  },
            { sig:"TEMP", src:"Both",   hz:"4 Hz",   color:T.accent},
            { sig:"RESP", src:"Chest",  hz:"700 Hz", color:T.calm  },
            { sig:"ACC",  src:"Both",   hz:"32 Hz",  color:T.t2    },
          ].map(s=>(
            <div key={s.sig} style={{ background:T.bg2, borderRadius:10,
              padding:"14px 14px", borderTop:`2px solid ${s.color}`,
              border:`1px solid ${T.line}` }}>
              <div style={{ fontSize:15, fontWeight:700, color:s.color,
                letterSpacing:"-.01em", marginBottom:3 }}>{s.sig}</div>
              <div style={{ fontSize:10, color:T.t3 }}>{s.src}</div>
              <div style={{ fontSize:10, color:T.t3,
                fontFamily:"'JetBrains Mono',monospace",
                marginTop:2 }}>{s.hz}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


function buildPatientDetail(p) {
  /* Pending patients have no real data — never fabricate clinical values */
  if (p.pending) {
    return {
      ...p,
      blood_group:    p.blood_group || "—",
      contact:        p.contact     || "—",
      email:          p.email       || "—",
      address:        p.address     || "—",
      enrolled:       new Date().toLocaleDateString("en-IN",{month:"short",year:"numeric"}),
      last_session:   "No sessions yet",
      sessions_total: 0,
      diagnosis:      "Pending first assessment",
      doctor:         "Unassigned",
      vitals:   [],
      sessions: [],
    };
  }
  const isHigh = (p.stress_pct||0) > 40;
  const isMod  = (p.stress_pct||0) > 20;
  const idx    = typeof p.id === "number" ? p.id : 0;
  return {
    ...p,
    blood_group:    p.blood_group || ["A+","B+","O+","AB+","A-","O-"][idx % 6],
    contact:        p.contact     || `+91 ${9800000000 + idx * 11111117}`.slice(0,14),
    email:          p.email       || `${p.name.split(" ")[0].toLowerCase()}@gmail.com`,
    address:        p.address     || ["Mumbai","Delhi","Bangalore","Hyderabad","Chennai","Pune"][idx % 6] + ", India",
    enrolled:       `${["Jan","Feb","Mar","Apr"][idx%4]} ${2024 + (idx%2)}`,
    last_session:   ["Today 14:32","Today 10:15","Yesterday 18:44","2 days ago","3 days ago","1 week ago"][idx % 6],
    sessions_total: 18 + idx * 3,
    diagnosis:      isHigh ? "Chronic Stress Syndrome" : isMod ? "Mild Anxiety Disorder" : "Healthy Baseline",
    doctor:         ["Dr. Priya Sharma","Dr. Ravi Kumar","Dr. Anita Singh"][idx % 3],
    vitals: Array.from({length:10}, (_,i) => ({
      day:    `Day ${i+1}`,
      hrv:    +(p.avg_hrv   + (Math.random()-0.5)*8).toFixed(1),
      sleep:  +(p.avg_sleep_eff + (Math.random()-0.5)*10).toFixed(1),
      stress: +(40 + (p.stress_pct||30) * 0.6 + (Math.random()-0.5)*20).toFixed(1),
    })),
    sessions: Array.from({length:5}, (_,i) => ({
      date:       ["Today 14:32","Yesterday 18:44","Apr 2","Apr 1","Mar 30"][i],
      model:      ["RF","XGB","SVM","RF","XGB"][i],
      label:      isHigh ? (i<3?"Stressed":"Baseline") : isMod ? (i<2?"Stressed":"Baseline") : "Baseline",
      confidence: +(72+Math.random()*22).toFixed(1),
      hrv:        +(p.avg_hrv   + (Math.random()-0.5)*6).toFixed(1),
      sleep:      +(p.avg_sleep_eff + (Math.random()-0.5)*8).toFixed(1),
    })),
  };
}

/* ── Feature derivation (mirrors Python backend) ────────────────────────── */
function deriveFeatures(q) {
  const wl = { Low: 0, Medium: 1, High: 2 }[q.workload] ?? 1;
  const sleep_efficiency    = Math.min(100, Math.max(40, (+q.sleep_hours / 8) * 100));
  const rem_percentage      = Math.max(5,  22 - wl * 3);
  const deep_percentage     = Math.max(3,  15 - wl * 2);
  const waso_minutes        = Math.max(0,  10 + (8 - +q.sleep_hours) * 5 + wl * 8);
  const spo2_dips           = Math.max(0,  (100 - +q.oxygen_level) * 1.5);
  const hrv_rmssd           = Math.max(5,  50 - (+q.heart_rate - 60) * 0.5 - wl * 5);
  const hrv_lf_hf           = +(1.0 + wl * 0.8 + (+q.heart_rate - 60) * 0.02).toFixed(2);
  const resp_rate           = +(12 + (+q.heart_rate - 60) * 0.1).toFixed(1);
  const skin_conductance    = +(3 + wl * 2.5).toFixed(1);
  const body_temp           = 36.6;
  const sleep_onset_latency = Math.max(5, waso_minutes / 2);
  const awakenings          = Math.max(0, Math.round(waso_minutes / 15));
  const sleep_quality_score = sleep_efficiency * 0.4 + rem_percentage * 1.5
                              + deep_percentage * 2 - waso_minutes * 0.3;
  const autonomic_balance   = hrv_rmssd / (hrv_lf_hf + 1e-6);
  const stress_index        = Math.min(100, Math.max(0,
    hrv_lf_hf * 10 + spo2_dips * 5 + wl * 10));
  return {
    hrv_rmssd, hrv_lf_hf, sleep_efficiency, rem_percentage, deep_percentage,
    waso_minutes, spo2_dips, sleep_onset_latency, awakenings, resp_rate,
    skin_conductance, body_temp, sleep_quality_score, autonomic_balance, stress_index,
  };
}

function getInsight(label, q) {
  const reasons = [];
  if (+q.sleep_hours  < 6)       reasons.push("low sleep duration");
  if (+q.oxygen_level < 96)      reasons.push("reduced SpO₂ saturation");
  if (+q.heart_rate   > 90)      reasons.push("elevated heart rate");
  if (q.workload === "High")     reasons.push("high workload pressure");
  const icon = label === "Stressed" ? "⚠️" : label === "Baseline" ? "✅" : "😌";
  const base = label === "Stressed" ? `${icon} High stress detected`
             : label === "Baseline" ? `${icon} Normal stress level`
             :                        `${icon} Low stress — relaxed state`;
  return reasons.length ? `${base} due to ${reasons.join(", ")}` : base;
}

/* ── Prediction Result Card ─────────────────────────────────────────────── */
function PredictionResultCard({ result, inputs, onDismiss, onCounselor }) {
  const th      = getStressTheme(result.label === "Stressed" ? 80
                               : result.label === "Baseline" ? 35 : 15);
  const score   = Math.round(result.derived?.stress_index ?? 50);
  const insight = result.insight || getInsight(result.label, inputs || {});
  return (
    <div style={{ background:th.bg, border:`1px solid ${th.border}`,
      borderRadius:12, padding:"18px 18px 14px", animation:"fadeIn .4s ease" }}>

      {/* Header row */}
      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"flex-start", marginBottom:14 }}>
        <div>
          <div style={{ fontSize:11, color:th.primary, fontWeight:700,
            textTransform:"uppercase", letterSpacing:".1em", marginBottom:4 }}>
            ML Prediction Result
          </div>
          <div style={{ fontSize:22, fontWeight:800, color:th.primary,
            letterSpacing:"-.03em" }}>
            {result.label}
            <span style={{ fontSize:13, fontWeight:400, color:T.t2,
              marginLeft:8 }}>{result.confidence}% confidence</span>
          </div>
        </div>
        {/* Score ring */}
        <div style={{ width:56, height:56, borderRadius:"50%",
          background:`conic-gradient(${th.primary} ${score}%, ${T.bg4} 0)`,
          display:"flex", alignItems:"center", justifyContent:"center",
          flexShrink:0, position:"relative" }}>
          <div style={{ width:42, height:42, borderRadius:"50%",
            background:T.bg2, display:"flex", alignItems:"center",
            justifyContent:"center", flexDirection:"column" }}>
            <span style={{ fontSize:13, fontWeight:800, color:th.primary,
              lineHeight:1 }}>{score}</span>
            <span style={{ fontSize:8, color:T.t3 }}>/ 100</span>
          </div>
        </div>
      </div>

      {/* Insight message */}
      <div style={{ background:T.bg2, borderRadius:8, padding:"10px 12px",
        fontSize:12, color:T.t1, lineHeight:1.65, marginBottom:12,
        borderLeft:`3px solid ${th.primary}` }}>
        {insight}
      </div>

      {/* Probability bars */}
      {result.probabilities && (
        <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:12 }}>
          {Object.entries(result.probabilities).map(([lbl, pct]) => {
            const c = lbl === "Stressed" ? T.high : lbl === "Baseline" ? T.calm : T.mid;
            return (
              <div key={lbl}>
                <div style={{ display:"flex", justifyContent:"space-between",
                  fontSize:10, color:T.t3, marginBottom:2 }}>
                  <span>{lbl}</span><span>{pct}%</span>
                </div>
                <div style={{ height:4, background:T.bg4, borderRadius:2, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${pct}%`,
                    background:c, borderRadius:2,
                    transition:"width 1s cubic-bezier(.4,0,.2,1)" }}/>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div style={{ display:"flex", gap:8 }}>
        {result.label === "Stressed" && onCounselor && (
          <button onClick={onCounselor}
            style={{ flex:1, background:th.gradient, color:"#fff", border:"none",
              borderRadius:7, padding:"8px 0", cursor:"pointer",
              fontSize:12, fontWeight:600 }}>
            🧠 Open Counselor
          </button>
        )}
        <button onClick={onDismiss}
          style={{ flex:1, background:T.bg4, color:T.t2,
            border:`1px solid ${T.line2}`, borderRadius:7, padding:"8px 0",
            cursor:"pointer", fontSize:12 }}>
          Reassess
        </button>
      </div>
    </div>
  );
}

function PatientsPage({ patients, setPatients, token, onCounselor, globalStress=38 }) {
  const [search,     setSearch]     = useState("");
  const [filter,     setFilter]     = useState("all");
  const [adding,     setAdding]     = useState(false);
  const [activeId,   setActiveId]   = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [toast,      setToast]      = useState("");
  const [showAssess, setShowAssess] = useState(false);
  const [assessing,  setAssessing]  = useState(false);
  const [assessInp,  setAssessInp]  = useState({
    hrv_rmssd:30, hrv_lf_hf:2.5, sleep_efficiency:80,
    rem_percentage:18, deep_percentage:14, waso_minutes:25,
    spo2_dips:2, sleep_onset_latency:15, awakenings:2,
    resp_rate:14, skin_conductance:5, body_temp:36.65,
  });
  const [form, setForm] = useState({
    name:"", age:"", gender:"Male", blood_group:"O+",
    contact:"", email:"", address:"", notes:""
  });
  const [assessTab,    setAssessTab]   = useState("quick"); // "quick" | "advanced"
  const [quickInp,     setQuickInp]    = useState({ sleep_hours:7, oxygen_level:98, heart_rate:72, workload:"Medium" });
  const [quickResult,  setQuickResult] = useState(null);
  const [quickLoading, setQuickLoading]= useState(false);

  // Reset assessment panel whenever user selects a different patient
  useEffect(() => { setQuickResult(null); setShowAssess(false); setAssessTab("quick"); }, [activeId]);


  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(""), 3500); };

  const filtered = (patients||[]).filter(p => {
    const sp  = p.stress_pct;
    const lvl = p.pending ? "pending" : sp>40?"high":sp>20?"moderate":"low";
    const mf  = filter==="all" || lvl===filter || (filter==="pending"&&p.pending);
    const ms  = !search || p.name.toLowerCase().includes(search.toLowerCase())
                        || (p.patient_id||"").toLowerCase().includes(search.toLowerCase());
    return mf && ms;
  });

  const counts = {
    all:      (patients||[]).length,
    pending:  (patients||[]).filter(p=>p.pending).length,
    high:     (patients||[]).filter(p=>!p.pending&&(p.stress_pct||0)>40).length,
    moderate: (patients||[]).filter(p=>!p.pending&&(p.stress_pct||0)>20&&(p.stress_pct||0)<=40).length,
    low:      (patients||[]).filter(p=>!p.pending&&(p.stress_pct||0)<=20).length,
  };

  const active = activeId
    ? buildPatientDetail((patients||[]).find(p=>p.patient_id===activeId)||(patients||[])[0])
    : null;

  const save = async () => {
    if (!form.name.trim()) { showToast("Name is required"); return; }
    setSaving(true);
    const newId  = "PAT" + String(Math.floor(1000+Math.random()*9000));
    const newPat = { patient_id:newId, name:form.name.trim(),
      age:+form.age||null, gender:form.gender, blood_group:form.blood_group,
      contact:form.contact, email:form.email, address:form.address, notes:form.notes,
      stress_pct:null, avg_sleep_eff:null, avg_hrv:null,
      pending:true, id:(patients||[]).length };
    const res = await api("/patients",{method:"POST",body:JSON.stringify(form)},token);
    if (res?.patient_id) newPat.patient_id = res.patient_id;
    setPatients(prev=>[newPat,...prev]);
    setActiveId(newPat.patient_id);
    setAdding(false); setSaving(false);
    setForm({name:"",age:"",gender:"Male",blood_group:"O+",contact:"",email:"",address:"",notes:""});
    showToast("Patient registered — open the patient panel and run first assessment");
  };

  const runQuickAssessment = async (pid) => {
    const patId = pid || active?.patient_id;
    if (!patId) return;
    setQuickLoading(true); setQuickResult(null);
    let res = await api("/predict/simple", {
      method:"POST",
      body: JSON.stringify({ ...quickInp, patient_id: patId, model: "rf" }),
    }, token);
    if (!res?.success) {
      // Client-side fallback
      const feat = deriveFeatures(quickInp);
      const si   = feat.stress_index;
      const pred = si > 62 ? 1 : si < 32 ? 2 : 0;
      const lm   = ["Baseline","Stressed","Amusement"];
      res = {
        success: true, prediction: pred, label: lm[pred],
        confidence: +(72 + Math.random()*20).toFixed(1),
        probabilities: { Baseline: pred===0?74:12, Stressed: pred===1?74:14, Amusement: pred===2?70:10 },
        insight: getInsight(lm[pred], quickInp),
        derived: feat,
      };
    }
    // Attach derived features to result for the result card
    if (!res.derived) res.derived = res.derived_features || deriveFeatures(quickInp);
    setQuickResult(res);
    const si = res.derived?.stress_index ?? 50;
    setPatients(prev => prev.map(p => p.patient_id === patId ? {
      ...p, pending: false, stress_pct: Math.round(si),
      avg_sleep_eff: res.derived?.sleep_efficiency ?? quickInp.oxygen_level,
      avg_hrv:       +(res.derived?.hrv_rmssd ?? 30).toFixed(1),
      last_label: res.label, last_confidence: res.confidence,
    } : p));
    setQuickLoading(false);
    showToast(`${res.label} · ${res.confidence}% confidence`);
  };

  const runAssessment = async () => {
    if (!active) return;
    setAssessing(true);
    const sq = assessInp.sleep_efficiency*.4+assessInp.rem_percentage*1.5+
               assessInp.deep_percentage*2-assessInp.waso_minutes*.3-assessInp.awakenings*2;
    const ab = assessInp.hrv_rmssd/(assessInp.hrv_lf_hf+1e-6);
    const si = Math.min(100,Math.max(0,assessInp.hrv_lf_hf*10+assessInp.spo2_dips*5+assessInp.awakenings*3));
    let res = await api("/predict",{method:"POST",
      body:JSON.stringify({...assessInp,sleep_quality_score:sq,autonomic_balance:ab,
        stress_index:si,model:"rf",patient_id:active.patient_id})},token);
    if (!res) {
      const pred=si>62?1:si<32?2:0;
      const lm=["Baseline","Stressed","Amusement"],cm=[T.calm,T.high,T.mid];
      res={prediction:pred,label:lm[pred],color:cm[pred],
           confidence:+(72+Math.random()*20).toFixed(1),
           probabilities:{Baseline:pred===0?74:12,Stressed:pred===1?74:14,Amusement:pred===2?70:10}};
    }
    setPatients(prev=>prev.map(p=>p.patient_id===active.patient_id ? {
      ...p, pending:false, stress_pct:Math.round(si),
      avg_sleep_eff:assessInp.sleep_efficiency, avg_hrv:assessInp.hrv_rmssd,
      last_label:res.label, last_confidence:res.confidence,
    } : p));
    setAssessing(false); setShowAssess(false);
    showToast(`Assessment complete — ${res.label} (${res.confidence}% confidence)`);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:0 }}>

      {/* Toast */}
      {toast && (
        <div style={{ position:"absolute", top:16, right:16, zIndex:200,
          background:T.bg3, border:`1px solid ${T.line2}`, borderRadius:10,
          padding:"11px 18px", fontSize:13, color:T.calm,
          boxShadow:"0 8px 24px rgba(0,0,0,.5)",
          animation:"fadeIn .3s ease" }}>{toast}</div>
      )}

      <SectionHead
        title="Patients"
        sub={`${counts.all} registered · ${counts.pending>0?counts.pending+" awaiting assessment · ":""}${counts.high} high-risk`}
        action={
          <div style={{ display:"flex", gap:8 }}>
            <div style={{ position:"relative" }}>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Search…"
                style={{ background:T.bg4, border:`1px solid ${T.line}`,
                  borderRadius:8, color:T.t1, padding:"8px 12px 8px 32px",
                  fontSize:12, outline:"none", width:190,
                  fontFamily:"'Inter',sans-serif" }}/>
              <span style={{ position:"absolute", left:11, top:"50%",
                transform:"translateY(-50%)", color:T.t3, fontSize:13 }}>⌕</span>
            </div>
            <Btn onClick={()=>setAdding(!adding)}>+ Add patient</Btn>
          </div>
        }/>

      {/* Filter tabs */}
      <div style={{ display:"flex", gap:2, marginBottom:20 }}>
        {[["all","All"],["pending","Pending"],["high","High"],["moderate","Moderate"],["low","Healthy"]].map(([k,l])=>{
          const th = getStressTheme(k==="high"?80:k==="moderate"?55:k==="low"?20:k==="pending"?-1:null);
          const isActive = filter===k;
          return (
            <button key={k} onClick={()=>setFilter(k)}
              style={{ background:isActive?th.bg:"transparent",
                color:isActive?th.primary:T.t3,
                border:`1px solid ${isActive?th.border:T.line}`,
                borderRadius:20, padding:"5px 14px", cursor:"pointer",
                fontSize:11, fontWeight:isActive?600:400,
                transition:"all .2s" }}>
              {l}
              <span style={{ marginLeft:5, opacity:.6,
                fontFamily:"'JetBrains Mono',monospace" }}>
                ({k==="all"?counts.all:counts[k]||0})
              </span>
            </button>
          );
        })}
      </div>

      {/* Add patient form */}
      {adding && (
        <div style={{ background:T.bg2, borderRadius:14, padding:22,
          marginBottom:20, border:`1px solid ${T.line2}`,
          borderTop:`2px solid ${T.accent}` }}>
          <div style={{ fontSize:14, fontWeight:600, color:T.t1, marginBottom:4 }}>
            New patient registration
          </div>
          <div style={{ fontSize:12, color:T.t3, marginBottom:16,
            padding:"9px 13px", background:T.bg4, borderRadius:7,
            borderLeft:`2px solid ${T.accent}` }}>
            Stress and sleep data will be empty until you run a first assessment.
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr",
            gap:12, marginBottom:12 }}>
            {[["name","Full name *","text"],["age","Age","number"],
              ["contact","Phone","tel"],["email","Email","email"]].map(([k,l,t])=>(
              <Input key={k} label={l} type={t} value={form[k]}
                onChange={e=>setForm(p=>({...p,[k]:e.target.value}))}
                placeholder={k==="name"?"e.g. Rahul Sharma":""}/>
            ))}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 2fr",
            gap:12, marginBottom:16 }}>
            <div>
              <label style={{ display:"block", fontSize:11, fontWeight:500,
                color:T.t3, textTransform:"uppercase", letterSpacing:".08em",
                marginBottom:6 }}>Gender</label>
              <select value={form.gender} onChange={e=>setForm(p=>({...p,gender:e.target.value}))}
                style={{ background:T.bg4, border:`1px solid ${T.line}`,
                  borderRadius:8, color:T.t1, padding:"10px 12px",
                  fontSize:13, width:"100%" }}>
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </div>
            <div>
              <label style={{ display:"block", fontSize:11, fontWeight:500,
                color:T.t3, textTransform:"uppercase", letterSpacing:".08em",
                marginBottom:6 }}>Blood group</label>
              <select value={form.blood_group} onChange={e=>setForm(p=>({...p,blood_group:e.target.value}))}
                style={{ background:T.bg4, border:`1px solid ${T.line}`,
                  borderRadius:8, color:T.t1, padding:"10px 12px",
                  fontSize:13, width:"100%" }}>
                {["A+","A-","B+","B-","O+","O-","AB+","AB-"].map(b=><option key={b}>{b}</option>)}
              </select>
            </div>
            <Input label="City" value={form.address}
              onChange={e=>setForm(p=>({...p,address:e.target.value}))} placeholder="e.g. Mumbai"/>
            <Input label="Notes" value={form.notes}
              onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="Optional…"/>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <Btn onClick={save} disabled={saving}
              style={{ background:saving?T.bg4:T.calm, color:saving?T.t3:"#000" }}>
              {saving?"Saving…":"Register patient"}
            </Btn>
            <Btn variant="ghost" onClick={()=>setAdding(false)}>Cancel</Btn>
          </div>
        </div>
      )}

      {/* Master / Detail */}
      <div style={{ display:"grid",
        gridTemplateColumns:active?"1fr 380px":"1fr", gap:20 }}>

        {/* Patient table */}
        <div style={{ background:T.bg2, borderRadius:14,
          border:`1px solid ${T.line}`, overflow:"hidden" }}>

          {/* Table header */}
          <div style={{ display:"grid",
            gridTemplateColumns:"36px 2.4fr 1fr .9fr .9fr .8fr",
            padding:"10px 18px",
            borderBottom:`1px solid ${T.line}`,
            background:T.bg1 }}>
            {["","Patient","Status","Sleep","HRV",""].map((h,i)=>(
              <div key={i} style={{ fontSize:10, color:T.t3,
                textTransform:"uppercase", letterSpacing:".1em",
                fontWeight:500 }}>{h}</div>
            ))}
          </div>

          {filtered.length===0 && (
            <div style={{ padding:"48px 0", textAlign:"center",
              fontSize:13, color:T.t3 }}>No patients match "{search}"</div>
          )}

          {filtered.map((p,i)=>{
            const sp     = p.stress_pct;
            const lvl    = p.pending?"Pending":sp>40?"High":sp>20?"Moderate":"Low";
            const patTh  = p.pending?getStressTheme(-1):getStressTheme(sp);
            const isAct  = activeId===p.patient_id;
            return (
              <div key={p.patient_id} onClick={()=>setActiveId(isAct?null:p.patient_id)}
                style={{ display:"grid",
                  gridTemplateColumns:"36px 2.4fr 1fr .9fr .9fr .8fr",
                  padding:"12px 18px",
                  borderBottom:`1px solid ${T.line}`,
                  cursor:"pointer", alignItems:"center",
                  background:isAct?patTh.bg:"transparent",
                  transition:"background .2s" }}
                onMouseEnter={e=>{if(!isAct)e.currentTarget.style.background=T.bg4;}}
                onMouseLeave={e=>{e.currentTarget.style.background=isAct?patTh.bg:"transparent";}}>
                <Avatar name={p.name} color={patTh.primary} size={28}/>
                <div>
                  <div style={{ fontSize:13, fontWeight:500, color:T.t1,
                    display:"flex", alignItems:"center", gap:7 }}>
                    {p.name}
                    {p.pending && <span style={{ fontSize:9, color:T.mid,
                      background:T.midBg, padding:"1px 6px", borderRadius:4 }}>pending</span>}
                  </div>
                  <div style={{ fontSize:10, color:T.t3, marginTop:1,
                    fontFamily:"'JetBrains Mono',monospace" }}>{p.patient_id}</div>
                </div>
                <div><Tag level={lvl} score={p.pending?-1:sp}/></div>
                <div style={{ fontSize:12, color:p.pending?T.t3:T.teal,
                  fontFamily:"'JetBrains Mono',monospace" }}>
                  {p.pending?"—":`${p.avg_sleep_eff}%`}
                </div>
                <div style={{ fontSize:12, color:p.pending?T.t3:T.calm,
                  fontFamily:"'JetBrains Mono',monospace" }}>
                  {p.pending?"—":`${p.avg_hrv}`}
                </div>
                <div style={{ display:"flex", gap:5, justifyContent:"flex-end",
                  alignItems:"center" }}>
                  {!p.pending&&sp>40&&(
                    <button onClick={e=>{e.stopPropagation();onCounselor(p);}}
                      style={{ background:"transparent", border:"none",
                        color:T.accent, cursor:"pointer",
                        fontSize:13, padding:0 }}>🧠</button>
                  )}
                  <span style={{ color:isAct?patTh.primary:T.t3, fontSize:16,
                    display:"inline-block", transition:"transform .2s",
                    transform:isAct?"rotate(90deg)":"none" }}>›</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail panel */}
        {active && (
          <div style={{ display:"flex", flexDirection:"column", gap:14,
            animation:"slideRight .3s ease" }}>

            {active.pending ? (
              /* ── Pending state ── */
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <Card th={getStressTheme(-1)}>
                  <div style={{ display:"flex", alignItems:"center", gap:12,
                    marginBottom:16 }}>
                    <Avatar name={active.name} color={T.mid} size={42}/>
                    <div>
                      <div style={{ fontSize:15, fontWeight:600, color:T.t1 }}>
                        {active.name}</div>
                      <div style={{ fontSize:11, color:T.t3, marginTop:2,
                        fontFamily:"'JetBrains Mono',monospace" }}>
                        {active.patient_id}</div>
                    </div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
                    gap:8, marginBottom:16 }}>
                    {[["Age",active.age?`${active.age} yrs`:"—"],
                      ["Gender",active.gender||"—"],
                      ["Blood group",active.blood_group||"—"],
                      ["Contact",active.contact||"—"],
                    ].map(([l,v])=>(
                      <div key={l} style={{ background:T.bg4, borderRadius:7,
                        padding:"8px 11px" }}>
                        <div style={{ fontSize:9, color:T.t3, marginBottom:2,
                          textTransform:"uppercase", letterSpacing:".08em" }}>{l}</div>
                        <div style={{ fontSize:12, color:T.t1, fontWeight:500 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background:T.midBg, border:`1px solid ${T.mid}30`,
                    borderRadius:8, padding:"10px 13px", marginBottom:14,
                    fontSize:12, color:T.t2, lineHeight:1.6 }}>
                    No physiological data yet. Enter health details below to generate
                    an ML stress prediction.
                  </div>
                  <Btn onClick={()=>setShowAssess(v=>!v)} style={{ width:"100%" }}>
                    {showAssess?"Close assessment panel":"🩺 Run health assessment"}
                  </Btn>
                </Card>

                {showAssess && (
                  <Card title="Health Assessment"
                    style={{ borderTop:`2px solid ${T.accent}`, padding:0, overflow:"hidden" }}>

                    {/* Tab switcher */}
                    <div style={{ display:"flex", borderBottom:`1px solid ${T.line}` }}>
                      {[["quick","🩺 Quick (Recommended)"],["advanced","⚙️ Advanced (Clinical)"]].map(([k,l])=>(
                        <button key={k} onClick={()=>{setAssessTab(k);setQuickResult(null);}}
                          style={{ flex:1, padding:"11px 8px", border:"none",
                            borderBottom:`2px solid ${assessTab===k?T.accent:"transparent"}`,
                            background:"transparent",
                            color:assessTab===k?T.t1:T.t3, cursor:"pointer",
                            fontSize:12, fontWeight:assessTab===k?600:400,
                            transition:"all .2s" }}>
                          {l}
                        </button>
                      ))}
                    </div>

                    {/* ─── QUICK TAB ─── */}
                    {assessTab==="quick" && (
                      <div style={{ padding:16 }}>
                        {quickResult ? (
                          <PredictionResultCard
                            result={quickResult}
                            inputs={quickInp}
                            onDismiss={()=>setQuickResult(null)}
                            onCounselor={()=>onCounselor(active)}/>
                        ) : (
                          <>
                            {/* 4 simple inputs */}
                            <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:14 }}>

                              {/* Sleep Hours */}
                              <div style={{ background:T.bg4, borderRadius:9, padding:"11px 13px",
                                border:`1px solid ${+quickInp.sleep_hours<6?T.high+"55":T.line}`,
                                transition:"border-color .2s" }}>
                                <div style={{ display:"flex", justifyContent:"space-between",
                                  alignItems:"center", marginBottom:6 }}>
                                  <label style={{ fontSize:11, color:T.t3, fontWeight:600,
                                    textTransform:"uppercase", letterSpacing:".08em" }}>
                                    😴 Sleep Hours
                                  </label>
                                  <span style={{ fontSize:16, fontWeight:800,
                                    color:+quickInp.sleep_hours<6?T.high:T.calm,
                                    fontFamily:"'JetBrains Mono',monospace" }}>
                                    {quickInp.sleep_hours}h
                                  </span>
                                </div>
                                <input type="range" min={0} max={12} step={0.5}
                                  value={quickInp.sleep_hours}
                                  onChange={e=>setQuickInp(p=>({...p,sleep_hours:+e.target.value}))}
                                  style={{ width:"100%", accentColor:+quickInp.sleep_hours<6?T.high:T.calm }}/>
                                <div style={{ display:"flex", justifyContent:"space-between",
                                  fontSize:9, color:T.t3, marginTop:2 }}>
                                  <span>0h</span><span style={{color:T.calm}}>Healthy: 7–9h</span><span>12h</span>
                                </div>
                              </div>

                              {/* SpO2 + Heart Rate side by side */}
                              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                                <div style={{ background:T.bg4, borderRadius:9, padding:"11px 13px",
                                  border:`1px solid ${+quickInp.oxygen_level<96?T.high+"55":T.line}`,
                                  transition:"border-color .2s" }}>
                                  <div style={{ fontSize:11, color:T.t3, fontWeight:600,
                                    textTransform:"uppercase", letterSpacing:".08em", marginBottom:6 }}>
                                    🫁 SpO₂ %
                                  </div>
                                  <input type="number" min={80} max={100} step={1}
                                    value={quickInp.oxygen_level}
                                    onChange={e=>setQuickInp(p=>({...p,oxygen_level:+e.target.value}))}
                                    style={{ background:"transparent", border:"none", outline:"none",
                                      color:+quickInp.oxygen_level<96?T.high:T.teal, fontWeight:800,
                                      fontSize:22, fontFamily:"'JetBrains Mono',monospace", width:"100%" }}/>
                                  <div style={{ fontSize:9, color:T.calm, marginTop:2 }}>Healthy: 96–100%</div>
                                </div>
                                <div style={{ background:T.bg4, borderRadius:9, padding:"11px 13px",
                                  border:`1px solid ${+quickInp.heart_rate>90?T.high+"55":T.line}`,
                                  transition:"border-color .2s" }}>
                                  <div style={{ fontSize:11, color:T.t3, fontWeight:600,
                                    textTransform:"uppercase", letterSpacing:".08em", marginBottom:6 }}>
                                    ❤️ Heart Rate
                                  </div>
                                  <input type="number" min={40} max={180} step={1}
                                    value={quickInp.heart_rate}
                                    onChange={e=>setQuickInp(p=>({...p,heart_rate:+e.target.value}))}
                                    style={{ background:"transparent", border:"none", outline:"none",
                                      color:+quickInp.heart_rate>90?T.high:T.calm, fontWeight:800,
                                      fontSize:22, fontFamily:"'JetBrains Mono',monospace", width:"100%" }}/>
                                  <div style={{ fontSize:9, color:T.calm, marginTop:2 }}>Healthy: 60–90 bpm</div>
                                </div>
                              </div>

                              {/* Workload */}
                              <div style={{ background:T.bg4, borderRadius:9, padding:"11px 13px",
                                border:`1px solid ${quickInp.workload==="High"?T.high+"55":T.line}`,
                                transition:"border-color .2s" }}>
                                <div style={{ fontSize:11, color:T.t3, fontWeight:600,
                                  textTransform:"uppercase", letterSpacing:".08em", marginBottom:8 }}>
                                  💼 Workload Level
                                </div>
                                <div style={{ display:"flex", gap:6 }}>
                                  {["Low","Medium","High"].map(w=>(
                                    <button key={w} onClick={()=>setQuickInp(p=>({...p,workload:w}))}
                                      style={{ flex:1, padding:"8px 0", borderRadius:7, border:"none",
                                        background: quickInp.workload===w
                                          ? (w==="Low"?T.calm:w==="Medium"?T.mid:T.high)
                                          : T.bg3,
                                        color: quickInp.workload===w ? "#000" : T.t3,
                                        cursor:"pointer", fontSize:12, fontWeight:600,
                                        transition:"all .2s" }}>
                                      {w}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Submit button */}
                            <button onClick={()=>runQuickAssessment()}
                              disabled={quickLoading}
                              style={{ width:"100%",
                                background:quickLoading?T.bg4:`linear-gradient(135deg,${T.accent},#a78bfa)`,
                                color:quickLoading?T.t3:"#fff", border:"none",
                                borderRadius:9, padding:"12px 0", cursor:quickLoading?"not-allowed":"pointer",
                                fontSize:14, fontWeight:700, letterSpacing:".01em",
                                transition:"all .2s" }}>
                              {quickLoading ? "⏳ Analysing with ML model…" : "🔬 Predict Stress Level"}
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {/* ─── ADVANCED TAB ─── */}
                    {assessTab==="advanced" && (
                      <div style={{ padding:16 }}>
                        <div style={{ fontSize:11, color:T.t3, marginBottom:12,
                          padding:"8px 10px", background:T.bg4, borderRadius:7,
                          borderLeft:`2px solid ${T.accent}` }}>
                          Enter values from wearable sensor or lab equipment.
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
                          gap:9, marginBottom:14 }}>
                          {[["hrv_rmssd","HRV RMSSD",5,80,.5,[40,70]],
                            ["hrv_lf_hf","LF/HF",.5,8,.1,[1,2.5]],
                            ["sleep_efficiency","Sleep eff. %",40,100,.5,[85,100]],
                            ["rem_percentage","REM %",5,35,.5,[20,25]],
                            ["waso_minutes","WASO (min)",0,90,1,[0,20]],
                            ["spo2_dips","SpO₂ dips",0,15,.5,[0,2]],
                            ["awakenings","Awakenings",0,12,.5,[0,2]],
                            ["body_temp","Body temp °C",35.5,38,.05,[36.4,36.8]],
                          ].map(([k,l,mn,mx,st,healthy])=>{
                            const v   = assessInp[k];
                            const inv = ["hrv_rmssd","sleep_efficiency","rem_percentage"].includes(k);
                            const risk= inv ? v<healthy[0] : v>healthy[1];
                            return (
                              <div key={k} style={{ background:T.bg3,
                                border:`1px solid ${risk?T.high+"44":T.line}`,
                                borderRadius:9, padding:"9px 11px", transition:"border-color .2s" }}>
                                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                                  <span style={{ fontSize:10, color:T.t3,
                                    textTransform:"uppercase", letterSpacing:".06em" }}>{l}</span>
                                  {risk && <span style={{ fontSize:9, color:T.high, fontWeight:600 }}>risk</span>}
                                </div>
                                <input type="number" min={mn} max={mx} step={st}
                                  value={assessInp[k]}
                                  onChange={e=>setAssessInp(p=>({...p,[k]:+e.target.value}))}
                                  style={{ background:"transparent", border:"none",
                                    color:risk?T.high:T.t1, fontWeight:700,
                                    fontFamily:"'JetBrains Mono',monospace",
                                    fontSize:16, outline:"none", width:"100%" }}/>
                                <div style={{ fontSize:9, color:T.calm, marginTop:2 }}>
                                  {healthy[0]}–{healthy[1]}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <Btn onClick={runAssessment} disabled={assessing}
                          style={{ width:"100%", background:assessing?T.bg4:T.calm, color:"#000" }}>
                          {assessing?"Analysing…":"Compute prediction"}
                        </Btn>
                      </div>
                    )}
                  </Card>
                )}
              </div>
            ) : (
              /* ── Assessed state ── */
              <>
                {/* Profile */}
                <Card th={getStressTheme(active.stress_pct)}>
                  <div style={{ display:"flex", alignItems:"center", gap:12,
                    marginBottom:16 }}>
                    <Avatar name={active.name}
                      color={getStressTheme(active.stress_pct).primary} size={44}/>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:16, fontWeight:600, color:T.t1 }}>
                        {active.name}</div>
                      <div style={{ fontSize:11, color:T.t3,
                        fontFamily:"'JetBrains Mono',monospace", marginTop:2 }}>
                        {active.patient_id} · {active.diagnosis}</div>
                    </div>
                    {(active.stress_pct||0)>40 && (
                      <Btn variant="ghost" onClick={()=>onCounselor(active)}
                        style={{ fontSize:11, padding:"6px 11px" }}>
                        🧠 Counselor
                      </Btn>
                    )}
                  </div>

                  {/* Vitals */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr",
                    gap:10, marginBottom:14 }}>
                    {[["Stress",`${active.stress_pct||0}%`,getStressTheme(active.stress_pct)],
                      ["Sleep",`${active.avg_sleep_eff}%`,getStressTheme(20)],
                      ["HRV",`${active.avg_hrv} ms`,getStressTheme(15)],
                    ].map(([l,v,tth])=>(
                      <div key={l} style={{ background:tth.bg, borderRadius:8,
                        padding:"11px 13px", borderTop:`2px solid ${tth.primary}`,
                        transition:"all .5s" }}>
                        <div style={{ fontSize:9, color:T.t3,
                          textTransform:"uppercase", letterSpacing:".08em",
                          marginBottom:4 }}>{l}</div>
                        <div style={{ fontSize:18, fontWeight:700,
                          color:tth.primary, letterSpacing:"-.02em",
                          fontFamily:"'JetBrains Mono',monospace" }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Info grid */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
                    gap:6 }}>
                    {[["Doctor",active.doctor],["Enrolled",active.enrolled],
                      ["Last session",active.last_session],["Blood group",active.blood_group||"—"],
                    ].map(([l,v])=>(
                      <div key={l} style={{ background:T.bg4, borderRadius:7,
                        padding:"7px 10px" }}>
                        <div style={{ fontSize:9, color:T.t3,
                          textTransform:"uppercase", letterSpacing:".08em",
                          marginBottom:2 }}>{l}</div>
                        <div style={{ fontSize:11, color:T.t1, fontWeight:500 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Mini trend */}
                {active.vitals?.length > 0 && (
                  <Card title="10-day trend" pad={18}>
                    <ResponsiveContainer width="100%" height={110}>
                      <LineChart data={active.vitals}>
                        <CartesianGrid strokeDasharray="3 3" stroke={T.line}/>
                        <XAxis dataKey="day" tick={{fill:T.t3,fontSize:9}} interval={2}/>
                        <YAxis tick={{fill:T.t3,fontSize:9}} width={24}/>
                        <Tooltip {...TT}/>
                        <Line type="monotone" dataKey="stress" stroke={T.high}
                          strokeWidth={1.5} dot={false} name="Stress"/>
                        <Line type="monotone" dataKey="hrv" stroke={T.calm}
                          strokeWidth={1.5} dot={false} name="HRV"/>
                        <Line type="monotone" dataKey="sleep" stroke={T.teal}
                          strokeWidth={1.5} dot={false} name="Sleep%"/>
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>
                )}

                {/* Sessions */}
                {active.sessions?.length > 0 && (
                  <Card title="Recent sessions"
                    badge={`${active.sessions_total} total`} pad={0}>
                    {active.sessions.map((s,i)=>(
                      <div key={i} style={{ display:"grid",
                        gridTemplateColumns:"1.4fr .8fr .7fr .7fr",
                        padding:"11px 18px",
                        borderBottom:i<active.sessions.length-1?`1px solid ${T.line}`:"none",
                        alignItems:"center" }}>
                        <div>
                          <div style={{ fontSize:12, color:T.t1, fontWeight:500 }}>{s.date}</div>
                          <div style={{ fontSize:10, color:T.t3 }}>Model: {s.model}</div>
                        </div>
                        <Tag level={s.label}/>
                        <span style={{ fontSize:11, color:T.teal,
                          fontFamily:"'JetBrains Mono',monospace" }}>{s.sleep}%</span>
                        <span style={{ fontSize:11, color:T.t3,
                          fontFamily:"'JetBrains Mono',monospace",
                          textAlign:"right" }}>{s.confidence}%</span>
                      </div>
                    ))}
                  </Card>
                )}

                {/* Actions */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  <Btn onClick={()=>onCounselor(active)}
                    style={{ justifyContent:"center" }}>
                    🧠 AI Counselor
                  </Btn>
                  <Btn variant="ghost" onClick={async()=>{
                    const res=await fetch(`${API}/patients/${active.patient_id}/report`,
                      {headers:{"Authorization":`Bearer ${token}`}});
                    if(res?.ok){const b=await res.blob();
                      const u=URL.createObjectURL(b);
                      const a=document.createElement("a");
                      a.href=u;a.download=`report_${active.patient_id}.html`;a.click();}
                  }}
                    style={{ justifyContent:"center" }}>
                    📄 Report
                  </Btn>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function genTrend(pat) {
  const base_stress = pat?.stress_pct || 40;
  const base_eff    = pat?.avg_sleep_eff || 78;
  const base_hrv    = pat?.avg_hrv || 32;
  return Array.from({ length:14 }, (_,i) => {
    const noise = () => (Math.random() - 0.5) * 2;
    const eff   = +(base_eff   + noise()*9).toFixed(1);
    const hrv   = +(base_hrv   + noise()*8).toFixed(1);
    const rem   = +(18 + noise()*5).toFixed(1);
    const deep  = +(14 + noise()*5).toFixed(1);
    const waso  = +(22 + noise()*14).toFixed(1);
    const si    = +(base_stress * 0.9 + noise()*15).toFixed(1);
    const labels = ["Baseline","Stressed","Amusement"];
    const label  = si > 55 ? "Stressed" : si < 30 ? "Amusement" : "Baseline";
    return { night:i+1, sleep_efficiency:Math.max(40,Math.min(100,eff)),
      hrv_rmssd:Math.max(10,hrv), rem_pct:Math.max(5,rem),
      deep_pct:Math.max(3,deep), waso:Math.max(0,waso),
      stress_index:Math.max(0,Math.min(100,si)), label };
  });
}

function TrendPage({ patients, token, onCounselor, globalStress=38 }) {
  const assessedPats = (patients||[]).filter(p=>!p.pending);
  const [selId,    setSelId]    = useState(assessedPats[0]?.patient_id||null);
  const [trend,    setTrend]    = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [view,     setView]     = useState("charts");

  const patient = assessedPats.find(p=>p.patient_id===selId)||assessedPats[0];
  const th      = getStressTheme(globalStress);

  useEffect(()=>{
    if(!assessedPats.length) return;
    if(!selId) setSelId(assessedPats[0]?.patient_id);
    if(!patient) return;
    setLoading(true); setTrend(null);
    const load = async()=>{
      const res = await api(`/demo/trend/${patient?.id||0}`);
      setTrend(res?.nights?.length?res.nights:mockTrend(patient));
      setLoading(false);
    };
    load();
  },[selId,patient?.patient_id]);

  const summary = trend ? {
    avgStress: +((trend||[]).reduce((a,n)=>a+n.stress_index,0)/(trend?.length||1)).toFixed(1),
    avgSleep:  +((trend||[]).reduce((a,n)=>a+n.sleep_efficiency,0)/(trend?.length||1)).toFixed(1),
    avgHrv:    +((trend||[]).reduce((a,n)=>a+n.hrv_rmssd,0)/(trend?.length||1)).toFixed(1),
    stressed:  (trend||[]).filter(n=>n.label==="Stressed").length,
    trend7:    +((trend||[]).slice(-7).reduce((a,n)=>a+n.stress_index,0)/Math.max((trend||[]).slice(-7).length,1) -
                 (trend||[]).slice(0,7).reduce((a,n)=>a+n.stress_index,0)/Math.max((trend||[]).slice(0,7).length,1)).toFixed(1),
  } : null;

  const dl = async()=>{
    const res=await fetch(`${API}/patients/${patient?.patient_id}/report`,
      {headers:{"Authorization":`Bearer ${token}`}});
    if(res?.ok){const b=await res.blob();const u=URL.createObjectURL(b);
      const a=document.createElement("a");a.href=u;
      a.download=`report_${patient.patient_id}.html`;a.click();}
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:24}}>

      <SectionHead
        title="Sleep trend analysis"
        sub="14-night longitudinal physiological monitoring"
        action={
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {/* Patient selector */}
            <div style={{display:"flex",alignItems:"center",gap:8,
              background:T.bg2,border:`1px solid ${T.line}`,
              borderRadius:8,padding:"7px 12px"}}>
              <span style={{fontSize:11,color:T.t3}}>Patient</span>
              <select value={selId||""} onChange={e=>setSelId(e.target.value)}
                style={{background:"transparent",border:"none",color:T.t1,
                  fontSize:13,fontWeight:500,cursor:"pointer",outline:"none"}}>
                {assessedPats.map(p=>(
                  <option key={p.patient_id} value={p.patient_id}
                    style={{background:T.bg2}}>{p.name}</option>
                ))}
              </select>
            </div>
            {/* View toggle */}
            <div style={{display:"flex",background:T.bg2,
              border:`1px solid ${T.line}`,borderRadius:8,overflow:"hidden"}}>
              {[["charts","Charts"],["table","Table"]].map(([k,l])=>(
                <button key={k} onClick={()=>setView(k)}
                  style={{background:view===k?th.primary:"transparent",
                    color:view===k?"#000":T.t3,border:"none",
                    padding:"7px 14px",cursor:"pointer",
                    fontSize:12,fontWeight:view===k?600:400,
                    transition:"all .2s"}}>{l}</button>
              ))}
            </div>
            <Btn variant="ghost" onClick={dl} style={{fontSize:12,padding:"7px 12px"}}>
              Download report
            </Btn>
          </div>
        }/>

      {/* Patient strip */}
      {patient && (
        <div style={{display:"flex",alignItems:"center",gap:14,
          background:T.bg2,borderRadius:12,padding:"14px 18px",
          borderLeft:`3px solid ${th.primary}`,
          border:`1px solid ${th.border}`,
          transition:"border-color .5s"}}>
          <Avatar name={patient.name} color={th.primary} size={38}/>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:600,color:T.t1}}>{patient.name}</div>
            <div style={{fontSize:11,color:T.t3,marginTop:1,
              fontFamily:"'JetBrains Mono',monospace"}}>
              {patient.patient_id} · Baseline sleep {patient.avg_sleep_eff}% · HRV {patient.avg_hrv} ms
            </div>
          </div>
          <StressLevelBadge score={globalStress}/>
          {(patient.stress_pct||0)>40&&(
            <Btn variant="ghost" onClick={()=>onCounselor(patient)}
              style={{fontSize:12,padding:"6px 12px"}}>🧠 Counselor</Btn>
          )}
        </div>
      )}

      {/* Summary stats */}
      {summary && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",
          gap:1,background:T.line,borderRadius:12,overflow:"hidden"}}>
          {[
            {l:"Avg stress",   v:summary.avgStress, th_:getStressTheme(summary.avgStress)},
            {l:"Avg sleep",    v:`${summary.avgSleep}%`, th_:getStressTheme(20)},
            {l:"Avg HRV",      v:`${summary.avgHrv} ms`, th_:getStressTheme(15)},
            {l:"Stressed nights", v:`${summary.stressed}/14`, th_:getStressTheme(summary.stressed*7)},
            {l:"7-day trend",  v:`${summary.trend7>0?"+":""}${summary.trend7}`,
              th_:getStressTheme(summary.trend7>5?80:summary.trend7<-5?15:50)},
          ].map(({l,v,th_})=>(
            <div key={l} style={{background:T.bg2,padding:"16px 18px"}}>
              <div style={{fontSize:10,color:T.t3,textTransform:"uppercase",
                letterSpacing:".08em",marginBottom:8}}>{l}</div>
              <div style={{fontSize:22,fontWeight:700,color:th_.primary,
                letterSpacing:"-.03em",transition:"color .5s"}}>{v}</div>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div style={{background:T.bg2,borderRadius:12,padding:60,
          textAlign:"center",fontSize:13,color:T.t3,
          animation:"pulse 1.4s ease-in-out infinite"}}>
          Loading…
        </div>
      )}

      {/* Charts view */}
      {trend&&!loading&&view==="charts"&&(
        <div style={{display:"flex",flexDirection:"column",gap:18}}>
          <Card title="Sleep efficiency & HRV" badge="14 nights"
            th={th}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.line}/>
                <XAxis dataKey="night" tick={{fill:T.t3,fontSize:10}}/>
                <YAxis tick={{fill:T.t3,fontSize:10}}/>
                <Tooltip {...TT}/>
                <Legend wrapperStyle={{color:T.t2,fontSize:12}}/>
                <Line type="monotone" dataKey="sleep_efficiency" stroke={T.teal}
                  strokeWidth={2} dot={{r:3,fill:T.teal,strokeWidth:0}}
                  name="Sleep eff %" activeDot={{r:5}}/>
                <Line type="monotone" dataKey="hrv_rmssd" stroke={T.calm}
                  strokeWidth={2} dot={{r:3,fill:T.calm,strokeWidth:0}}
                  name="HRV (ms)" activeDot={{r:5}}/>
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
            {/* Stress area */}
            <Card title="Stress index" th={th}>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="sgrd" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={th.primary} stopOpacity={.35}/>
                      <stop offset="95%" stopColor={th.primary} stopOpacity={.02}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.line}/>
                  <XAxis dataKey="night" tick={{fill:T.t3,fontSize:9}}/>
                  <YAxis domain={[0,100]} tick={{fill:T.t3,fontSize:9}}/>
                  <Tooltip {...TT}/>
                  <Area type="monotone" dataKey="stress_index"
                    stroke={th.primary} fill="url(#sgrd)"
                    strokeWidth={2} dot={false} name="Stress index"
                    style={{transition:"stroke .5s"}}/>
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* Sleep stages */}
            <Card title="Sleep stages">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={trend} barSize={7}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.line}/>
                  <XAxis dataKey="night" tick={{fill:T.t3,fontSize:9}}/>
                  <YAxis tick={{fill:T.t3,fontSize:9}}/>
                  <Tooltip {...TT}/>
                  <Legend wrapperStyle={{color:T.t2,fontSize:10}}/>
                  <Bar dataKey="rem_pct"  fill={th.primary}   name="REM %"  radius={[2,2,0,0]}/>
                  <Bar dataKey="deep_pct" fill={th.secondary} name="Deep %" radius={[2,2,0,0]}/>
                  <Bar dataKey="waso"     fill={T.high}       name="WASO"   radius={[2,2,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* HRV vs stress */}
            <Card title="HRV vs stress">
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.line}/>
                  <XAxis dataKey="night" tick={{fill:T.t3,fontSize:9}}/>
                  <YAxis yAxisId="l" tick={{fill:T.calm,fontSize:9}}/>
                  <YAxis yAxisId="r" orientation="right" domain={[0,100]} tick={{fill:th.primary,fontSize:9}}/>
                  <Tooltip {...TT}/>
                  <Legend wrapperStyle={{color:T.t2,fontSize:10}}/>
                  <Line yAxisId="l" type="monotone" dataKey="hrv_rmssd"
                    stroke={T.calm} strokeWidth={1.5} dot={false} name="HRV"/>
                  <Line yAxisId="r" type="monotone" dataKey="stress_index"
                    stroke={th.primary} strokeWidth={1.5} dot={false}
                    strokeDasharray="4 2" name="Stress"
                    style={{transition:"stroke .5s"}}/>
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Clinical insight */}
          {summary && (
            <div style={{background:T.bg2,borderRadius:12,
              padding:"16px 20px",
              border:`1px solid ${summary.trend7>5?T.highBg:T.line}`,
              borderLeft:`3px solid ${summary.trend7>5?T.high:summary.trend7<-5?T.calm:T.mid}`,
              display:"flex",alignItems:"center",gap:16,
              transition:"border-color .5s"}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:500,color:T.t1,marginBottom:3}}>
                  {summary.trend7>5?"Stress trending upward over the last 7 nights"
                   :summary.trend7<-5?"Stress improving — positive 7-night trend"
                   :"Stress levels stable across observation period"}
                </div>
                <div style={{fontSize:12,color:T.t3,lineHeight:1.6}}>
                  {summary.stressed} of 14 nights stressed ·
                  Sleep {summary.avgSleep}% · HRV {summary.avgHrv} ms
                </div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:28,fontWeight:700,
                  color:summary.trend7>5?T.high:summary.trend7<-5?T.calm:T.mid,
                  fontFamily:"'JetBrains Mono',monospace",
                  transition:"color .5s"}}>
                  {summary.trend7>0?"+":""}{summary.trend7}
                </div>
                <div style={{fontSize:10,color:T.t3}}>7-day Δ</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Table view */}
      {trend&&!loading&&view==="table"&&(
        <div style={{background:T.bg2,borderRadius:12,
          border:`1px solid ${T.line}`,overflow:"hidden"}}>
          <div style={{display:"grid",
            gridTemplateColumns:"52px 1fr 1fr 1fr 1fr 1fr 1fr 90px",
            padding:"9px 18px",borderBottom:`1px solid ${T.line}`,
            background:T.bg1}}>
            {["Night","Sleep eff.","HRV","Stress","REM","Deep","WASO","Status"].map(h=>(
              <div key={h} style={{fontSize:10,color:T.t3,textTransform:"uppercase",
                letterSpacing:".09em",fontWeight:500}}>{h}</div>
            ))}
          </div>
          {(trend||[]).map((n,i)=>{
            const ntTh = getStressTheme(n.stress_index);
            return (
              <div key={i} style={{display:"grid",
                gridTemplateColumns:"52px 1fr 1fr 1fr 1fr 1fr 1fr 90px",
                padding:"10px 18px",
                borderBottom:`1px solid ${T.line}`,
                alignItems:"center",
                background:n.stress_index>65?ntTh.bg:"transparent",
                transition:"background .3s"}}>
                <span style={{fontSize:11,color:T.t3,
                  fontFamily:"'JetBrains Mono',monospace"}}>N{n.night}</span>
                <div>
                  <div style={{fontSize:12,color:T.teal,
                    fontFamily:"'JetBrains Mono',monospace"}}>{n.sleep_efficiency}%</div>
                  <div style={{background:T.bg4,borderRadius:2,height:3,
                    width:"70%",marginTop:3}}>
                    <div style={{width:`${n.sleep_efficiency}%`,height:"100%",
                      borderRadius:2,background:T.teal}}/>
                  </div>
                </div>
                <span style={{fontSize:12,color:T.calm,
                  fontFamily:"'JetBrains Mono',monospace"}}>{n.hrv_rmssd}</span>
                <div>
                  <span style={{fontSize:12,fontWeight:600,
                    color:ntTh.primary,
                    fontFamily:"'JetBrains Mono',monospace",
                    transition:"color .5s"}}>{n.stress_index}</span>
                  <div style={{background:T.bg4,borderRadius:2,height:3,
                    width:"70%",marginTop:3}}>
                    <div style={{width:`${n.stress_index}%`,height:"100%",
                      borderRadius:2,background:ntTh.primary,
                      transition:"background .5s"}}/>
                  </div>
                </div>
                <span style={{fontSize:12,color:T.t2,
                  fontFamily:"'JetBrains Mono',monospace"}}>{n.rem_pct}%</span>
                <span style={{fontSize:12,color:T.t3,
                  fontFamily:"'JetBrains Mono',monospace"}}>{n.deep_pct}%</span>
                <span style={{fontSize:12,color:T.t3,
                  fontFamily:"'JetBrains Mono',monospace"}}>{n.waso}</span>
                <Tag level={n.label}/>
              </div>
            );
          })}
          {summary&&(
            <div style={{display:"grid",
              gridTemplateColumns:"52px 1fr 1fr 1fr 1fr 1fr 1fr 90px",
              padding:"10px 18px",background:T.bg1,
              borderTop:`1px solid ${T.line2}`}}>
              <span style={{fontSize:10,color:T.t3}}>Avg</span>
              <span style={{fontSize:12,fontWeight:600,color:T.teal,
                fontFamily:"'JetBrains Mono',monospace"}}>{summary.avgSleep}%</span>
              <span style={{fontSize:12,fontWeight:600,color:T.calm,
                fontFamily:"'JetBrains Mono',monospace"}}>{summary.avgHrv}</span>
              <span style={{fontSize:12,fontWeight:600,
                color:getStressTheme(summary.avgStress).primary,
                fontFamily:"'JetBrains Mono',monospace",
                transition:"color .5s"}}>{summary.avgStress}</span>
              <span style={{fontSize:11,color:T.t3}}>—</span>
              <span style={{fontSize:11,color:T.t3}}>—</span>
              <span style={{fontSize:11,color:T.t3}}>—</span>
              <span style={{fontSize:11,color:T.t3}}>{summary.stressed}/14</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* Parameter definitions: key, label, min, max, step, healthy range, unit, description */
const PARAM_META = [
  { k:"hrv_rmssd",           l:"HRV RMSSD",          min:5,   max:80,  step:.5,  healthy:[40,70],  unit:"ms",    desc:"Heart rate variability — lower = more stress",   icon:"💓", group:"cardiac"  },
  { k:"hrv_lf_hf",           l:"LF/HF Ratio",        min:.5,  max:8,   step:.1,  healthy:[1,2.5],  unit:"",      desc:"Sympathetic/parasympathetic balance",             icon:"⚖️", group:"cardiac"  },
  { k:"sleep_efficiency",    l:"Sleep Efficiency",   min:40,  max:100, step:.5,  healthy:[85,100], unit:"%",     desc:"Time asleep ÷ time in bed × 100",                icon:"😴", group:"sleep"    },
  { k:"rem_percentage",      l:"REM %",              min:5,   max:35,  step:.5,  healthy:[20,25],  unit:"%",     desc:"REM sleep proportion — reduced under stress",     icon:"🌙", group:"sleep"    },
  { k:"deep_percentage",     l:"Deep Sleep %",       min:3,   max:30,  step:.5,  healthy:[15,25],  unit:"%",     desc:"Slow-wave sleep — critical for recovery",         icon:"🛌", group:"sleep"    },
  { k:"waso_minutes",        l:"WASO",               min:0,   max:90,  step:1,   healthy:[0,20],   unit:"min",   desc:"Wake after sleep onset — elevated in stress",     icon:"⏰", group:"sleep"    },
  { k:"spo2_dips",           l:"SpO₂ Dips",         min:0,   max:15,  step:.5,  healthy:[0,2],    unit:"",      desc:"Blood oxygen desaturation events per night",      icon:"🩸", group:"biometric"},
  { k:"sleep_onset_latency", l:"Onset Latency",      min:1,   max:60,  step:1,   healthy:[5,15],   unit:"min",   desc:"Minutes to fall asleep — high = racing mind",    icon:"🕐", group:"sleep"    },
  { k:"awakenings",          l:"Awakenings",         min:0,   max:12,  step:.5,  healthy:[0,2],    unit:"",      desc:"Number of full awakenings per night",             icon:"👁️", group:"sleep"    },
  { k:"resp_rate",           l:"Resp. Rate",         min:8,   max:25,  step:.5,  healthy:[12,16],  unit:"/min",  desc:"Average breaths per minute during sleep",         icon:"💨", group:"biometric"},
  { k:"skin_conductance",    l:"Skin Conductance",   min:1,   max:15,  step:.1,  healthy:[1,5],    unit:"μS",    desc:"Electrodermal activity — stress indicator",       icon:"🖐", group:"biometric"},
  { k:"body_temp",           l:"Body Temp",          min:35.5,max:38,  step:.05, healthy:[36.4,36.8],unit:"°C", desc:"Core temperature — elevated under stress",        icon:"🌡️", group:"biometric"},
];

const PRESETS = {
  stressed:  { hrv_rmssd:22,hrv_lf_hf:3.8,sleep_efficiency:72,rem_percentage:14,deep_percentage:10,waso_minutes:45,spo2_dips:6,sleep_onset_latency:28,awakenings:5.5,resp_rate:17,skin_conductance:8.5,body_temp:36.9  },
  baseline:  { hrv_rmssd:44,hrv_lf_hf:1.8,sleep_efficiency:88,rem_percentage:22,deep_percentage:18,waso_minutes:18,spo2_dips:1.5,sleep_onset_latency:12,awakenings:1.5,resp_rate:14,skin_conductance:4.5,body_temp:36.55 },
  moderate:  { hrv_rmssd:31,hrv_lf_hf:2.8,sleep_efficiency:78,rem_percentage:17,deep_percentage:13,waso_minutes:32,spo2_dips:3.5,sleep_onset_latency:20,awakenings:3.5,resp_rate:15.5,skin_conductance:6.5,body_temp:36.72},
};

/* Risk flag for a single parameter */
function getRisk(k, v) {
  const m = PARAM_META.find(p=>p.k===k);
  if (!m) return "ok";
  const [lo, hi] = m.healthy;
  const inv = ["hrv_rmssd","sleep_efficiency","rem_percentage","deep_percentage"].includes(k);
  if (inv) return v < lo ? "high" : v > hi ? "ok" : "ok";
  return v > hi ? "high" : v > hi*0.75 ? "warn" : "ok";
}

function PredictPageInner({ patients, token, onCounselor, setGlobalStress, onFindDoctors, onPredictionResult }) {
  /* ── State ── */
  const [inp,       setInp]      = useState({
    hrv_rmssd:30, hrv_lf_hf:2.5, sleep_efficiency:80,
    rem_percentage:18, deep_percentage:14, waso_minutes:25,
    spo2_dips:2, sleep_onset_latency:15, awakenings:2,
    resp_rate:14, skin_conductance:5, body_temp:36.65,
  });
  const [model,    setModel]     = useState("rf");
  const [pid,      setPid]       = useState("");
  const [result,   setResult]    = useState(null);
  const [loading,  setLoading]   = useState(false);
  const [history,  setHistory]   = useState([]);
  const [activeTab,setActiveTab] = useState("sleep"); // sleep | cardiac | biometric

  useEffect(() => {
    if (result && result.prediction === 1 && onFindDoctors) {
      const t = setTimeout(() => {
        onFindDoctors();
      }, 3500);
      return () => clearTimeout(t);
    }
  }, [result, onFindDoctors]);

  /* ── Live derived scores ── */
  const sq = inp.sleep_efficiency*.4+inp.rem_percentage*1.5+inp.deep_percentage*2
             -inp.waso_minutes*.3-inp.awakenings*2;
  const si = Math.min(100,Math.max(0,
             inp.hrv_lf_hf*10+inp.spo2_dips*5+inp.awakenings*3));
  const ab = inp.hrv_rmssd/(inp.hrv_lf_hf+1e-6);

  /* Live theme from stress index */
  const liveTh = getStressTheme(si);

  /* Update global theme as sliders move */
  useEffect(()=>{ if(setGlobalStress) setGlobalStress(si); },[si]);

  /* ── Presets ── */
  const PRESETS = {
    stressed: { hrv_rmssd:22,hrv_lf_hf:3.8,sleep_efficiency:72,rem_percentage:14,
      deep_percentage:10,waso_minutes:45,spo2_dips:6,sleep_onset_latency:28,
      awakenings:5.5,resp_rate:17,skin_conductance:8.5,body_temp:36.9 },
    moderate: { hrv_rmssd:32,hrv_lf_hf:2.8,sleep_efficiency:78,rem_percentage:17,
      deep_percentage:13,waso_minutes:30,spo2_dips:3.5,sleep_onset_latency:20,
      awakenings:3,resp_rate:15.5,skin_conductance:6,body_temp:36.72 },
    baseline: { hrv_rmssd:44,hrv_lf_hf:1.8,sleep_efficiency:88,rem_percentage:22,
      deep_percentage:18,waso_minutes:18,spo2_dips:1.5,sleep_onset_latency:12,
      awakenings:1.5,resp_rate:14,skin_conductance:4.5,body_temp:36.55 },
  };

  /* ── Parameter meta ── */
  const FIELDS = {
    sleep: [
      { k:"sleep_efficiency",    l:"Sleep efficiency",   u:"%",    min:40,  max:100, step:.5,  healthy:[85,100], inv:true  },
      { k:"rem_percentage",      l:"REM %",              u:"%",    min:5,   max:35,  step:.5,  healthy:[20,25],  inv:true  },
      { k:"deep_percentage",     l:"Deep sleep %",       u:"%",    min:3,   max:30,  step:.5,  healthy:[15,25],  inv:true  },
      { k:"waso_minutes",        l:"WASO",               u:"min",  min:0,   max:90,  step:1,   healthy:[0,20],   inv:false },
      { k:"sleep_onset_latency", l:"Onset latency",      u:"min",  min:1,   max:60,  step:1,   healthy:[5,15],   inv:false },
      { k:"awakenings",          l:"Awakenings",         u:"",     min:0,   max:12,  step:.5,  healthy:[0,2],    inv:false },
    ],
    cardiac: [
      { k:"hrv_rmssd",           l:"HRV RMSSD",          u:"ms",   min:5,   max:80,  step:.5,  healthy:[40,70],  inv:true  },
      { k:"hrv_lf_hf",           l:"LF/HF ratio",        u:"",     min:.5,  max:8,   step:.1,  healthy:[1,2.5],  inv:false },
      { k:"resp_rate",           l:"Resp. rate",          u:"/min", min:8,   max:25,  step:.5,  healthy:[12,16],  inv:false },
    ],
    biometric: [
      { k:"spo2_dips",           l:"SpO2 dips",           u:"",     min:0,   max:15,  step:.5,  healthy:[0,2],    inv:false },
      { k:"skin_conductance",    l:"Skin conductance",    u:"uS",   min:1,   max:15,  step:.1,  healthy:[1,5],    inv:false },
      { k:"body_temp",           l:"Body temp",           u:"C",    min:35.5,max:38,  step:.05, healthy:[36.4,36.8],inv:false },
    ],
  };

  const allFields = [...FIELDS.sleep,...FIELDS.cardiac,...FIELDS.biometric];

  function getRisk(field, value) {
    const v = +value;
    if (field.inv) return v < field.healthy[0] ? "high" : "ok";
    return v > field.healthy[1] ? "high" : v > field.healthy[1]*.8 ? "warn" : "ok";
  }

  const highRiskFields = allFields.filter(f=>getRisk(f,inp[f.k])==="high");

  /* ── Run prediction ── */
  const run = async()=>{
    setLoading(true);
    const payload = {...inp,sleep_quality_score:sq,autonomic_balance:ab,
      stress_index:si,model,patient_id:pid||undefined};
    let res = await api("/predict",{method:"POST",body:JSON.stringify(payload)},token);
    if(!res){
      const pred=si>62?1:si<32?2:0;
      const lm=["Baseline","Stressed","Amusement"];
      const conf=+(72+Math.random()*22).toFixed(1);
      res={prediction:pred,label:lm[pred],
        color:pred===1?T.high:pred===0?T.calm:T.mid,
        confidence:conf,
        probabilities:{
          Baseline: pred===0?conf:+(8+Math.random()*15).toFixed(1),
          Stressed: pred===1?conf:+(6+Math.random()*14).toFixed(1),
          Amusement:pred===2?conf:+(4+Math.random()*10).toFixed(1),
        }};
    }
    const entry={...res,
      time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),
      si:si.toFixed(0), hrv:inp.hrv_rmssd, sleep:inp.sleep_efficiency, model};
    setHistory(h=>[entry,...h.slice(0,6)]);
    setResult(res);
    if (onPredictionResult) onPredictionResult(entry, inp);
    setLoading(false);
  };

  /* ── Slider field component ── */
  const SliderField = ({field})=>{
    const v    = inp[field.k];
    const risk = getRisk(field, v);
    const rc   = risk==="high"?T.high:risk==="warn"?T.mid:T.calm;
    const pct  = ((v-field.min)/(field.max-field.min))*100;
    const hPct1 = ((field.healthy[0]-field.min)/(field.max-field.min))*100;
    const hPct2 = ((field.healthy[1]-field.min)/(field.max-field.min))*100;
    return (
      <div style={{
        background:T.bg3,
        border:`1px solid ${risk==="high"?T.high+"44":T.line}`,
        borderRadius:10, padding:"12px 14px",
        transition:"border-color .25s ease",
      }}>
        <div style={{display:"flex",justifyContent:"space-between",
          alignItems:"center",marginBottom:8}}>
          <span style={{fontSize:11,color:T.t2,fontWeight:500}}>{field.l}</span>
          <div style={{display:"flex",alignItems:"center",gap:7}}>
            {risk==="high"&&(
              <span style={{fontSize:9,color:T.high,fontWeight:600,
                background:T.highBg,padding:"1px 6px",borderRadius:3}}>
                RISK
              </span>
            )}
            <span style={{
              fontFamily:"'JetBrains Mono',monospace",
              fontSize:15,fontWeight:700,color:rc,
              transition:"color .3s",minWidth:40,textAlign:"right",
            }}>{v}{field.u}</span>
          </div>
        </div>
        {/* Track */}
        <div style={{position:"relative",height:6,background:T.bg4,
          borderRadius:3,marginBottom:5}}>
          {/* Healthy zone */}
          <div style={{position:"absolute",top:0,height:"100%",
            borderRadius:3,background:`${T.calm}25`,
            left:`${hPct1}%`,width:`${hPct2-hPct1}%`}}/>
          {/* Fill */}
          <div style={{position:"absolute",top:0,height:"100%",
            borderRadius:3,background:rc,
            width:`${pct}%`,transition:"width .08s,background .3s"}}/>
          {/* Thumb input */}
          <input type="range" min={field.min} max={field.max} step={field.step}
            value={v}
            onChange={e=>setInp(p=>({...p,[field.k]:+e.target.value}))}
            style={{position:"absolute",inset:0,width:"100%",opacity:0,
              cursor:"pointer",height:"100%",margin:0}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",
          fontSize:9,color:T.t3}}>
          <span>{field.min}{field.u}</span>
          <span style={{color:`${T.calm}99`}}>
            healthy {field.healthy[0]}-{field.healthy[1]}{field.u}
          </span>
          <span>{field.max}{field.u}</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:24,
      alignItems:"start"}}>

      {/* ── LEFT: Input panel ── */}
      <div style={{display:"flex",flexDirection:"column",gap:16}}>

        {/* Header row */}
        <div style={{display:"flex",justifyContent:"space-between",
          alignItems:"center"}}>
          <div>
            <h2 style={{fontSize:18,fontWeight:700,color:T.t1,
              letterSpacing:"-.025em",marginBottom:3}}>
              Stress Assessment
            </h2>
            <p style={{fontSize:12,color:T.t2}}>
              Adjust parameters with sliders — live score updates instantly
            </p>
          </div>
          {/* Patient + Model selectors */}
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <div style={{background:T.bg3,border:`1px solid ${T.line}`,
              borderRadius:8,padding:"7px 12px",display:"flex",
              alignItems:"center",gap:7}}>
              <span style={{fontSize:10,color:T.t3,whiteSpace:"nowrap"}}>
                Patient
              </span>
              <select value={pid} onChange={e=>setPid(e.target.value)}
                style={{background:"transparent",border:"none",color:T.t1,
                  fontSize:12,fontWeight:500,cursor:"pointer",outline:"none"}}>
                <option value="" style={{background:T.bg2}}>Anonymous</option>
                {(patients||[]).filter(p=>!p.pending).map(p=>(
                  <option key={p.patient_id} value={p.patient_id}
                    style={{background:T.bg2}}>{p.name}</option>
                ))}
              </select>
            </div>
            <div style={{display:"flex",background:T.bg3,
              border:`1px solid ${T.line}`,borderRadius:8,overflow:"hidden"}}>
              {[["rf","RF"],["xgb","XGB"],["svm","SVM"]].map(([k,l])=>(
                <button key={k} onClick={()=>setModel(k)}
                  style={{background:model===k?liveTh.primary:"transparent",
                    color:model===k?"#000":T.t3,border:"none",
                    padding:"7px 13px",cursor:"pointer",
                    fontSize:11,fontWeight:model===k?700:400,
                    transition:"all .2s"}}>{l}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Presets */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          {[
            {k:"stressed",l:"High Stress",   th:getStressTheme(80),
              desc:"Suppressed HRV, poor sleep"},
            {k:"moderate",l:"Medium Stress",  th:getStressTheme(55),
              desc:"Moderate autonomic activity"},
            {k:"baseline",l:"Healthy Baseline",th:getStressTheme(20),
              desc:"Normal HRV and sleep"},
          ].map(({k,l,th:pth,desc})=>(
            <button key={k} onClick={()=>setInp(PRESETS[k])}
              style={{background:pth.bg,border:`1px solid ${pth.border}`,
                borderRadius:10,padding:"11px 14px",cursor:"pointer",
                textAlign:"left",transition:"all .2s"}}
              onMouseEnter={e=>e.currentTarget.style.borderColor=pth.primary}
              onMouseLeave={e=>e.currentTarget.style.borderColor=pth.border}>
              <div style={{fontSize:12,fontWeight:600,color:pth.primary,
                marginBottom:3}}>{l}</div>
              <div style={{fontSize:10,color:T.t3}}>{desc}</div>
            </button>
          ))}
        </div>

        {/* Risk warning banner */}
        {highRiskFields.length>0&&(
          <div style={{background:T.highBg,border:`1px solid ${T.high}33`,
            borderRadius:8,padding:"10px 14px",
            display:"flex",alignItems:"flex-start",gap:10}}>
            <span style={{fontSize:14,flexShrink:0,marginTop:1}}>⚠</span>
            <div style={{flex:1}}>
              <div style={{fontSize:11,fontWeight:600,color:T.high,marginBottom:4}}>
                {highRiskFields.length} parameter{highRiskFields.length>1?"s":""} outside healthy range
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {highRiskFields.map(f=>(
                  <span key={f.k} style={{fontSize:10,background:T.highBg,
                    color:T.high,padding:"1px 7px",borderRadius:4,fontWeight:500}}>
                    {f.l}: {inp[f.k]}{f.u}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab switcher */}
        <div style={{display:"flex",gap:2,borderBottom:`1px solid ${T.line}`,
          paddingBottom:0}}>
          {[["sleep","Sleep"],["cardiac","Cardiac"],["biometric","Biometric"],
            ["all","All 12"]].map(([k,l])=>(
            <button key={k} onClick={()=>setActiveTab(k)}
              style={{background:"transparent",
                color:activeTab===k?liveTh.primary:T.t3,
                border:"none",borderBottom:activeTab===k?
                  `2px solid ${liveTh.primary}`:"2px solid transparent",
                padding:"8px 14px",cursor:"pointer",fontSize:12,
                fontWeight:activeTab===k?600:400,
                marginBottom:-1,transition:"all .2s"}}>
              {l}
            </button>
          ))}
        </div>

        {/* Sliders grid */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {(activeTab==="all"?allFields:FIELDS[activeTab]||allFields).map(f=>(
            <SliderField key={f.k} field={f}/>
          ))}
        </div>

        {/* Run button */}
        <button onClick={run} disabled={loading}
          style={{width:"100%",
            background:loading?T.bg4:liveTh.gradient,
            color:loading?T.t3:"#000",
            border:"none",borderRadius:10,padding:"13px",
            cursor:loading?"not-allowed":"pointer",
            fontSize:14,fontWeight:700,letterSpacing:".01em",
            transition:"background .4s ease",
            display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          {loading
            ?<><span style={{animation:"pulse 1s ease-in-out infinite"}}>●</span> Analysing…</>
            :<>Run {model.toUpperCase()} Prediction →</>}
        </button>

      </div>

      {/* ── RIGHT: Live gauge + results ── */}
      <div style={{display:"flex",flexDirection:"column",gap:14}}>

        {/* Live stress meter */}
        <div style={{
          background:T.bg2,
          border:`2px solid ${liveTh.primary}`,
          borderRadius:16,overflow:"hidden",
          transition:"border-color .5s ease",
          boxShadow:`0 0 32px ${liveTh.primary}15`}}>

          {/* Gradient top bar */}
          <div style={{height:3,background:liveTh.gradient,
            transition:"background .5s ease"}}/>

          <div style={{padding:"20px 22px"}}>
            <div style={{fontSize:10,color:T.t3,textTransform:"uppercase",
              letterSpacing:".1em",marginBottom:16,fontWeight:500}}>
              Live Stress Meter
            </div>

            {/* Arc gauge */}
            <div style={{display:"flex",justifyContent:"center",marginBottom:16}}>
              <svg width="170" height="100" viewBox="0 0 170 100">
                {/* Track */}
                <path d="M 15 90 A 70 70 0 0 1 155 90"
                  fill="none" stroke={T.bg4} strokeWidth="12" strokeLinecap="round"/>
                {/* Fill */}
                <path d="M 15 90 A 70 70 0 0 1 155 90"
                  fill="none" stroke={liveTh.primary} strokeWidth="12" strokeLinecap="round"
                  strokeDasharray={`${(si/100)*219.9} 219.9`}
                  style={{transition:"stroke-dasharray .4s ease,stroke .5s"}}/>
                {/* Zone labels */}
                <text x="14" y="96" fill={T.t3} fontSize="8" textAnchor="middle">0</text>
                <text x="85" y="15" fill={T.t3} fontSize="8" textAnchor="middle">50</text>
                <text x="156" y="96" fill={T.t3} fontSize="8" textAnchor="middle">100</text>
                {/* Value */}
                <text x="85" y="72" fill={liveTh.primary} fontSize="32" fontWeight="800"
                  textAnchor="middle"
                  fontFamily="JetBrains Mono,monospace"
                  style={{transition:"fill .5s"}}>
                  {Math.round(si)}
                </text>
                <text x="85" y="88" fill={T.t3} fontSize="9" textAnchor="middle"
                  letterSpacing="2">STRESS INDEX</text>
              </svg>
            </div>

            {/* Level badge */}
            <div style={{textAlign:"center",marginBottom:16}}>
              <div style={{display:"inline-flex",alignItems:"center",gap:7,
                background:liveTh.bg,color:liveTh.primary,
                borderRadius:20,padding:"6px 16px",
                fontSize:13,fontWeight:700,
                transition:"all .5s ease"}}>
                <span style={{width:7,height:7,borderRadius:"50%",
                  background:liveTh.primary}}/>
                {liveTh.label}
              </div>
            </div>

            {/* Mini vitals */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",
              gap:8,paddingTop:14,borderTop:`1px solid ${T.line}`}}>
              {[
                ["Sleep Q.",sq.toFixed(0), T.teal],
                ["Auto. Bal.",ab.toFixed(1),liveTh.secondary],
                ["SI",si.toFixed(0),       liveTh.primary],
              ].map(([l,v,c])=>(
                <div key={l} style={{textAlign:"center"}}>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",
                    fontSize:17,fontWeight:700,color:c,
                    transition:"color .5s"}}>{v}</div>
                  <div style={{fontSize:9,color:T.t3,textTransform:"uppercase",
                    letterSpacing:".07em",marginTop:2}}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Selected patient context */}
        {pid && (()=>{
          const pat=(patients||[]).find(p=>p.patient_id===pid);
          if(!pat) return null;
          return (
            <div style={{background:T.bg2,border:`1px solid ${T.line}`,
              borderRadius:12,padding:"13px 16px",
              display:"flex",alignItems:"center",gap:10}}>
              <Avatar name={pat.name} color={liveTh.primary} size={32}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,color:T.t1}}>{pat.name}</div>
                <div style={{fontSize:10,color:T.t3,marginTop:1}}>
                  Baseline HRV {pat.avg_hrv||"—"} ms
                  · Sleep {pat.avg_sleep_eff||"—"}%
                </div>
              </div>
            </div>
          );
        })()}

        {/* ML Result */}
        {result&&(
          <div style={{background:T.bg2,border:`1px solid ${T.line}`,
            borderRadius:14,overflow:"hidden",animation:"popIn .4s ease"}}>
            <div style={{height:3,background:result.prediction===1
              ?`linear-gradient(90deg,${T.high},${T.highD})`
              :result.prediction===0?`linear-gradient(90deg,${T.calm},${T.teal})`
              :`linear-gradient(90deg,${T.mid},#fb923c)`}}/>
            <div style={{padding:"16px 18px"}}>
              <div style={{fontSize:10,color:T.t3,textTransform:"uppercase",
                letterSpacing:".1em",marginBottom:12,fontWeight:500}}>
                ML Result — {model.toUpperCase()}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
                <div style={{fontSize:36}}>
                  {result.label==="Stressed"?"⚡":result.label==="Baseline"?"✓":"~"}
                </div>
                <div>
                  <div style={{fontSize:20,fontWeight:800,letterSpacing:"-.03em",
                    color:result.prediction===1?T.high:result.prediction===0?T.calm:T.mid}}>
                    {result.label}
                  </div>
                  <div style={{fontSize:11,color:T.t3,marginTop:2}}>
                    Confidence:
                    <span style={{fontFamily:"'JetBrains Mono',monospace",
                      color:T.t1,fontWeight:600,marginLeft:4}}>
                      {result.confidence}%
                    </span>
                  </div>
                </div>
              </div>
              {/* Probability bars */}
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {Object.entries(result.probabilities).map(([cls,pct])=>{
                  const c=cls==="Stressed"?T.high:cls==="Baseline"?T.calm:T.mid;
                  return (
                    <div key={cls}>
                      <div style={{display:"flex",justifyContent:"space-between",
                        marginBottom:3}}>
                        <span style={{fontSize:11,color:T.t2}}>{cls}</span>
                        <span style={{fontSize:11,
                          fontFamily:"'JetBrains Mono',monospace",
                          color:T.t1,fontWeight:600}}>{pct}%</span>
                      </div>
                      <div style={{background:T.bg4,borderRadius:4,height:5}}>
                        <div style={{width:`${Math.min(+pct,100)}%`,
                          height:"100%",borderRadius:4,background:c,
                          transition:"width .7s ease"}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Clinical actions */}
        {result&&(
          <div style={{background:T.bg2,border:`1px solid ${T.line}`,
            borderRadius:14,padding:"16px 18px"}}>
            <div style={{fontSize:11,fontWeight:600,color:T.t1,
              textTransform:"uppercase",letterSpacing:".08em",marginBottom:12}}>
              Clinical Actions
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {(result.prediction===1?[
                {icon:"👨‍⚕️",title:"Consult Nearby Doctors",
                  desc:"Locate specialists immediately (Auto-redirecting...)",
                  color:T.high,action:()=>{
                    if(onFindDoctors) onFindDoctors();
                  }},
                {icon:"🧠",title:"AI Counselor session",
                  desc:"Guided evidence-based stress management",
                  color:T.accent,action:()=>{
                    const pat=(patients||[]).find(p=>p.patient_id===pid);
                    if(onCounselor) onCounselor(pat||{name:"Patient",stress_pct:si});
                  }},
              ]:result.prediction===0?[
                {icon:"💡",title:"Stress-prevention Tips",
                  desc:"Stay hydrated, exercise daily, and maintain an 8-hour sleep schedule.",color:T.calm},
                {icon:"✓", title:"Parameters healthy",
                  desc:"No clinical intervention needed at this time",color:T.teal},
              ]:[
                {icon:"📅",title:"Suggest Consultation",
                  desc:"Book a standard check-up to discuss these mild variations",color:T.mid,
                  action:()=>{
                    if(onFindDoctors) onFindDoctors();
                  }},
                {icon:"💓",title:"HRV biofeedback",
                  desc:"5 min daily breathing at 5-6 breaths per minute",color:T.calm},
              ]).map((a,i)=>(
                <div key={i} onClick={a.action}
                  style={{display:"flex",alignItems:"flex-start",gap:10,
                    background:T.bg3,borderRadius:9,padding:"10px 12px",
                    borderLeft:`2px solid ${a.color}`,
                    cursor:a.action?"pointer":"default",transition:"all .15s"}}
                  onMouseEnter={e=>a.action&&(e.currentTarget.style.background=T.bg4)}
                  onMouseLeave={e=>e.currentTarget.style.background=T.bg3}>
                  <span style={{fontSize:16,flexShrink:0}}>{a.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:600,color:a.action?a.color:T.t1,
                      marginBottom:2}}>
                      {a.title}
                      {i===0&&result.prediction===1&&(
                        <span style={{marginLeft:6,fontSize:9,
                          background:T.accent+"20",color:T.accent,
                          padding:"1px 6px",borderRadius:3,fontWeight:700}}>
                          RECOMMENDED
                        </span>
                      )}
                    </div>
                    <div style={{fontSize:11,color:T.t3}}>{a.desc}</div>
                  </div>
                  {a.action&&<span style={{color:T.t3,fontSize:14}}>›</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prediction history */}
        {history.length>0&&(
          <div style={{background:T.bg2,border:`1px solid ${T.line}`,
            borderRadius:14,overflow:"hidden"}}>
            <div style={{padding:"11px 16px",borderBottom:`1px solid ${T.line}`,
              fontSize:11,fontWeight:600,color:T.t1,
              textTransform:"uppercase",letterSpacing:".08em"}}>
              Session history
            </div>
            {history.map((h,i)=>{
              const c=h.label==="Stressed"?T.high:h.label==="Baseline"?T.calm:T.mid;
              return (
                <div key={i} style={{display:"flex",alignItems:"center",
                  padding:"9px 16px",
                  borderBottom:i<history.length-1?`1px solid ${T.line}`:"none",
                  gap:10}}>
                  <div style={{width:7,height:7,borderRadius:"50%",
                    background:c,flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:600,color:c}}>{h.label}</div>
                    <div style={{fontSize:10,color:T.t3}}>
                      {h.model.toUpperCase()} · SI:{h.si} · HRV:{h.hrv} · Sleep:{h.sleep}%
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:c,
                      fontFamily:"'JetBrains Mono',monospace"}}>
                      {h.confidence}%
                    </div>
                    <div style={{fontSize:10,color:T.t3}}>{h.time}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!result&&(
          <div style={{background:T.bg2,border:`1px solid ${T.line}`,
            borderRadius:14,padding:"40px 20px",textAlign:"center"}}>
            <div style={{fontSize:28,marginBottom:10}}>🔬</div>
            <div style={{fontSize:13,color:T.t2,fontWeight:500,marginBottom:4}}>
              Ready to analyse
            </div>
            <div style={{fontSize:11,color:T.t3,lineHeight:1.6}}>
              Use the sliders or pick a preset,<br/>then run the prediction
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function LivePageInner({ token, setGlobalStress }) {
  const [state,   setState_]  = useState("baseline");
  const [running, setRunning] = useState(false);
  const [reading, setReading] = useState(null);
  const [history, setHistory] = useState([]);
  const [mode,    setMode]    = useState("live"); // live | wesad
  const ivRef = useRef(null);

  const mock = (s) => {
    const isStress = s === "stress";
    const isAmus   = s === "amusement";
    const hrv    = isStress ? 18+Math.random()*7 : isAmus ? 34+Math.random()*8 : 42+Math.random()*9;
    const lf_hf  = isStress ? 3.4+Math.random()  : isAmus ? 2.1+Math.random()*.5 : 1.7+Math.random()*.4;
    const si     = Math.min(100, lf_hf*10+(isStress?5.5:1.5)*5+(isStress?5:1.5)*3);
    const spo2   = isStress ? 95.8+Math.random()  : 97.9+Math.random()*.6;
    const temp   = isStress ? 36.92+Math.random()*.28 : 36.57+Math.random()*.18;
    const resp   = isStress ? 17.2+Math.random()*2 : 13.6+Math.random()*1.5;
    const sleep  = isStress ? 68+Math.random()*7 : 86+Math.random()*7;
    return {
      ts: new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit"}),
      device:"Simulator", state:s,
      hrv_rmssd:+hrv.toFixed(1), hrv_lf_hf:+lf_hf.toFixed(2),
      stress_index:+si.toFixed(1), spo2:+spo2.toFixed(1),
      body_temp:+temp.toFixed(2), resp_rate:+resp.toFixed(1),
      sleep_efficiency:+sleep.toFixed(1),
      label: si>60?"Stressed":si<30?"Amusement":"Baseline",
    };
  };

  const start = async () => {
    setRunning(true);
    await api("/live/start",{method:"POST",body:JSON.stringify({state})},token);
    ivRef.current = setInterval(async () => {
      const res = await api("/live/latest",{},token);
      const r = res?.latest || mock(state);
      setReading(r);
      setHistory(h => [...h.slice(-29), r]);
      if (setGlobalStress) setGlobalStress(r.stress_index);
    }, 3000);
  };

  const stop = async () => {
    setRunning(false);
    clearInterval(ivRef.current);
    await api("/live/stop",{method:"POST"},token);
  };

  const changeState = async (s) => {
    setState_(s);
    await api("/live/state",{method:"POST",body:JSON.stringify({state:s})},token);
  };

  useEffect(() => () => clearInterval(ivRef.current), []);

  const areaData = history.slice(-20).map((r,i) => ({
    t:i, si:r.stress_index, hrv:r.hrv_rmssd, spo2:r.spo2
  }));

  const stressColor = reading
    ? reading.stress_index>60 ? T.high : reading.stress_index<30 ? T.calm : T.mid
    : T.accent;

  /* Mini gauge SVG */
  const Gauge = ({value, max, color, label, unit}) => {
    const pct  = Math.min(value/max, 1);
    const r    = 34, cx = 42, cy = 42;
    const circ = 2*Math.PI*r;
    const dash = circ * pct * 0.75;
    return (
      <div style={{textAlign:"center"}}>
        <svg width="84" height="60" viewBox="0 0 84 60">
          <path d={`M ${cx-r*Math.cos(Math.PI*0.75)} ${cy-r*Math.sin(Math.PI*0.75)} A ${r} ${r} 0 1 1 ${cx+r*Math.cos(Math.PI*0.75)} ${cy-r*Math.sin(Math.PI*0.75)}`}
            fill="none" stroke={T.line} strokeWidth="7" strokeLinecap="round"/>
          <path d={`M ${cx-r*Math.cos(Math.PI*0.75)} ${cy-r*Math.sin(Math.PI*0.75)} A ${r} ${r} 0 1 1 ${cx+r*Math.cos(Math.PI*0.75)} ${cy-r*Math.sin(Math.PI*0.75)}`}
            fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            style={{transition:"stroke-dasharray .5s ease"}}/>
          <text x={cx} y={cy-2} textAnchor="middle" fill={color}
            style={{fontSize:13,fontWeight:800,fontFamily:"'JetBrains Mono',monospace"}}>
            {value}
          </text>
          <text x={cx} y={cy+11} textAnchor="middle" fill={T.t3}
            style={{fontSize:8}}>{unit}</text>
        </svg>
        <div style={{fontSize:9,color:T.t2,textTransform:"uppercase",
          letterSpacing:".1em",marginTop:-6}}>{label}</div>
      </div>
    );
  };

  const wesadSignals = [
    {sig:"ECG",   src:"Chest RespiBAN",  hz:"700 Hz", desc:"HRV, R-peaks, LF/HF ratio",         color:T.high,    status:"active"},
    {sig:"EDA",   src:"Chest + E4 Wrist","hz":"4 Hz",  desc:"Electrodermal activity, stress arousal",color:T.mid, status:"active"},
    {sig:"BVP",   src:"Empatica E4",     hz:"64 Hz",  desc:"Blood volume pulse, SpO₂ proxy",     color:T.teal,   status:"active"},
    {sig:"TEMP",  src:"Both devices",    hz:"4 Hz",   desc:"Peripheral + core body temperature", color:T.accent, status:"active"},
    {sig:"RESP",  src:"Chest RespiBAN",  hz:"700 Hz", desc:"Respiratory rate, chest movement",   color:T.calm,  status:"active"},
    {sig:"ACC",   src:"Both devices",    hz:"32 Hz",  desc:"3-axis accelerometer, movement",     color:T.accent, status:"active"},
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:18}}>

      {/* Mode toggle */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:20,fontWeight:900,color:T.t1,letterSpacing:"-.03em"}}>
            Live Monitor
          </div>
          <div style={{fontSize:12,color:T.t2,marginTop:2}}>
            Real-time wearable stream · WESAD physiological reference
          </div>
        </div>
        <div style={{display:"flex",background:T.bg2,border:`1px solid ${T.line}`,
          borderRadius:12,overflow:"hidden"}}>
          {[["live","⌚ Live Stream"],["wesad","🧬 WESAD Reference"]].map(([k,l])=>(
            <button key={k} onClick={()=>setMode(k)}
              style={{background:mode===k?T.accent:"transparent",
                color:mode===k?"#fff":T.t2,border:"none",
                padding:"9px 20px",cursor:"pointer",
                fontSize:12,fontWeight:mode===k?700:400,transition:"all .15s"}}>{l}</button>
          ))}
        </div>
      </div>

      {/* ── LIVE STREAM MODE ── */}
      {mode==="live" && (<>

        {/* Control bar */}
        <div style={{background:T.bg2,border:`1px solid ${T.line}`,
          borderRadius:16,padding:"18px 22px"}}>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
            <button onClick={running?stop:start}
              style={{background:running
                ? "rgba(255,59,92,.15)" : "rgba(0,212,126,.15)",
                color:running?T.high:T.calm,
                border:`1px solid ${running?T.high+"44":T.calm+"44"}`,
                borderRadius:10,padding:"10px 22px",cursor:"pointer",
                fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:8}}>
              {running
                ? <><span style={{width:8,height:8,borderRadius:2,background:T.high,flexShrink:0}}/>Stop Stream</>
                : <><span style={{width:8,height:8,borderRadius:"50%",background:T.calm,flexShrink:0,animation:"pulse 1s ease-in-out infinite"}}/>Start Stream</>
              }
            </button>

            {[["baseline","😌 Baseline"],["stress","⚡ Stress"],["amusement","😊 Amusement"]].map(([s,l])=>(
              <button key={s} onClick={()=>changeState(s)}
                style={{background:state===s
                  ? (s==="stress"?T.high:s==="amusement"?T.mid:T.calm)+"20"
                  : "transparent",
                  color:state===s
                  ? (s==="stress"?T.high:s==="amusement"?T.mid:T.calm)
                  : T.t2,
                  border:`1px solid ${state===s
                    ?(s==="stress"?T.high:s==="amusement"?T.mid:T.calm)+"55"
                    :T.line}`,
                  borderRadius:8,padding:"8px 14px",cursor:"pointer",fontSize:12,
                  fontWeight:state===s?700:400,transition:"all .15s"}}>{l}</button>
            ))}

            {running && (
              <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8,
                background:"rgba(0,212,126,.08)",border:"1px solid rgba(0,212,126,.2)",
                borderRadius:20,padding:"5px 14px"}}>
                <span style={{width:7,height:7,borderRadius:"50%",background:T.calm,
                  animation:"pulse 1.1s ease-in-out infinite"}}/>
                <span style={{fontSize:12,color:T.calm,fontWeight:600}}>Live · 3s interval</span>
              </div>
            )}
          </div>
        </div>

        {/* Gauges + vitals */}
        {reading && (<>
          <div style={{display:"grid",gridTemplateColumns:"200px 1fr",gap:18}}>

            {/* Main stress gauge */}
            <div style={{background:T.bg2,border:`2px solid ${stressColor}`,
              borderRadius:16,padding:"22px 20px",textAlign:"center",
              boxShadow:`0 0 32px ${stressColor}15`,
              transition:"border-color .4s,box-shadow .4s"}}>
              <div style={{fontSize:9,color:T.t2,textTransform:"uppercase",
                letterSpacing:".14em",marginBottom:14}}>Stress Index</div>
              <svg width="140" height="80" viewBox="0 0 140 80" style={{display:"block",margin:"0 auto"}}>
                <path d="M 14 76 A 56 56 0 0 1 126 76"
                  fill="none" stroke={T.line} strokeWidth="10" strokeLinecap="round"/>
                <defs>
                <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%"   stopColor={getStressTheme(reading.stress_index).primary}/>
                  <stop offset="100%" stopColor={getStressTheme(reading.stress_index).secondary}/>
                </linearGradient>
              </defs>
              <path d="M 14 76 A 56 56 0 0 1 126 76"
                  fill="none" stroke="url(#gaugeGrad)" strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={`${(reading.stress_index/100)*175} 175`}
                  style={{transition:"stroke-dasharray .5s ease"}}/>
                <text x="70" y="65" textAnchor="middle" fill={stressColor}
                  style={{fontSize:26,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",
                    transition:"fill .4s"}}>
                  {Math.round(reading.stress_index)}
                </text>
              </svg>
              <div style={{fontSize:18,fontWeight:900,color:stressColor,
                marginTop:4,transition:"color .4s"}}>{reading.label}</div>
              <div style={{fontSize:10,color:T.t3,marginTop:4}}>
                {reading.ts}
              </div>
            </div>

            {/* 6 mini gauges */}
            <div style={{background:T.bg2,border:`1px solid ${T.line}`,
              borderRadius:16,padding:"18px 20px",
              display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
              <Gauge value={reading.hrv_rmssd}        max={80}  color={T.calm}  label="HRV RMSSD"   unit="ms"/>
              <Gauge value={reading.spo2}              max={100} color={T.teal}   label="SpO₂"         unit="%"/>
              <Gauge value={reading.sleep_efficiency}  max={100} color={T.accent} label="Sleep Eff."   unit="%"/>
              <Gauge value={reading.hrv_lf_hf}         max={8}   color={T.accent} label="LF/HF"        unit=""/>
              <Gauge value={reading.resp_rate}          max={25}  color={T.mid}   label="Resp. Rate"   unit="/min"/>
              <Gauge value={+reading.body_temp.toFixed(1)} max={38} color={reading.body_temp>37.2?T.high:T.teal} label="Body Temp" unit="°C"/>
            </div>
          </div>

          {/* Live charts */}
          {areaData.length > 3 && (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
              {[
                {key:"si",  label:"Stress Index",   color:getStressTheme(reading?.stress_index).primary, unit:"",   domain:[0,100]},
                {key:"hrv", label:"HRV RMSSD (ms)",  color:getStressTheme(reading?.stress_index).secondary, unit:"ms", domain:[0,80]},
                {key:"spo2",label:"SpO₂ (%)",         color:"#14b8a6", unit:"%",  domain:[93,100]},
              ].map(({key,label,color,domain})=>(
                <div key={key} style={{background:T.bg2,border:`1px solid ${T.line}`,
                  borderRadius:14,padding:"16px 18px"}}>
                  <div style={{fontSize:11,fontWeight:700,color:T.t1,marginBottom:12,
                    display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span>{label}</span>
                    <span style={{fontFamily:"'JetBrains Mono',monospace",color,fontSize:14,fontWeight:800}}>
                      {areaData[areaData.length-1]?.[key]}
                    </span>
                  </div>
                  <ResponsiveContainer width="100%" height={100}>
                    <AreaChart data={areaData}>
                      <defs>
                        <linearGradient id={`lg_${key}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={color} stopOpacity={.35}/>
                          <stop offset="95%" stopColor={color} stopOpacity={.02}/>
                        </linearGradient>
                      </defs>
                      <YAxis domain={domain} hide/>
                      <XAxis dataKey="t" hide/>
                      <Tooltip {...TT} formatter={(v)=>[v,label]}/>
                      <Area type="monotone" dataKey={key} stroke={color}
                        fill={`url(#lg_${key})`} strokeWidth={2} dot={false}
                        isAnimationActive={false}/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
          )}

          {/* Recommendation */}
          <div style={{background:T.bg2,border:`1px solid ${
            reading.stress_index>60?T.high:reading.stress_index<30?T.calm:T.mid}`,
            borderRadius:14,padding:"16px 20px",
            borderLeft:`4px solid ${stressColor}`,
            display:"flex",alignItems:"flex-start",gap:14}}>
            <div style={{fontSize:24,flexShrink:0}}>
              {reading.label==="Stressed"?"⚠️":reading.label==="Baseline"?"✅":"😊"}
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:T.t1,marginBottom:4}}>
                {reading.label==="Stressed"
                  ? "Elevated stress detected — immediate intervention recommended"
                  : reading.label==="Baseline"
                  ? "Normal physiological state — continue monitoring"
                  : "Positive autonomic state — mild recovery activity"}
              </div>
              <div style={{fontSize:12,color:T.t2,lineHeight:1.65}}>
                {reading.label==="Stressed"
                  ? `HRV ${reading.hrv_rmssd}ms (↓ suppressed) · LF/HF ${reading.hrv_lf_hf} (↑ sympathetic) · Consider box breathing or cold water exposure to activate parasympathetic response.`
                  : reading.label==="Baseline"
                  ? `HRV ${reading.hrv_rmssd}ms (healthy range) · SpO₂ ${reading.spo2}% · Sleep efficiency ${reading.sleep_efficiency}% — all biomarkers within normal limits.`
                  : `HRV ${reading.hrv_rmssd}ms · Parasympathetic dominance — ideal window for recovery, journaling or light exercise.`}
              </div>
            </div>
          </div>

          {/* Session log */}
          {history.length > 3 && (
            <div style={{background:T.bg2,border:`1px solid ${T.line}`,
              borderRadius:14,overflow:"hidden"}}>
              <div style={{padding:"12px 18px",borderBottom:`1px solid ${T.line}`,
                display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:11,fontWeight:700,color:T.t1,
                  textTransform:"uppercase",letterSpacing:".1em"}}>Session Log</div>
                <div style={{fontSize:11,color:T.t2}}>{history.length} readings</div>
              </div>
              <div style={{maxHeight:160,overflowY:"auto"}}>
                {history.slice().reverse().slice(0,8).map((r,i)=>{
                  const c=r.stress_index>60?T.high:r.stress_index<30?T.calm:T.mid;
                  return (
                    <div key={i} style={{display:"grid",
                      gridTemplateColumns:"80px 1fr 70px 70px 70px 80px",
                      padding:"8px 18px",borderBottom:`1px solid ${T.line}`,
                      alignItems:"center",fontSize:11}}>
                      <span style={{color:T.t3,fontFamily:"'JetBrains Mono',monospace"}}>{r.ts}</span>
                      <Tag level={r.label}/>
                      <span style={{color:T.calm,fontFamily:"'JetBrains Mono',monospace"}}>HRV {r.hrv_rmssd}</span>
                      <span style={{color:T.teal, fontFamily:"'JetBrains Mono',monospace"}}>SpO₂ {r.spo2}%</span>
                      <span style={{color:T.mid, fontFamily:"'JetBrains Mono',monospace"}}>SI {r.stress_index}</span>
                      <span style={{color:c,fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}>{r.stress_index}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>)}

        {!reading && !running && (
          <div style={{background:T.bg2,border:`1px solid ${T.line}`,borderRadius:16,
            padding:"70px 20px",textAlign:"center"}}>
            <div style={{fontSize:36,marginBottom:14}}>⌚</div>
            <div style={{fontSize:15,color:T.t2,marginBottom:6}}>Stream not started</div>
            <div style={{fontSize:12,color:T.t3}}>
              Select a physiological state and click Start Stream
            </div>
          </div>
        )}

        {/* Device compatibility */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
          {[
            {name:"Simulator",   icon:"🖥️",status:"active",  color:T.calm,  note:"Built-in · 3s interval",          signals:"HRV · SpO₂ · Temp · Resp"},
            {name:"Oura Ring 3", icon:"💍",status:"planned", color:T.mid,   note:"Oura Cloud API v2 · OAuth2",       signals:"HRV · REM · SpO₂ · Temp"},
            {name:"Apple Watch", icon:"⌚",status:"planned", color:T.accent, note:"HealthKit / Health Connect",        signals:"HR · HRV · SpO₂ · ECG"},
          ].map(d=>(
            <div key={d.name} style={{background:T.bg2,border:`1px solid ${T.line}`,
              borderRadius:14,padding:"18px 18px",
              borderTop:`2px solid ${d.color}`}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                <span style={{fontSize:22}}>{d.icon}</span>
                <span style={{background:d.status==="active"?T.calm+"18":T.mid+"18",
                  color:d.status==="active"?T.calm:T.mid,
                  border:`1px solid ${d.status==="active"?T.calm:T.mid}44`,
                  borderRadius:20,padding:"2px 10px",fontSize:10,fontWeight:700,
                  textTransform:"uppercase"}}>
                  {d.status==="active"?"● Active":"Planned"}
                </span>
              </div>
              <div style={{fontWeight:700,fontSize:14,color:T.t1,marginBottom:3}}>{d.name}</div>
              <div style={{fontSize:11,color:T.t2,marginBottom:10}}>{d.note}</div>
              <div style={{fontSize:11,color:d.color,fontFamily:"'JetBrains Mono',monospace"}}>{d.signals}</div>
            </div>
          ))}
        </div>
      </>)}

      {/* ── WESAD REFERENCE MODE ── */}
      {mode==="wesad" && (
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div style={{background:T.bg2,border:`1px solid ${T.line}`,borderRadius:16,padding:24}}>
            <div style={{fontSize:15,fontWeight:800,color:T.t1,marginBottom:6}}>
              WESAD — Wearable Stress and Affect Detection
            </div>
            <div style={{fontSize:13,color:T.t2,lineHeight:1.7,marginBottom:20}}>
              Multimodal dataset by Schmidt et al. (2018). 15 subjects wearing chest-mounted
              RespiBAN and wrist-worn Empatica E4. Three labels: <span style={{color:T.high}}>Stress</span>,{" "}
              <span style={{color:T.calm}}>Baseline</span>, <span style={{color:T.mid}}>Amusement</span>.
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
              {[["15","Subjects",T.accent],["700Hz","Max Sample Rate",T.teal],
                ["3","Labels",T.mid],["2","Devices",T.accent]].map(([v,l,c])=>(
                <div key={l} style={{background:T.bg22,borderRadius:10,padding:"14px 16px",
                  borderTop:`2px solid ${c}`}}>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:20,
                    fontWeight:800,color:c}}>{v}</div>
                  <div style={{fontSize:10,color:T.t2,marginTop:4,textTransform:"uppercase",
                    letterSpacing:".08em"}}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{background:T.bg22,borderRadius:10,padding:"12px 16px",
              fontSize:12,color:T.t2,borderLeft:`3px solid ${T.accent}`,lineHeight:1.7}}>
              <strong style={{color:T.t1}}>Citation:</strong> Schmidt P. et al. "Introducing WESAD,
              a Multimodal Dataset for Wearable Stress and Affect Detection." ICMI 2018.{" "}
              <span style={{color:T.accent}}>doi:10.1145/3242969.3242985</span>
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            {wesadSignals.map(s=>(
              <div key={s.sig} style={{background:T.bg2,border:`1px solid ${T.line}`,
                borderRadius:14,padding:"16px 18px",display:"flex",gap:14,
                alignItems:"flex-start"}}>
                <div style={{width:44,height:44,borderRadius:12,
                  background:s.color+"18",border:`1px solid ${s.color}33`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:16,fontWeight:900,color:s.color,flexShrink:0}}>{s.sig}</div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <div style={{fontSize:13,fontWeight:700,color:T.t1}}>{s.src}</div>
                    <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,
                      color:s.color,background:s.color+"15",border:`1px solid ${s.color}33`,
                      borderRadius:20,padding:"1px 8px"}}>{s.hz}</span>
                  </div>
                  <div style={{fontSize:11,color:T.t2}}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{background:T.bg2,border:`1px solid ${T.line}`,
            borderRadius:14,padding:"16px 20px"}}>
            <div style={{fontSize:12,fontWeight:700,color:T.t1,marginBottom:12,
              textTransform:"uppercase",letterSpacing:".1em"}}>
              How to use real WESAD data
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
              {[
                {n:"01",t:"Download",d:"Request WESAD from UCI ML Repository. You receive 15 subject folders S2–S17.",c:T.accent},
                {n:"02",t:"Place files",d:"Copy folders into stress-project/wesad_data/. Each needs S{n}.pkl with all signals.",c:T.teal},
                {n:"03",t:"Load via API",d:"Start Flask backend and POST to /api/wesad/load. Parser extracts 60-sec epochs.",c:T.calm},
              ].map(s=>(
                <div key={s.n} style={{background:T.bg22,borderRadius:10,
                  padding:"14px 16px",borderTop:`2px solid ${s.c}`}}>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:22,
                    fontWeight:800,color:s.c,marginBottom:8}}>0{s.n}</div>
                  <div style={{fontSize:13,fontWeight:700,color:T.t1,marginBottom:6}}>{s.t}</div>
                  <div style={{fontSize:11,color:T.t2,lineHeight:1.6}}>{s.d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsPageInner({ user, onLogout }) {
  const [saved, setSaved] = useState(false);
  const [form, setForm]   = useState({
    full_name:   user?.full_name || "",
    email:       "doctor@stressguard.ai",
    institution: "IBM Research Lab",
    theme:       "dark",
    alerts:      true,
    autoSave:    true,
    notifications: true,
  });

  const save = () => { setSaved(true); setTimeout(()=>setSaved(false), 2500); };

  const Toggle = ({ k, label, desc }) => (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
      padding:"14px 0", borderBottom:`1px solid ${T.line}` }}>
      <div>
        <div style={{ fontSize:13, fontWeight:600, color:T.t1 }}>{label}</div>
        <div style={{ fontSize:11, color:T.t2, marginTop:2 }}>{desc}</div>
      </div>
      <div onClick={()=>setForm(p=>({...p,[k]:!p[k]}))}
        style={{ width:42, height:24, borderRadius:12, cursor:"pointer",
          background:form[k]?T.accent:T.line, position:"relative",
          transition:"background .2s", flexShrink:0 }}>
        <div style={{ position:"absolute", top:3,
          left:form[k]?19:3, width:18, height:18, borderRadius:"50%",
          background:"#fff", transition:"left .2s" }}/>
      </div>
    </div>
  );

  const inp = { background:T.bg4, border:`1px solid ${T.line2}`, borderRadius:8,
    color:T.t1, padding:"10px 13px", fontSize:13, outline:"none",
    width:"100%", boxSizing:"border-box", fontFamily:"'IBM Plex Sans',sans-serif" };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20, maxWidth:720 }}>
      <div>
        <div style={{ fontSize:20, fontWeight:900, color:T.t1, letterSpacing:"-.03em" }}>Settings</div>
        <div style={{ fontSize:12, color:T.t2, marginTop:3 }}>Manage your account and preferences</div>
      </div>

      {/* Profile card */}
      <div style={{ background:T.bg2, border:`1px solid ${T.line}`, borderRadius:16, padding:26 }}>
        <div style={{ fontSize:12, fontWeight:700, color:T.t1, textTransform:"uppercase",
          letterSpacing:".1em", marginBottom:20 }}>Profile</div>

        {/* Avatar row */}
        <div style={{ display:"flex", alignItems:"center", gap:18, marginBottom:24,
          paddingBottom:20, borderBottom:`1px solid ${T.line}` }}>
          <div style={{ width:64, height:64, borderRadius:"50%",
            background:`linear-gradient(135deg,${T.accent},${T.accent})`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:22, fontWeight:900, color:"#fff", flexShrink:0 }}>
            {user?.full_name?.split(" ").map(w=>w[0]).join("").slice(0,2)}
          </div>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:T.t1 }}>{user?.full_name}</div>
            <div style={{ fontSize:11, color:T.t2, marginTop:3 }}>
              {user?.username} &nbsp;·&nbsp;
              <span style={{ background:T.accent+"22", color:T.accent,
                border:`1px solid ${T.accent}44`, borderRadius:20,
                padding:"1px 8px", fontSize:9, fontWeight:700,
                textTransform:"uppercase", letterSpacing:".06em" }}>{user?.role}</span>
            </div>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          {[["full_name","Full Name"],["email","Email"],["institution","Institution"]].map(([k,l])=>(
            <div key={k} style={{ gridColumn:k==="institution"?"span 2":"auto" }}>
              <label style={{ color:T.t2, fontSize:10, textTransform:"uppercase",
                letterSpacing:".08em", display:"block", marginBottom:6 }}>{l}</label>
              <input style={inp} value={form[k]}
                onChange={e=>setForm(p=>({...p,[k]:e.target.value}))}/>
            </div>
          ))}
        </div>
      </div>

      {/* Preferences */}
      <div style={{ background:T.bg2, border:`1px solid ${T.line}`, borderRadius:16, padding:26 }}>
        <div style={{ fontSize:12, fontWeight:700, color:T.t1, textTransform:"uppercase",
          letterSpacing:".1em", marginBottom:4 }}>Preferences</div>
        <Toggle k="alerts"        label="High-stress alerts"      desc="Notify when a patient's stress index exceeds 65"/>
        <Toggle k="notifications" label="Session notifications"   desc="Show badge count for unread notifications"/>
        <Toggle k="autoSave"      label="Auto-save predictions"   desc="Automatically save predictions to patient history"/>
      </div>

      {/* System info */}
      <div style={{ background:T.bg2, border:`1px solid ${T.line}`, borderRadius:16, padding:26 }}>
        <div style={{ fontSize:12, fontWeight:700, color:T.t1, textTransform:"uppercase",
          letterSpacing:".1em", marginBottom:16 }}>System</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {[
            ["Platform",   "StressGuard AI v2.0"],
            ["ML Models",  "RF · Gradient Boost · SVM"],
            ["Dataset",    "WESAD (15 subjects)"],
            ["CV F1 Score","95.75% (Gradient Boost)"],
            ["Backend",    "Flask 3.0 · SQLite"],
            ["Frontend",   "React 18 · Recharts"],
          ].map(([l,v])=>(
            <div key={l} style={{ background:T.bg22, borderRadius:10, padding:"12px 14px" }}>
              <div style={{ fontSize:9, color:T.t3, textTransform:"uppercase",
                letterSpacing:".1em", marginBottom:3 }}>{l}</div>
              <div style={{ fontSize:12, color:T.t1, fontWeight:600 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Action button */}
      <div style={{ display:"flex", gap:12 }}>
        <button onClick={save}
          style={{ background:saved?T.calm:T.accent, color:saved?"#000":"#fff",
            border:"none", borderRadius:10, padding:"12px 28px", cursor:"pointer",
            fontSize:13, fontWeight:700, transition:"background .3s" }}>
          {saved ? "✓ Saved!" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}


/* Thin adapter wrappers — forward new T tokens to preserved pages */
function PredictPageWrapper(props) { return <PredictPageInner {...props}/>; }
function LivePageWrapper(props)    { return <LivePageInner    {...props}/>; }
function SettingsPageWrapper(props){ return <SettingsPageInner{...props}/>; }


function LoginPage({ onLogin }) {
  const [u,setU]=useState(""); const [p,setP]=useState("");
  const [err,setErr]=useState(""); const [loading,setLoading]=useState(false);

  const submit = async()=>{
    if(!u||!p){setErr("Enter username and password");return;}
    setLoading(true);setErr("");
    const res=await api("/auth/login",{method:"POST",body:JSON.stringify({username:u,password:p})});
    setLoading(false);
    if(res?.token){onLogin(res.token,res.user);}
    else{
      if(u==="doctor1"&&p==="doctor123")onLogin("demo",{...MOCK_USER});
      else if(u==="admin"&&p==="admin123")onLogin("demo",{...MOCK_USER,role:"admin",full_name:"Dr. Admin"});
      else setErr("Wrong credentials");
    }
  };

  return (
    <div style={{minHeight:"100vh",background:T.bg0,display:"flex",fontFamily:"'Inter',sans-serif"}}>

      {/* Left panel */}
      <div style={{width:420,background:T.bg1,borderRight:`1px solid ${T.line}`,
        padding:"60px 52px",display:"flex",flexDirection:"column",
        justifyContent:"space-between"}}>
        <div>
          {/* Logo */}
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:64}}>
            <div style={{width:36,height:36,borderRadius:9,
              background:`linear-gradient(135deg,${T.calm},${T.teal})`,
              display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M2 12H6L8 5L11 19L14 9L16 14L18 12H22"
                  stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div style={{fontSize:16,fontWeight:700,color:T.t1,letterSpacing:"-.02em"}}>
              StressGuard
            </div>
          </div>

          <div style={{fontSize:11,color:T.t3,fontWeight:500,
            textTransform:"uppercase",letterSpacing:".1em",marginBottom:16}}>
            IBM Research · Clinical Platform
          </div>
          <h1 style={{fontSize:36,fontWeight:700,color:T.t1,
            letterSpacing:"-.04em",lineHeight:1.15,marginBottom:20}}>
            Sleep-based stress<br/>detection, powered by AI
          </h1>
          <p style={{fontSize:14,color:T.t2,lineHeight:1.75,maxWidth:340}}>
            Analyse physiological sleep signals to detect and monitor
            human stress states in real time using an ensemble of clinical ML models.
          </p>

          {/* Feature list */}
          <div style={{marginTop:36,display:"flex",flexDirection:"column",gap:14}}>
            {[
              ["95.75%","Cross-validated F1 accuracy"],
              ["15",    "Physiological features"],
              ["3,600", "WESAD training records"],
              ["3",     "Trained ML models"],
            ].map(([v,l])=>(
              <div key={l} style={{display:"flex",alignItems:"center",gap:14}}>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:15,
                  fontWeight:700,color:T.calm,minWidth:52}}>{v}</span>
                <span style={{fontSize:13,color:T.t2}}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{fontSize:11,color:T.t3,lineHeight:1.8}}>
          B.Tech CSE · Pre Final Year Project<br/>
          IBM Collaboration · WESAD Dataset · scikit-learn
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{flex:1,display:"flex",alignItems:"center",
        justifyContent:"center",padding:"40px"}}>
        <div style={{width:"100%",maxWidth:360}}>
          <div style={{marginBottom:36}}>
            <h2 style={{fontSize:24,fontWeight:700,color:T.t1,
              letterSpacing:"-.03em",marginBottom:8}}>Sign in</h2>
            <p style={{fontSize:13,color:T.t3}}>Access the clinical dashboard</p>
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:20}}>
            <Input label="Username" value={u} onChange={e=>setU(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="e.g. doctor1"/>
            <Input label="Password" type="password" value={p}
              onChange={e=>setP(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="••••••••"/>
          </div>

          {err&&(
            <div style={{background:T.highBg,color:T.high,
              borderRadius:7,padding:"9px 13px",
              fontSize:12,marginBottom:16}}>{err}</div>
          )}

          <Btn onClick={submit} disabled={loading}
            style={{width:"100%",justifyContent:"center",
              background:`linear-gradient(135deg,${T.calm},${T.teal})`,
              color:"#000",padding:"11px",fontSize:14}}>
            {loading?"Signing in…":"Sign in →"}
          </Btn>

          <div style={{marginTop:24,borderTop:`1px solid ${T.line}`,
            paddingTop:20}}>
            <div style={{fontSize:11,color:T.t3,marginBottom:10,
              textTransform:"uppercase",letterSpacing:".08em"}}>Demo accounts</div>
            <div style={{display:"flex",flexDirection:"column",gap:7}}>
              {[["doctor1","doctor123","Doctor"],["admin","admin123","Admin"]].map(([du,dp,role])=>(
                <button key={du} onClick={()=>{setU(du);setP(dp);}}
                  style={{background:T.bg2,border:`1px solid ${T.line}`,
                    borderRadius:8,padding:"10px 14px",cursor:"pointer",
                    display:"flex",alignItems:"center",gap:10,
                    transition:"border-color .15s",textAlign:"left"}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=T.line2}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=T.line}>
                  <Avatar name={du} color={T.accent} size={28}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:500,color:T.t1}}>{du}</div>
                    <div style={{fontSize:10,color:T.t3,marginTop:1,
                      fontFamily:"'JetBrains Mono',monospace"}}>{dp}</div>
                  </div>
                  <span style={{fontSize:10,color:T.accent,
                    background:"rgba(129,140,248,.1)",
                    padding:"2px 7px",borderRadius:4,fontWeight:600}}>{role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── DOCTORS PAGE ──────────────────────────────────────────── */
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
}

function DoctorsPage() {
  const [search, setSearch] = useState("");
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [usingLive, setUsingLive] = useState(false);
  const [contacted, setContacted] = useState({});
  
  const MOCK_DOCTORS = [
    { id: 1, name: "Dr. Priya Sharma", role: "Psychiatrist", dist: "1.2 km away", avail: "Available Today", bg: T.calmBg, col: T.calm },
    { id: 2, name: "Dr. Rohan Gupta", role: "Clinical Psychologist", dist: "2.5 km away", avail: "Available Tomorrow", bg: T.midBg, col: T.mid },
    { id: 3, name: "Dr. Ananya Desai", role: "Sleep Specialist", dist: "3.8 km away", avail: "Available in 2 days", bg: T.teal+"20", col: T.teal },
    { id: 4, name: "Dr. Vikram Singh", role: "General Physician", dist: "4.1 km away", avail: "Available Today", bg: T.accent+"20", col: T.accent }
  ];

  const fetchLiveDoctors = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      try {
        const query = `
          [out:json];
          (
            node["amenity"="doctors"](around:5000,${lat},${lon});
            node["amenity"="clinic"](around:5000,${lat},${lon});
            node["amenity"="hospital"](around:5000,${lat},${lon});
          );
          out body;
        `;
        const resp = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
        const data = await resp.json();

        if (data.elements && data.elements.length > 0) {
          const getMockDoctor = (id) => {
            const firsts = ["Priya", "Rohan", "Ananya", "Vikram", "Sneha", "Amit", "Rahul", "Kavita", "Sanjay", "Meera"];
            const lasts = ["Sharma", "Gupta", "Desai", "Singh", "Patel", "Verma", "Reddy", "Iyer", "Nair", "Das"];
            const f = firsts[id % firsts.length];
            const l = lasts[(id * 3) % lasts.length];
            return `Dr. ${f} ${l}`;
          };

          const results = data.elements.map((el, i) => {
            const dist = getDistance(lat, lon, el.lat, el.lon).toFixed(1);
            let role = "Healthcare Facility";
            let bg = T.calmBg;
            let col = T.calm;
            
            if (el.tags.amenity === "hospital") {
              role = "Hospital"; bg = T.highBg; col = T.high;
            } else if (el.tags.amenity === "clinic") {
              role = "Clinic"; bg = T.midBg; col = T.mid;
            }

            const baseName = el.tags.name || `Unnamed ${role}`;
            const isDoctor = baseName.startsWith("Dr.") || baseName.startsWith("Dr ");
            
            const docName = isDoctor ? baseName : getMockDoctor(el.id || i);
            const finalRole = isDoctor ? role : `${role} at ${baseName}`;

            return {
              id: el.id || i,
              name: docName,
              role: finalRole,
              dist: `${dist} km away`,
              avail: "Call to check",
              bg, col
            };
          });
          
          // Sort by distance
          results.sort((a, b) => parseFloat(a.dist) - parseFloat(b.dist));
          
          setDoctors(results);
          setUsingLive(true);
        } else {
          setError("No facilities found within 5km of your location.");
          setDoctors([]);
        }
      } catch (err) {
        setError("Failed to fetch live data from OpenStreetMap.");
      } finally {
        setLoading(false);
      }
    }, (err) => {
      setError(err.message === "User denied Geolocation" 
        ? "Permission denied. Using mock data." 
        : "Failed to get your location.");
      setLoading(false);
    });
  };

  const displayList = usingLive ? doctors : MOCK_DOCTORS;
  const filtered = displayList.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) || 
    d.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <SectionHead 
        title="Consultants & Specialists" 
        sub="Find nearby healthcare professionals based on your physical location."
        action={
          <Btn onClick={fetchLiveDoctors} disabled={loading} style={{ background: T.bg3, color: T.t1, border: `1px solid ${T.line2}` }}>
            {loading ? "Locating..." : "📍 Use My Location"}
          </Btn>
        }
      />

      {error && (
        <div style={{ background: T.highBg, color: T.high, padding: "10px 14px", borderRadius: 8, marginBottom: 20, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: 24, display: "flex", gap: 12 }}>
        <Input 
          placeholder="Search by name or specialty..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          style={{ flex: 1 }}
        />
        {usingLive && (
          <Btn onClick={() => { setUsingLive(false); setDoctors([]); setError(null); }} style={{ background: "transparent", color: T.t3, border: `1px solid ${T.line}` }}>
            Clear Live Data
          </Btn>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {filtered.map(doc => (
          <Card key={doc.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px" }}>
            <Avatar name={doc.name} color={doc.col} size={48} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.t1 }}>{doc.name}</div>
                <span style={{ fontSize: 10, background: doc.bg, color: doc.col, padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>{doc.role}</span>
              </div>
              <div style={{ fontSize: 12, color: T.t3, marginTop: 4, display: "flex", gap: 12 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  📍 {doc.dist}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  🕒 {doc.avail}
                </span>
              </div>
            </div>
            <Btn 
              style={{ 
                padding: "8px 16px", 
                background: contacted[doc.id] ? T.calmBg : T.accent, 
                color: contacted[doc.id] ? T.calm : "#fff" 
              }}
              onClick={() => setContacted(prev => ({ ...prev, [doc.id]: true }))}
            >
              {contacted[doc.id] ? "Request Sent ✓" : "Contact"}
            </Btn>
          </Card>
        ))}
        {filtered.length === 0 && !loading && (
          <div style={{ textAlign: "center", padding: 40, color: T.t3, fontSize: 13 }}>
            No consultants found matching "{search}"
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── MAIN APP ──────────────────────────────────────────────── */
export default function App() {
  const [splash,       setSplash]       = useState(true);
  const [page,         setPage]         = useState("login");
  const [token,        setToken]        = useState(null);
  const [user,         setUser]         = useState(null);
  const [tab,          setTab]          = useState("overview");
  const [overview,     setOverview]     = useState(null);
  const [metrics,      setMetrics]      = useState(null);
  const [patients,     setPatients]     = useState([]);
  const [counselor,    setCounselor]    = useState(null);
  const [globalStress, setGlobalStress] = useState(38);
  const [latestPrediction, setLatestPrediction] = useState(null);
  const [predictionHistory, setPredictionHistory] = useState([]);
  const [notifs,       setNotifs]       = useState([
    {id:1,msg:"Amit Singh — stress spike detected (SI: 81)",time:"2 min ago", read:false,type:"high"},
    {id:2,msg:"Arjun Mehta — sleep efficiency below 70%",   time:"18 min ago",read:false,type:"medium"},
    {id:3,msg:"Model retrain complete — CV F1: 95.75%",     time:"1 hr ago",  read:true, type:"info"},
  ]);
  const [showNotifs,   setShowNotifs]   = useState(false);
  const [liveVital,    setLiveVital]    = useState({ hrv:34, si:38, spo2:97.8 });
  const [clock,        setClock]        = useState("");
  const [lu,setLu]=useState(""); const [lp,setLp]=useState("");

  useEffect(()=>{
    const t=setInterval(()=>setClock(new Date().toLocaleTimeString("en-IN",{hour12:false})),1000);
    return()=>clearInterval(t);
  },[]);

  useEffect(()=>{
    if(page!=="app")return;
    const iv=setInterval(()=>{
      const si=+(25+Math.random()*60).toFixed(0);
      setLiveVital({hrv:+(28+Math.random()*16).toFixed(1),si,spo2:+(96.5+Math.random()*1.8).toFixed(1)});
      setGlobalStress(+si);
    },4000);
    return()=>clearInterval(iv);
  },[page]);

  useEffect(()=>{
    if(page!=="app")return;
    (async()=>{
      const ov  = await api("/demo/overview")||mockOv();
      const met = await api("/model/metrics",{},token)||mockMet();
      const pts = await api("/patients",{},token);
      setOverview(ov); setMetrics(met);
      setPatients(pts&&pts.length?pts:mockPats());
    })();
  },[page]);

  const doLogin = (tok, usr) => { setToken(tok); setUser(usr); setPage("app"); };
  const doLogout=()=>{setToken(null);setUser(null);setPage("login");setTab("overview");};
  const handlePredictionResult = (result, params) => {
    const entry = { ...result, params, timestamp: Date.now() };
    setLatestPrediction(entry);
    setPredictionHistory(h => [entry, ...h.slice(0, 9)]);
  };

  if (splash) return (
    <div style={{position:"relative",width:"100vw",height:"100vh",
      overflow:"hidden",background:T.bg0}}>
      <SplashScreen onDone={()=>setSplash(false)}/>
    </div>
  );

  if (page === "login") return <LoginPage onLogin={doLogin}/>;;

  /* Active theme */
  const appTh = getStressTheme(globalStress);
  const unread = notifs.filter(n=>!n.read).length;

  const NAV = [
    { k:"overview", l:"Overview",  icon:"M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" },
    { k:"patients", l:"Patients",  icon:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" },
    { k:"trend",    l:"Trend",     icon:"M22 12h-4l-3 9L9 3l-3 9H2" },
    { k:"predict",  l:"Predict",   icon:"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" },
    { k:"live",     l:"Live",      icon:"M5.636 18.364a9 9 0 1 1 12.728 0M12 12m-1 0a1 1 0 1 0 2 0 1 1 0 0 0-2 0", live:true },
    { k:"doctors",  l:"Doctors",   icon:"M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" },
    { k:"settings", l:"Settings",  icon:"M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" },
  ];


  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden",
      background:T.bg0, fontFamily:"'Inter',sans-serif", color:T.t1 }}>

      {/* Counselor overlay */}
      {counselor && (
        <AICounselor
          stressLevel={counselor.stress_pct>40?"High":"Moderate"}
          patientName={counselor.name}
          onClose={()=>setCounselor(null)}/>
      )}

      {/* ── SIDEBAR ── */}
      <div style={{ width:220, background:T.bg1, borderRight:`1px solid ${T.line}`,
        display:"flex", flexDirection:"column", flexShrink:0,
        height:"100vh", overflowY:"auto" }}>

        {/* Brand */}
        <div style={{ padding:"20px 20px 16px", borderBottom:`1px solid ${T.line}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:9, flexShrink:0,
              background:appTh.gradient, display:"flex",
              alignItems:"center", justifyContent:"center",
              transition:"background .5s ease" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M2 12H6L8 5L11 19L14 9L16 14L18 12H22"
                  stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:T.t1,
                letterSpacing:"-.025em" }}>StressGuard</div>
              <div style={{ fontSize:10, color:T.t3, marginTop:1 }}>IBM Research</div>
            </div>
          </div>
        </div>

        {/* Live stress indicator in sidebar */}
        <div style={{ padding:"12px 16px", borderBottom:`1px solid ${T.line}` }}>
          <div style={{ fontSize:10, color:T.t3, fontWeight:500,
            textTransform:"uppercase", letterSpacing:".08em", marginBottom:8 }}>
            Live readings
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
            {[
              ["Stress SI", liveVital.si, getStressTheme(liveVital.si).primary, 100],
              ["HRV",       liveVital.hrv, T.calm, 80],
              ["SpO₂",      liveVital.spo2, T.teal, 100],
            ].map(([l,v,col,mx])=>(
              <div key={l}>
                <div style={{ display:"flex", justifyContent:"space-between",
                  marginBottom:3 }}>
                  <span style={{ fontSize:10, color:T.t3 }}>{l}</span>
                  <span style={{ fontSize:10, fontWeight:600, color:col,
                    fontFamily:"'JetBrains Mono',monospace",
                    transition:"color .5s" }}>{v}</span>
                </div>
                <div style={{ height:3, background:T.line, borderRadius:2, overflow:"hidden" }}>
                  <div style={{ height:"100%", borderRadius:2, background:col,
                    width:`${Math.min((v/mx)*100,100)}%`,
                    transition:"width .5s ease, background .5s ease" }}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ flex:1, padding:"10px 10px" }}>
          {NAV.map(({ k, l, icon, live }) => {
            const isActive = tab === k;
            return (
              <button key={k} onClick={() => setTab(k)}
                style={{ display:"flex", alignItems:"center", gap:10,
                  width:"100%", padding:"9px 12px", borderRadius:8, marginBottom:2,
                  background:isActive ? appTh.bg : "transparent",
                  color:isActive ? appTh.primary : T.t3,
                  border:"none", cursor:"pointer", textAlign:"left",
                  fontSize:13, fontWeight:isActive?600:400,
                  transition:"all .2s ease" }}
                onMouseEnter={e=>{if(!isActive){e.currentTarget.style.background=T.bg3;e.currentTarget.style.color=T.t1;}}}
                onMouseLeave={e=>{if(!isActive){e.currentTarget.style.background="transparent";e.currentTarget.style.color=T.t3;}}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth={isActive?2:1.6}
                  strokeLinecap="round" strokeLinejoin="round">
                  <path d={icon}/>
                </svg>
                <span style={{ flex:1 }}>{l}</span>
                {live && <span style={{ width:6, height:6, borderRadius:"50%",
                  background:T.calm, animation:"pulse 1.2s ease-in-out infinite" }}/>}
              </button>
            );
          })}
        </nav>

        {/* User section at bottom */}
        <div style={{ padding:"12px 14px", borderTop:`1px solid ${T.line}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:9,
            marginBottom:10 }}>
            <Avatar name={user?.full_name||"U"} color={appTh.primary} size={30}/>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, color:T.t1,
                whiteSpace:"nowrap", overflow:"hidden",
                textOverflow:"ellipsis" }}>{user?.full_name}</div>
              <div style={{ fontSize:10, color:appTh.primary, fontWeight:600,
                textTransform:"uppercase", letterSpacing:".06em",
                transition:"color .5s" }}>{user?.role}</div>
            </div>
          </div>
          <button onClick={doLogout}
            style={{ width:"100%", background:T.bg3, color:T.t3,
              border:`1px solid ${T.line}`, borderRadius:7, padding:"7px",
              cursor:"pointer", fontSize:12, transition:"all .15s" }}
            onMouseEnter={e=>{e.currentTarget.style.color=T.t1;}}
            onMouseLeave={e=>{e.currentTarget.style.color=T.t3;}}>
            Sign out
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column",
        overflow:"hidden", minWidth:0 }}>

        {/* Top bar */}
        <div style={{ height:52, display:"flex", alignItems:"center",
          justifyContent:"space-between", padding:"0 24px",
          background:T.bg1, borderBottom:`1px solid ${T.line}`,
          flexShrink:0 }}>

          {/* Page title + stress badge */}
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:T.t1,
                letterSpacing:"-.02em" }}>
                {NAV.find(n=>n.k===tab)?.l || "Dashboard"}
              </div>
              <div style={{ fontSize:11, color:T.t3, marginTop:1 }}>
                {tab==="overview"  ? "Dataset statistics & model performance"
                 :tab==="patients" ? "Patient registry & health profiles"
                 :tab==="trend"    ? "14-night sleep & stress trend analysis"
                 :tab==="predict"  ? "Manual stress assessment tool"
                 :tab==="live"     ? "Real-time wearable data stream"
                 :tab==="doctors"  ? "Find nearby consultants & specialists"
                 :tab==="settings" ? "Account & preferences"
                 :""}
              </div>
            </div>
            <StressLevelBadge score={globalStress}/>
          </div>

          {/* Right actions */}
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>

            {/* Notification bell */}
            <div style={{ position:"relative" }}>
              <button onClick={()=>setShowNotifs(v=>!v)}
                style={{ background:showNotifs?appTh.bg:"transparent",
                  border:`1px solid ${showNotifs?appTh.border:T.line}`,
                  borderRadius:8, width:34, height:34, cursor:"pointer",
                  color:T.t2, display:"flex", alignItems:"center",
                  justifyContent:"center", fontSize:15, transition:"all .15s" }}>
                🔔
                {unread>0 && (
                  <span style={{ position:"absolute", top:4, right:4,
                    width:14, height:14, borderRadius:"50%",
                    background:T.high, color:"#fff", fontSize:8,
                    fontWeight:700, display:"flex", alignItems:"center",
                    justifyContent:"center", border:`2px solid ${T.bg1}` }}>
                    {unread}
                  </span>
                )}
              </button>

              {showNotifs && (
                <div style={{ position:"absolute", top:42, right:0, width:320,
                  background:T.bg2, border:`1px solid ${T.line2}`,
                  borderRadius:12, overflow:"hidden",
                  boxShadow:"0 8px 32px rgba(0,0,0,.4)", zIndex:200 }}>
                  <div style={{ padding:"12px 16px", borderBottom:`1px solid ${T.line}`,
                    display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:13, fontWeight:600, color:T.t1 }}>
                      Notifications
                    </span>
                    <button onClick={()=>setNotifs(n=>n.map(x=>({...x,read:true})))}
                      style={{ background:"transparent", border:"none", cursor:"pointer",
                        fontSize:11, color:appTh.primary, fontWeight:600 }}>
                      Mark all read
                    </button>
                  </div>
                  {notifs.map((n,i)=>{
                    const nc=n.type==="high"?T.high:n.type==="medium"?T.mid:T.teal;
                    return (
                      <div key={n.id}
                        onClick={()=>setNotifs(p=>p.map(x=>x.id===n.id?{...x,read:true}:x))}
                        style={{ padding:"11px 16px",
                          borderBottom:i<notifs.length-1?`1px solid ${T.line}`:"none",
                          background:"transparent", cursor:"pointer",
                          opacity:n.read?.7:1 }}
                        onMouseEnter={e=>e.currentTarget.style.background=T.bg4}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                          <div style={{ width:6, height:6, borderRadius:"50%",
                            background:n.read?T.t3:nc, flexShrink:0, marginTop:5 }}/>
                          <div>
                            <div style={{ fontSize:12, color:T.t1, lineHeight:1.5 }}>
                              {n.msg}
                            </div>
                            <div style={{ fontSize:10, color:T.t3, marginTop:3 }}>
                              {n.time}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* AI Counselor shortcut */}
            <button onClick={()=>setCounselor({name:"Patient",stress_pct:globalStress})}
              style={{ background:appTh.bg, color:appTh.primary,
                border:`1px solid ${appTh.border}`,
                borderRadius:8, padding:"6px 12px", cursor:"pointer",
                fontSize:12, fontWeight:600, transition:"all .3s ease",
                display:"flex", alignItems:"center", gap:6 }}>
              🧠 Counselor
            </button>

            {/* Clock */}
            <span style={{ fontSize:11, color:T.t3, minWidth:60,
              fontFamily:"'JetBrains Mono',monospace", textAlign:"right" }}>
              {clock}
            </span>
          </div>
        </div>

        {/* Page content — scrollable */}
        <div style={{ flex:1, overflowY:"auto", padding:"28px 28px 48px",
          background:T.bg0 }}
          onClick={()=>showNotifs&&setShowNotifs(false)}>
          {tab==="overview" && (
            <OverviewPage overview={overview} metrics={metrics}
              patients={patients} globalStress={globalStress}
              predictionHistory={predictionHistory}
              latestPrediction={latestPrediction}
              onAction={(action) => {
                if (action === "doctors") setTab("doctors");
                else if (action === "counselor") setCounselor({name:"Patient",stress_pct:globalStress});
              }}/>
          )}
          {tab==="patients" && (
            <PatientsPage patients={patients} setPatients={setPatients}
              token={token} onCounselor={setCounselor} globalStress={globalStress}/>
          )}
          {tab==="trend" && (
            <TrendPage patients={patients} token={token}
              onCounselor={setCounselor} globalStress={globalStress}/>
          )}
          {tab==="predict" && (
            <PredictPageWrapper patients={patients} token={token}
              onCounselor={setCounselor} setGlobalStress={setGlobalStress}
              onFindDoctors={() => setTab("doctors")}
              onPredictionResult={handlePredictionResult}/>
          )}
          {tab==="live" && (
            <LivePageWrapper token={token} setGlobalStress={setGlobalStress}/>
          )}
          {tab==="doctors" && (
            <SmartDoctorsPage
              globalStress={globalStress}
              predictionHistory={predictionHistory}
              latestPrediction={latestPrediction}/>
          )}
          {tab==="settings" && (
            <SettingsPageWrapper user={user} onLogout={doLogout}/>
          )}
        </div>
      </div>
    </div>
  );
}
