/* ─── StressGuard Intelligence Engine ───
   Converts raw stress data into human-readable insights,
   predictions, pattern detection, and actionable guidance.
─────────────────────────────────────────── */

/* ── 1. INSIGHT GENERATION ── */
export function generateStressInsights(stressIndex, predictionHistory = [], params = null) {
  const insights = [];
  const si = +stressIndex || 0;

  // ── Trend detection (compare recent vs older readings)
  if (predictionHistory.length >= 3) {
    const recent = predictionHistory.slice(0, 2);
    const older = predictionHistory.slice(2, Math.min(5, predictionHistory.length));
    const avgR = recent.reduce((s, p) => s + (+p.si || 0), 0) / recent.length;
    const avgO = older.reduce((s, p) => s + (+p.si || 0), 0) / older.length;
    if (avgO > 0) {
      const ch = Math.round(((avgR - avgO) / avgO) * 100);
      if (Math.abs(ch) > 5) {
        insights.push({
          type: "trend", icon: ch > 0 ? "📈" : "📉",
          title: ch > 0
            ? `Stress increased by ${ch}% recently`
            : `Stress decreased by ${Math.abs(ch)}% — improving`,
          detail: ch > 0
            ? "Your recent readings show an upward stress trajectory. This sustained elevation may impact sleep quality and cognitive performance."
            : "Your body is recovering. Stress markers are trending downward, indicating effective coping or reduced stressors.",
          severity: ch > 20 ? "critical" : ch > 0 ? "warning" : "positive",
          tag: ch > 0 ? "Trending Up" : "Improving",
          badge: ch > 0 ? "↑ Rising" : "↓ Falling",
        });
      }
    }
  }

  // ── Cause estimation from physiological parameters
  if (params) {
    const causes = [];
    if (params.sleep_efficiency < 72) causes.push({ param: "Low sleep efficiency", val: `${params.sleep_efficiency}%`, norm: ">85%", icon: "💤", impact: "high" });
    if (params.hrv_rmssd < 25) causes.push({ param: "Suppressed HRV", val: `${params.hrv_rmssd} ms`, norm: ">40 ms", icon: "💓", impact: "critical" });
    if (params.awakenings > 4) causes.push({ param: "Frequent awakenings", val: `${params.awakenings}×`, norm: "<2×", icon: "⏰", impact: "high" });
    if (params.waso_minutes > 35) causes.push({ param: "High WASO", val: `${params.waso_minutes} min`, norm: "<20 min", icon: "🌙", impact: "medium" });
    if (params.skin_conductance > 7) causes.push({ param: "Elevated EDA", val: `${params.skin_conductance} µS`, norm: "<5 µS", icon: "⚡", impact: "medium" });
    if (params.hrv_lf_hf > 3.5) causes.push({ param: "Autonomic imbalance", val: `LF/HF ${params.hrv_lf_hf}`, norm: "<2.5", icon: "⚖️", impact: "high" });
    if (params.resp_rate > 16) causes.push({ param: "Elevated breathing rate", val: `${params.resp_rate}/min`, norm: "12-16/min", icon: "💨", impact: "medium" });

    if (causes.length > 0) {
      const topCauses = causes.sort((a, b) => ({ critical: 3, high: 2, medium: 1 }[b.impact] || 0) - ({ critical: 3, high: 2, medium: 1 }[a.impact] || 0));
      const causeText = topCauses.slice(0, 3).map(c => `${c.param} (${c.val}, normal: ${c.norm})`).join("; ");
      insights.push({
        type: "cause", icon: "🔍",
        title: `Possible ${causes.length > 1 ? "causes" : "cause"}: ${topCauses[0].param.toLowerCase()}${causes.length > 1 ? ` + ${causes.length - 1} more` : ""}`,
        detail: `Contributing factors detected: ${causeText}. These parameters are outside healthy ranges and correlate with your elevated stress index.`,
        severity: topCauses[0].impact === "critical" ? "critical" : "warning",
        tag: "Root Cause",
        causes: topCauses,
      });
    }
  }

  // ── Stress level interpretation
  if (si > 65) {
    insights.push({
      type: "level", icon: "🔴",
      title: "Your stress is HIGH — action recommended",
      detail: "Stress index exceeds 65, indicating significant physiological strain. Your autonomic nervous system is in sustained fight-or-flight mode. Professional consultation is strongly advised.",
      severity: "critical", tag: "High Priority", badge: "High Risk",
    });
  } else if (si > 35) {
    insights.push({
      type: "level", icon: "🟡",
      title: "Moderate stress — monitor closely",
      detail: "Your stress markers suggest mild-to-moderate strain. This level is manageable with lifestyle adjustments but should not be ignored. Regular monitoring can prevent escalation.",
      severity: "info", tag: "Monitor", badge: "Moderate",
    });
  } else {
    insights.push({
      type: "level", icon: "🟢",
      title: "Stress within healthy range — keep it up",
      detail: "Your physiological markers are within normal limits. Parasympathetic activity is adequate, and sleep architecture appears intact. Continue maintaining current habits.",
      severity: "positive", tag: "Healthy", badge: "Stable",
    });
  }

  // ── Time-of-day pattern
  const hour = new Date().getHours();
  if (hour >= 21 || hour < 5) {
    insights.push({
      type: "pattern", icon: "🌃",
      title: "Peak stress window: late night",
      detail: "Assessments taken between 9 PM and 5 AM often show elevated readings due to accumulated cortisol, circadian dip in HRV, and pre-sleep rumination. Consider morning re-assessment for comparison.",
      severity: "info", tag: "Time Pattern",
    });
  } else if (hour >= 14 && hour <= 16) {
    insights.push({
      type: "pattern", icon: "☀️",
      title: "Afternoon dip detected",
      detail: "The 2-4 PM window is a natural circadian low point. Cortisol drops and fatigue accumulates. A brief walk or 20-min nap can significantly improve afternoon stress resilience.",
      severity: "info", tag: "Circadian",
    });
  }

  // ── Recovery tracking
  if (si > 50 && predictionHistory.some(p => +p.si < 35)) {
    const low = predictionHistory.find(p => +p.si < 35);
    insights.push({
      type: "recovery", icon: "🔄",
      title: "You've recovered before — you can again",
      detail: `A previous session recorded SI: ${low.si}, showing your body can return to baseline. Recovery is not just possible — your data proves it.`,
      severity: "positive", tag: "Recovery",
    });
  }

  return insights;
}

/* ── 2. STRESS PREDICTION ── */
export function predictNextStress(predictionHistory = [], currentSI = 0) {
  if (predictionHistory.length < 2) {
    return {
      level: currentSI > 65 ? "High" : currentSI > 35 ? "Medium" : "Low",
      confidence: "Low",
      trend: "stable",
      detail: "Insufficient data for prediction. At least 3 assessments needed.",
      icon: "🔮",
    };
  }

  // Use last 5-7 data points for weighted moving average
  const pts = predictionHistory.slice(0, Math.min(7, predictionHistory.length)).map(p => +p.si || 0);

  // Weighted: recent values matter more
  const weights = pts.map((_, i) => Math.max(1, pts.length - i));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const weightedAvg = pts.reduce((s, v, i) => s + v * weights[i], 0) / totalWeight;

  // Trend via simple linear regression
  const n = pts.length;
  const xMean = (n - 1) / 2;
  const yMean = pts.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (pts[i] - yMean);
    den += (i - xMean) ** 2;
  }
  const slope = den !== 0 ? num / den : 0;

  // Predicted next value (extrapolate one step)
  const predicted = Math.max(0, Math.min(100, weightedAvg + slope * -1));
  const level = predicted > 65 ? "High" : predicted > 35 ? "Medium" : "Low";
  const trend = slope < -3 ? "decreasing" : slope > 3 ? "increasing" : "stable";

  // Confidence based on data consistency
  const variance = pts.reduce((s, v) => s + (v - yMean) ** 2, 0) / n;
  const confidence = variance < 100 ? "High" : variance < 300 ? "Medium" : "Low";

  const trendText = {
    increasing: "Stress trend is rising — consider intervention",
    decreasing: "Stress trend is decreasing — keep it up",
    stable: "Stress levels are relatively stable",
  };

  const levelText = {
    High: "⚠️ Tomorrow's stress is likely to be HIGH",
    Medium: "Tomorrow's stress is expected to be MODERATE",
    Low: "✓ Tomorrow's stress is predicted to be LOW",
  };

  return {
    predicted: Math.round(predicted),
    level,
    confidence,
    trend,
    detail: `${levelText[level]}. ${trendText[trend]}.`,
    icon: level === "High" ? "🔴" : level === "Medium" ? "🟡" : "🟢",
    slope: Math.round(slope * 10) / 10,
  };
}

/* ── 3. ACTIONABLE RECOMMENDATIONS ── */
export function getRecommendations(stressIndex, params = null, predictionHistory = []) {
  const si = +stressIndex || 0;
  const recs = [];

  if (si > 65) {
    recs.push({ icon: "👨‍⚕️", title: "Consult a specialist", detail: "Your stress index is critically elevated. Professional guidance can help identify triggers and develop a management plan.", priority: "critical", action: "doctors" });
    recs.push({ icon: "🧘", title: "Immediate grounding exercise", detail: "Try the 5-4-3-2-1 technique: Name 5 things you see, 4 you touch, 3 you hear, 2 you smell, 1 you taste.", priority: "high" });
    if (params?.sleep_efficiency < 75) recs.push({ icon: "🛌", title: "Sleep hygiene protocol", detail: "Your sleep efficiency is low. Avoid screens 1hr before bed, keep room at 18-20°C, and maintain consistent wake times.", priority: "high" });
    recs.push({ icon: "🧠", title: "Talk to AI Counselor", detail: "Our evidence-based AI counselor can guide you through CBT techniques and breathing exercises right now.", priority: "high", action: "counselor" });
  } else if (si > 35) {
    recs.push({ icon: "🫁", title: "Try a breathing exercise", detail: "Box breathing (4-4-4-4) for 5 minutes activates parasympathetic recovery. Best done during your afternoon dip.", priority: "medium" });
    recs.push({ icon: "🚶", title: "Take a 15-minute walk", detail: "Light exercise within 2 hours reduces cortisol by up to 25%. Even a brief walk triggers endorphin release.", priority: "medium" });
    if (params?.awakenings > 3) recs.push({ icon: "☕", title: "Reduce caffeine after 2 PM", detail: `You had ${params.awakenings} awakenings. Caffeine has a 6-hour half-life and disrupts sleep architecture.`, priority: "medium" });
    recs.push({ icon: "📅", title: "Schedule a check-up", detail: "Moderate stress that persists should be discussed with a healthcare provider. Prevention is key.", priority: "low", action: "doctors" });
  } else {
    recs.push({ icon: "✅", title: "Maintain your routine", detail: "Your current habits are working. Consistency is the strongest predictor of sustained low stress.", priority: "positive" });
    recs.push({ icon: "📊", title: "Track weekly patterns", detail: "Even when stress is low, monitoring helps you identify what works so you can maintain it.", priority: "info" });
    recs.push({ icon: "💪", title: "Build stress resilience", detail: "Use this low-stress period to establish exercise routines and mindfulness practices that protect during high-stress periods.", priority: "info" });
  }

  // Dynamic recommendation based on trend
  const prediction = predictNextStress(predictionHistory, si);
  if (prediction.trend === "increasing" && si < 65) {
    recs.unshift({ icon: "⚡", title: "Stress is rising — act now", detail: `Your trend shows increasing stress (slope: ${prediction.slope > 0 ? "+" : ""}${prediction.slope}/session). Early intervention is 3× more effective than reactive measures.`, priority: "warning" });
  }

  return recs;
}

/* ── 4. NATURAL LANGUAGE SUMMARY ── */
export function generateNarrativeSummary(stressIndex, predictionHistory = [], params = null) {
  const si = +stressIndex || 0;
  const prediction = predictNextStress(predictionHistory, si);
  const insights = generateStressInsights(si, predictionHistory, params);

  const levelWord = si > 65 ? "HIGH" : si > 35 ? "MODERATE" : "healthy";
  const emoji = si > 65 ? "⚠️" : si > 35 ? "⚡" : "✓";

  let parts = [`${emoji} Your stress is ${levelWord}`];

  // Add trend info
  const trendInsight = insights.find(i => i.type === "trend");
  if (trendInsight) {
    parts.push(trendInsight.title.replace(/^Stress /i, ""));
  }

  // Add cause info
  const causeInsight = insights.find(i => i.type === "cause");
  if (causeInsight && causeInsight.causes) {
    const topCause = causeInsight.causes[0];
    parts.push(`Likely due to ${topCause.param.toLowerCase()}`);
  }

  // Add time pattern
  const patternInsight = insights.find(i => i.type === "pattern");
  if (patternInsight) {
    parts.push(patternInsight.title);
  }

  // Add prediction
  if (prediction.level === "High" && si < 65) {
    parts.push("Tomorrow's stress predicted HIGH");
  }

  // Add recommendation
  if (si > 65) parts.push("Consider consulting a specialist");
  else if (si > 35) parts.push("Try a breathing exercise");
  else parts.push("Keep up your routine");

  return parts.join(". ") + ".";
}
