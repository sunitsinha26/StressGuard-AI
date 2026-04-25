import { useEffect, useRef, useState } from "react";

/*
  SplashScreen.jsx
  Drop into: frontend/src/components/SplashScreen.jsx

  Usage in App.jsx:
    import SplashScreen from "./components/SplashScreen";

    // In your App state:
    const [showSplash, setShowSplash] = useState(true);

    // Render:
    if (showSplash) return <SplashScreen onDone={() => setShowSplash(false)} />;
*/

const ACCENT  = "#0f62fe";
const TEAL    = "#08bdba";
const GOLD    = "#f1c21b";
const RED     = "#fa4d56";
const BG      = "#0a0e1a";
const SURFACE = "#111827";
const BORDER  = "#1e2d45";
const TEXT    = "#e2e8f0";
const SUB     = "#94a3b8";
const MUTED   = "#6b7a99";

const LOAD_STEPS = [
  "Loading WESAD dataset…",
  "Initialising Random Forest…",
  "Initialising Gradient Boosting…",
  "Connecting Flask API…",
  "Launching dashboard…",
];

function useCountUp(target, duration, delay, suffix = "") {
  const [value, setValue] = useState("0" + suffix);
  useEffect(() => {
    const t = setTimeout(() => {
      let start = null;
      const step = (ts) => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / duration, 1);
        setValue(Math.floor(p * target) + suffix);
        if (p < 1) requestAnimationFrame(step);
        else setValue(target + suffix);
      };
      requestAnimationFrame(step);
    }, delay);
    return () => clearTimeout(t);
  }, []);
  return value;
}

export default function SplashScreen({ onDone }) {
  const canvasRef   = useRef(null);
  const [step, setStep]       = useState(0);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase]     = useState(0); // 0=in 1=hold 2=out
  const [opacity, setOpacity] = useState(0);

  const acc = useCountUp(95, 1400, 900, "%");
  const feat = useCountUp(15, 1200, 1000, "");
  const models = useCountUp(3, 800, 1100, "");
  const records = useCountUp(3, 1000, 1200, "K");

  // Fade in
  useEffect(() => {
    requestAnimationFrame(() => setOpacity(1));
  }, []);

  // Grid canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const gap = 38;
      ctx.lineWidth = 0.4;
      ctx.strokeStyle = ACCENT;
      for (let x = 0; x < canvas.width; x += gap) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gap) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }
      ctx.lineWidth = 0.9;
      for (let x = 0; x < canvas.width; x += gap * 5) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gap * 5) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }
    };
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, []);

  // Progress bar + steps
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        const next = p + 100 / (LOAD_STEPS.length * 8);
        if (next >= 100) { clearInterval(interval); return 100; }
        return next;
      });
    }, 60);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setStep(Math.min(Math.floor(progress / 20), LOAD_STEPS.length - 1));
  }, [progress]);

  // Auto-dismiss after ~3.2s
  useEffect(() => {
    const t = setTimeout(() => {
      setOpacity(0);
      setTimeout(onDone, 500);
    }, 3200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: BG,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        overflow: "hidden",
        opacity, transition: "opacity 0.5s ease",
        fontFamily: "'IBM Plex Sans','Segoe UI',sans-serif",
      }}
    >
      {/* Grid background */}
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.15 }}
      />

      {/* Orbiting dots */}
      <OrbitalDots />

      {/* Logo */}
      <div style={{ position: "relative", zIndex: 2, animation: "sgScaleIn 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.1s both" }}>
        <LogoSVG />
      </div>

      {/* Title */}
      <div style={{
        color: TEXT, fontSize: 34, fontWeight: 800, letterSpacing: "-0.03em",
        zIndex: 2, marginTop: 22,
        animation: "sgFadeUp 0.5s ease 0.5s both",
      }}>
        StressGuard <span style={{ color: ACCENT }}>AI</span>
      </div>

      {/* Subtitle */}
      <div style={{
        color: SUB, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase",
        zIndex: 2, marginTop: 6,
        animation: "sgFadeUp 0.5s ease 0.65s both",
      }}>
        Sleep-Based Stress Detection &nbsp;·&nbsp; IBM Project
      </div>

      {/* ECG line */}
      <div style={{ zIndex: 2, marginTop: 18, animation: "sgFadeUp 0.5s ease 0.75s both" }}>
        <EcgLine />
      </div>

      {/* Stats */}
      <div style={{
        display: "flex", gap: 32, marginTop: 24, zIndex: 2,
        animation: "sgFadeUp 0.5s ease 0.85s both",
      }}>
        {[
          { val: acc,     label: "Accuracy"  },
          { val: feat,    label: "Features"  },
          { val: models,  label: "Models"    },
          { val: records, label: "Records"   },
        ].map(({ val, label }) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 22, fontWeight: 700, color: ACCENT }}>{val}</div>
            <div style={{ fontSize: 10, color: MUTED, marginTop: 2, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div style={{
        width: 280, marginTop: 28, zIndex: 2,
        animation: "sgFadeUp 0.5s ease 1s both",
      }}>
        <div style={{ background: BORDER, borderRadius: 4, height: 4, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 4, background: ACCENT,
            width: `${progress}%`, transition: "width 0.06s linear",
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 7 }}>
          <span style={{ fontSize: 11, color: MUTED }}>{LOAD_STEPS[step]}</span>
          <span style={{ fontSize: 11, color: ACCENT, fontFamily: "'IBM Plex Mono',monospace" }}>
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      <SplashKeyframes />
    </div>
  );
}

// ── Animated logo SVG ──────────────────────────────────────────
function LogoSVG() {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96">
      <style>{`
        @keyframes sgPulseRing {
          0%,100% { opacity:0.7; r:40; }
          50%      { opacity:1;   r:42; }
        }
        @keyframes sgHeartbeat {
          0%,100%  { transform:scale(1);    transform-origin:48px 48px; }
          14%       { transform:scale(1.12); transform-origin:48px 48px; }
          28%       { transform:scale(1);    transform-origin:48px 48px; }
        }
        @keyframes sgSpinRing {
          to { stroke-dashoffset: -502; }
        }
        .sg-hb { animation: sgHeartbeat 1.4s ease-in-out infinite; }
        .sg-pr { animation: sgPulseRing 2s ease-in-out infinite; }
        .sg-sr { animation: sgSpinRing 2.4s linear infinite; }
      `}</style>

      {/* Outer glow ring */}
      <circle cx="48" cy="48" r="44" fill="none" stroke={ACCENT} strokeWidth="0.6" opacity="0.25"/>

      {/* Spinning dashed ring */}
      <circle cx="48" cy="48" r="40" fill="none" stroke={ACCENT} strokeWidth="1.2"
        strokeDasharray="20 8" className="sg-sr" strokeLinecap="round"/>

      {/* Solid inner ring pulsing */}
      <circle cx="48" cy="48" r="32" fill={ACCENT + "14"} stroke={ACCENT} strokeWidth="1"
        className="sg-pr"/>

      {/* ECG heartbeat path */}
      <g className="sg-hb">
        <path
          d="M14 48 L28 48 L33 33 L38 63 L43 40 L47 55 L52 48 L82 48"
          fill="none" stroke={ACCENT} strokeWidth="2.8"
          strokeLinecap="round" strokeLinejoin="round"
        />
      </g>

      {/* Center dot */}
      <circle cx="48" cy="48" r="4" fill={ACCENT} className="sg-pr"/>
    </svg>
  );
}

// ── Animated ECG strip ────────────────────────────────────────
function EcgLine() {
  return (
    <svg width="260" height="40" viewBox="0 0 260 40">
      <style>{`
        @keyframes sgEcgDraw {
          from { stroke-dashoffset: 320; }
          to   { stroke-dashoffset: 0;   }
        }
        @keyframes sgDotMove {
          from { offset-distance: 0%;   }
          to   { offset-distance: 100%; }
        }
        .sg-ecg { animation: sgEcgDraw 1.4s ease 0.6s forwards; }
      `}</style>
      <polyline
        className="sg-ecg"
        points="0,20 40,20 50,20 57,5 64,35 70,12 76,28 83,20 260,20"
        fill="none" stroke={ACCENT} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray="320" strokeDashoffset="320"
      />
      {/* Blinking end dot */}
      <circle cx="255" cy="20" r="3" fill={RED}
        style={{ animation: "sgPulseRing 1s ease-in-out 1.8s infinite" }}/>
    </svg>
  );
}

// ── Orbiting dots ─────────────────────────────────────────────
function OrbitalDots() {
  return (
    <div style={{
      position: "absolute", width: 220, height: 220,
      top: "50%", left: "50%", transform: "translate(-50%,-50%)",
      zIndex: 1,
    }}>
      <style>{`
        @keyframes sgOrbitA { from{transform:rotate(0deg) translateX(72px) rotate(0deg)} to{transform:rotate(360deg) translateX(72px) rotate(-360deg)} }
        @keyframes sgOrbitB { from{transform:rotate(120deg) translateX(52px) rotate(-120deg)} to{transform:rotate(480deg) translateX(52px) rotate(-480deg)} }
        @keyframes sgOrbitC { from{transform:rotate(240deg) translateX(88px) rotate(-240deg)} to{transform:rotate(600deg) translateX(88px) rotate(-600deg)} }
      `}</style>
      {[
        { color: ACCENT, anim: "sgOrbitA 3.2s linear infinite",  size: 7 },
        { color: TEAL,   anim: "sgOrbitB 4.1s linear infinite",  size: 5 },
        { color: GOLD,   anim: "sgOrbitC 2.7s linear infinite",  size: 6 },
      ].map(({ color, anim, size }, i) => (
        <div key={i} style={{
          position: "absolute", top: "50%", left: "50%",
          width: size, height: size, marginTop: -size/2, marginLeft: -size/2,
          borderRadius: "50%", background: color,
          animation: anim,
        }}/>
      ))}
    </div>
  );
}

// ── Keyframes injected once ───────────────────────────────────
function SplashKeyframes() {
  return (
    <style>{`
      @keyframes sgFadeUp {
        from { opacity:0; transform:translateY(24px); }
        to   { opacity:1; transform:translateY(0);    }
      }
      @keyframes sgScaleIn {
        from { opacity:0; transform:scale(0.4); }
        to   { opacity:1; transform:scale(1);   }
      }
    `}</style>
  );
}
