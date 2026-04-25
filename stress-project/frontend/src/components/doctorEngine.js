/* ─── StressGuard Smart Doctor Recommendation Engine ─── */

export const DOCTOR_DATABASE = [
  { id: 1, name: "Dr. Meera Joshi", specialization: "Psychiatrist", rating: 4.9, reviewCount: 234, experience: 14, distance: 1.2, fee: 1500, languages: ["English", "Hindi"], qualifications: "MD Psychiatry, NIMHANS", availability: { status: "Available Now", nextSlot: "", slotsToday: 4 } },
  { id: 2, name: "Dr. Rajesh Iyer", specialization: "Clinical Psychologist", rating: 4.8, reviewCount: 187, experience: 11, distance: 2.1, fee: 1200, languages: ["English", "Hindi", "Tamil"], qualifications: "PhD Clinical Psychology, RCI", availability: { status: "Available Now", nextSlot: "", slotsToday: 3 } },
  { id: 3, name: "Dr. Ananya Desai", specialization: "Sleep Specialist", rating: 4.7, reviewCount: 156, experience: 9, distance: 3.4, fee: 1800, languages: ["English", "Hindi", "Gujarati"], qualifications: "DM Sleep Medicine, AIIMS", availability: { status: "Available Today", nextSlot: "4:30 PM", slotsToday: 2 } },
  { id: 4, name: "Dr. Kavita Menon", specialization: "Counselor", rating: 4.6, reviewCount: 312, experience: 7, distance: 0.8, fee: 800, languages: ["English", "Hindi", "Malayalam"], qualifications: "MA Counseling Psychology", availability: { status: "Available Now", nextSlot: "", slotsToday: 5 } },
  { id: 5, name: "Dr. Vikram Patel", specialization: "Psychiatrist", rating: 4.8, reviewCount: 198, experience: 16, distance: 4.5, fee: 2000, languages: ["English", "Hindi"], qualifications: "MD Psychiatry, KEM Mumbai", availability: { status: "Busy", nextSlot: "Tomorrow 10:00 AM", slotsToday: 0 } },
  { id: 6, name: "Neha Kapoor", specialization: "Wellness Coach", rating: 4.5, reviewCount: 145, experience: 5, distance: 1.8, fee: 600, languages: ["English", "Hindi"], qualifications: "ICF Certified Coach, Yoga Therapist", availability: { status: "Available Now", nextSlot: "", slotsToday: 6 } },
  { id: 7, name: "Dr. Arjun Reddy", specialization: "Clinical Psychologist", rating: 4.9, reviewCount: 276, experience: 13, distance: 5.2, fee: 1400, languages: ["English", "Hindi", "Telugu"], qualifications: "PhD Psychology, TISS Mumbai", availability: { status: "Available Today", nextSlot: "5:00 PM", slotsToday: 1 } },
  { id: 8, name: "Dr. Sneha Gupta", specialization: "General Physician", rating: 4.4, reviewCount: 423, experience: 12, distance: 128, fee: 500, languages: ["English", "Hindi"], qualifications: "MBBS, MD Internal Medicine", availability: { status: "Available Now", nextSlot: "", slotsToday: 8 } },
  { id: 9, name: "Ritu Sharma", specialization: "Counselor", rating: 4.7, reviewCount: 201, experience: 8, distance: 2.8, fee: 900, languages: ["English", "Hindi", "Punjabi"], qualifications: "MSc Psychology, CBT Certified", availability: { status: "Available Today", nextSlot: "3:00 PM", slotsToday: 2 } },
  { id: 10, name: "Dr. Sanjay Nair", specialization: "Psychiatrist", rating: 4.6, reviewCount: 167, experience: 10, distance: 6.1, fee: 1600, languages: ["English", "Malayalam"], qualifications: "MD Psychiatry, Diploma Psychotherapy", availability: { status: "Busy", nextSlot: "Tomorrow 11:30 AM", slotsToday: 0 } },
  { id: 11, name: "Priya Verma", specialization: "Wellness Coach", rating: 4.8, reviewCount: 189, experience: 6, distance: 3.0, fee: 700, languages: ["English", "Hindi"], qualifications: "Certified Mindfulness Instructor", availability: { status: "Available Now", nextSlot: "", slotsToday: 4 } },
  { id: 12, name: "Dr. Amit Das", specialization: "Sleep Specialist", rating: 4.5, reviewCount: 98, experience: 8, distance: 4.0, fee: 1700, languages: ["English", "Hindi", "Bengali"], qualifications: "MD Pulmonology, Sleep Fellowship", availability: { status: "Available Today", nextSlot: "6:00 PM", slotsToday: 1 } },
  { id: 13, name: "Dr. Pooja Saxena", specialization: "Clinical Psychologist", rating: 4.6, reviewCount: 215, experience: 9, distance: 1.5, fee: 1100, languages: ["English", "Hindi"], qualifications: "MPhil Clinical Psychology, RCI", availability: { status: "Available Now", nextSlot: "", slotsToday: 3 } },
  { id: 14, name: "Dr. Rohit Mehta", specialization: "General Physician", rating: 4.3, reviewCount: 567, experience: 18, distance: 1.0, fee: 400, languages: ["English", "Hindi", "Marathi"], qualifications: "MBBS, DNB Family Medicine", availability: { status: "Available Now", nextSlot: "", slotsToday: 10 } },
  { id: 15, name: "Aisha Khan", specialization: "Counselor", rating: 4.8, reviewCount: 178, experience: 6, distance: 3.5, fee: 850, languages: ["English", "Hindi", "Urdu"], qualifications: "MA Psychology, Art Therapy", availability: { status: "Busy", nextSlot: "Tomorrow 9:00 AM", slotsToday: 0 } },
  { id: 16, name: "Deepak Jha", specialization: "Wellness Coach", rating: 4.4, reviewCount: 112, experience: 4, distance: 2.2, fee: 550, languages: ["English", "Hindi"], qualifications: "NASM Certified, Stress Mgmt", availability: { status: "Available Now", nextSlot: "", slotsToday: 5 } },
];

export const SYMPTOM_OPTIONS = [
  "Insomnia", "Anxiety", "Fatigue", "Mood Swings",
  "Panic Attacks", "Low Motivation", "Headaches", "Chest Tightness"
];

const SPEC_WEIGHTS = {
  high: { "Psychiatrist": 40, "Clinical Psychologist": 35, "Sleep Specialist": 25, "Counselor": 20, "Wellness Coach": 10, "General Physician": 15 },
  medium: { "Counselor": 35, "Clinical Psychologist": 30, "Wellness Coach": 25, "Psychiatrist": 15, "Sleep Specialist": 20, "General Physician": 20 },
  low: { "Wellness Coach": 35, "Counselor": 30, "General Physician": 25, "Clinical Psychologist": 15, "Psychiatrist": 5, "Sleep Specialist": 15 },
};

const SYMPTOM_BONUSES = {
  "Insomnia": { "Sleep Specialist": 15, "Psychiatrist": 5, "Clinical Psychologist": 5 },
  "Anxiety": { "Psychiatrist": 10, "Clinical Psychologist": 10, "Counselor": 5 },
  "Fatigue": { "General Physician": 10, "Sleep Specialist": 8, "Wellness Coach": 5 },
  "Mood Swings": { "Psychiatrist": 10, "Clinical Psychologist": 8 },
  "Panic Attacks": { "Psychiatrist": 15, "Clinical Psychologist": 10 },
  "Low Motivation": { "Wellness Coach": 12, "Counselor": 10, "Clinical Psychologist": 5 },
  "Headaches": { "General Physician": 12, "Sleep Specialist": 5 },
  "Chest Tightness": { "General Physician": 15, "Psychiatrist": 5 },
};

export function recommendDoctors(stressIndex, symptoms, doctors) {
  const si = +stressIndex || 0;
  const level = si > 65 ? "high" : si > 35 ? "medium" : "low";
  const weights = SPEC_WEIGHTS[level];

  return doctors.map(doc => {
    let score = weights[doc.specialization] || 10;
    score += (doc.rating / 5) * 25;
    score += Math.max(0, 20 - doc.distance * 2);
    if (doc.availability.status === "Available Now") score += 15;
    else if (doc.availability.status === "Available Today") score += 8;
    else score += 3;
    symptoms.forEach(s => {
      const b = SYMPTOM_BONUSES[s];
      if (b && b[doc.specialization]) score += b[doc.specialization];
    });

    const reasons = [];
    if (weights[doc.specialization] >= 30) reasons.push(`${doc.specialization} recommended for ${level} stress (SI: ${Math.round(si)})`);
    else if (weights[doc.specialization] >= 20) reasons.push(`${doc.specialization} suitable for ${level} stress`);
    if (doc.rating >= 4.7) reasons.push(`Top-rated (${doc.rating}★)`);
    if (doc.distance <= 2) reasons.push(`Nearby (${doc.distance} km)`);
    if (doc.availability.status === "Available Now") reasons.push("Available immediately");
    symptoms.forEach(s => { if (SYMPTOM_BONUSES[s]?.[doc.specialization] >= 10) reasons.push(`Handles ${s.toLowerCase()}`); });

    return { ...doc, matchScore: Math.min(99, Math.round(score)), whyRecommended: reasons.join(". ") + (reasons.length ? "." : "") };
  }).sort((a, b) => b.matchScore - a.matchScore);
}

export function generateInsights(stressIndex, predHistory, params) {
  const insights = [];
  const si = +stressIndex || 0;

  if (predHistory && predHistory.length >= 4) {
    const recent = predHistory.slice(0, 2), older = predHistory.slice(2, 4);
    const avgR = recent.reduce((s, p) => s + (+p.si || 0), 0) / recent.length;
    const avgO = older.reduce((s, p) => s + (+p.si || 0), 0) / older.length;
    if (avgO > 0) {
      const ch = Math.round(((avgR - avgO) / avgO) * 100);
      if (Math.abs(ch) > 5) insights.push({
        type: "trend", icon: ch > 0 ? "📈" : "📉",
        title: ch > 0 ? `Stress increased by ${ch}%` : `Stress decreased by ${Math.abs(ch)}%`,
        detail: ch > 0 ? "Trending upward across recent assessments. Consider consultation." : "Stress levels are improving. Keep up healthy habits.",
        severity: ch > 15 ? "critical" : ch > 0 ? "warning" : "positive", tag: ch > 0 ? "Trending Up" : "Improving"
      });
    }
  }

  if (params) {
    if (params.sleep_efficiency < 72) insights.push({ type: "cause", icon: "💤", title: "Poor sleep efficiency", detail: `At ${params.sleep_efficiency}% (healthy: >85%). Strongly correlated with stress.`, severity: "warning", tag: "Sleep" });
    if (params.hrv_rmssd < 25) insights.push({ type: "cause", icon: "💓", title: "Low HRV — autonomic stress", detail: `HRV at ${params.hrv_rmssd} ms (healthy: >40 ms). Reduced parasympathetic activity.`, severity: "critical", tag: "Cardiac" });
    if (params.awakenings > 4) insights.push({ type: "cause", icon: "⏰", title: "Excessive awakenings", detail: `${params.awakenings} awakenings (healthy: <2). Fragmented sleep amplifies stress.`, severity: "warning", tag: "Sleep" });
    if (params.waso_minutes > 35) insights.push({ type: "cause", icon: "🌙", title: "High WASO", detail: `${params.waso_minutes} min (healthy: <20 min). Sleep maintenance issues.`, severity: "warning", tag: "Sleep" });
    if (params.skin_conductance > 7) insights.push({ type: "cause", icon: "⚡", title: "Elevated skin conductance", detail: `At ${params.skin_conductance} µS (healthy: <5). Sympathetic arousal.`, severity: "warning", tag: "Biometric" });
  }

  if (si > 65) insights.push({ type: "level", icon: "🔴", title: "High stress zone", detail: "SI > 65. Professional consultation strongly recommended.", severity: "critical", tag: "High Priority" });
  else if (si > 35) insights.push({ type: "level", icon: "🟡", title: "Moderate stress", detail: "Lifestyle modifications can prevent escalation.", severity: "info", tag: "Monitor" });
  else insights.push({ type: "level", icon: "🟢", title: "Healthy stress range", detail: "Markers within normal limits. Maintain healthy habits.", severity: "positive", tag: "Healthy" });

  const hour = new Date().getHours();
  if (hour >= 21 || hour < 5) insights.push({ type: "pattern", icon: "🌃", title: "Late-night assessment", detail: "Night readings often show elevated stress due to daily fatigue.", severity: "info", tag: "Pattern" });

  if (si > 50 && predHistory && predHistory.some(p => +p.si < 35)) {
    const low = predHistory.find(p => +p.si < 35);
    insights.push({ type: "recovery", icon: "🔄", title: "Previous recovery observed", detail: `You reached baseline (SI: ${low.si}) before. Recovery is achievable.`, severity: "positive", tag: "Recovery" });
  }

  return insights;
}

export function generateMeetingId(doctorName) {
  const slug = doctorName.toLowerCase().replace(/[^a-z]/g, '-').replace(/-+/g, '-').slice(0, 15);
  return `sg-${slug}-${Date.now().toString(36)}`;
}

export function generateSlots() {
  const slots = [];
  const now = new Date();
  for (let day = 0; day < 3; day++) {
    const d = new Date(now); d.setDate(d.getDate() + day);
    const dayLabel = day === 0 ? "Today" : day === 1 ? "Tomorrow" : d.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" });
    const startH = day === 0 ? Math.max(9, now.getHours() + 1) : 9;
    for (let h = startH; h < 18; h++) {
      for (let m = 0; m < 60; m += 30) {
        slots.push({ day: dayLabel, time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`, available: Math.random() > 0.3 });
      }
    }
  }
  return slots;
}
