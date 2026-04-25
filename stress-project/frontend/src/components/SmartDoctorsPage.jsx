import { useState, useEffect, useMemo } from "react";
import {
  DOCTOR_DATABASE, SYMPTOM_OPTIONS, recommendDoctors,
  generateInsights, generateMeetingId, generateSlots
} from "./doctorEngine";

/* ─── Theme tokens (imported inline to avoid circular deps) ─── */
const T = {
  bg0:"#09090f", bg1:"#0f0f18", bg2:"#141420", bg3:"#1a1a28", bg4:"#1f1f30",
  t1:"#f1f0f5", t2:"#a09fb8", t3:"#5e5c78",
  line:"#1f1f30", line2:"#2a2a40",
  calm:"#22c55e", calmBg:"rgba(34,197,94,.08)",
  mid:"#f59e0b", midBg:"rgba(245,158,11,.08)",
  high:"#ef4444", highBg:"rgba(239,68,68,.08)",
  accent:"#818cf8", teal:"#2dd4bf",
};

function getStressTheme(s) {
  if (s <= 40) return { primary:T.calm, bg:T.calmBg, gradient:`linear-gradient(135deg,${T.calm},${T.teal})` };
  if (s <= 70) return { primary:T.mid, bg:T.midBg, gradient:`linear-gradient(135deg,${T.mid},#fb923c)` };
  return { primary:T.high, bg:T.highBg, gradient:`linear-gradient(135deg,${T.high},#dc2626)` };
}

function getDistance(lat1,lon1,lat2,lon2) {
  const R=6371, dLat=(lat2-lat1)*Math.PI/180, dLon=(lon2-lon1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

/* ─── Booking Modal ─── */
function BookingModal({ doctor, onClose, onBook }) {
  const [step, setStep] = useState(1);
  const [slot, setSlot] = useState(null);
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState(null);
  const [dayFilter, setDayFilter] = useState("Today");
  const allSlots = useMemo(() => generateSlots(), []);
  const days = [...new Set(allSlots.map(s => s.day))];
  const filtered = allSlots.filter(s => s.day === dayFilter);

  const confirm = () => {
    const meetId = generateMeetingId(doctor.name);
    const res = { bookingId:`BK-${Date.now().toString(36).toUpperCase()}`, meetingLink:`https://meet.jit.si/${meetId}`, slot, doctor:doctor.name };
    setResult(res);
    if (onBook) onBook(doctor.id, res);
    setStep(3);
  };

  return (
    <div style={{ position:"fixed",inset:0,zIndex:600,background:"rgba(9,9,15,.88)",display:"flex",alignItems:"center",justifyContent:"center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width:480,maxHeight:"85vh",background:T.bg1,borderRadius:18,border:`1px solid ${T.line2}`,overflow:"hidden",
        boxShadow:"0 24px 64px rgba(0,0,0,.6)",animation:"popIn .3s ease",display:"flex",flexDirection:"column" }}>

        {/* Header */}
        <div style={{ padding:"16px 20px",borderBottom:`1px solid ${T.line}`,display:"flex",alignItems:"center",gap:12,background:T.bg2 }}>
          <div style={{ width:38,height:38,borderRadius:"50%",background:`linear-gradient(135deg,${T.accent},#a78bfa)`,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:"#fff",fontWeight:700,flexShrink:0 }}>
            {doctor.name.split(" ").map(w=>w[0]).join("").slice(0,2)}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14,fontWeight:600,color:T.t1 }}>{doctor.name}</div>
            <div style={{ fontSize:11,color:T.t2 }}>{doctor.specialization} · {doctor.qualifications}</div>
          </div>
          <button onClick={onClose} style={{ background:"transparent",border:"none",color:T.t3,cursor:"pointer",fontSize:18 }}>×</button>
        </div>

        {/* Steps indicator */}
        <div style={{ padding:"12px 20px",display:"flex",gap:8,borderBottom:`1px solid ${T.line}` }}>
          {["Select Slot","Confirm","Booked"].map((s,i) => (
            <div key={i} style={{ display:"flex",alignItems:"center",gap:6,flex:1 }}>
              <div style={{ width:22,height:22,borderRadius:"50%",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",
                background:step>i+1?T.calm:step===i+1?T.accent:T.bg4,color:step>i+1?"#000":step===i+1?"#fff":T.t3,transition:"all .3s" }}>
                {step>i+1?"✓":i+1}
              </div>
              <span style={{ fontSize:11,color:step===i+1?T.t1:T.t3,fontWeight:step===i+1?600:400 }}>{s}</span>
            </div>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex:1,overflowY:"auto",padding:"16px 20px" }}>

          {step === 1 && (<>
            <div style={{ display:"flex",gap:6,marginBottom:14 }}>
              {days.map(d => (
                <button key={d} onClick={() => setDayFilter(d)}
                  style={{ padding:"5px 12px",borderRadius:6,fontSize:11,fontWeight:dayFilter===d?600:400,cursor:"pointer",border:"none",
                    background:dayFilter===d?T.accent+"22":T.bg3,color:dayFilter===d?T.accent:T.t3,transition:"all .15s" }}>{d}</button>
              ))}
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6 }}>
              {filtered.map((s,i) => (
                <button key={i} disabled={!s.available}
                  onClick={() => setSlot(s)}
                  style={{ padding:"8px",borderRadius:6,fontSize:12,fontWeight:slot?.time===s.time&&slot?.day===s.day?700:400,
                    cursor:s.available?"pointer":"not-allowed",border:"none",
                    background:slot?.time===s.time&&slot?.day===s.day?T.accent:s.available?T.bg3:T.bg4,
                    color:slot?.time===s.time&&slot?.day===s.day?"#fff":s.available?T.t1:T.t3+"66",
                    opacity:s.available?1:.4,transition:"all .15s" }}>{s.time}</button>
              ))}
            </div>
            {slot && (
              <button onClick={() => setStep(2)}
                style={{ width:"100%",marginTop:16,padding:"11px",borderRadius:8,border:"none",
                  background:`linear-gradient(135deg,${T.accent},#a78bfa)`,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer" }}>
                Continue — {slot.day} at {slot.time} →
              </button>
            )}
          </>)}

          {step === 2 && (<>
            <div style={{ background:T.bg3,borderRadius:10,padding:"14px 16px",marginBottom:14 }}>
              <div style={{ fontSize:11,color:T.t3,marginBottom:4 }}>APPOINTMENT</div>
              <div style={{ fontSize:14,fontWeight:600,color:T.t1 }}>{slot.day} at {slot.time}</div>
              <div style={{ fontSize:12,color:T.t2,marginTop:2 }}>{doctor.name} · {doctor.specialization}</div>
              <div style={{ fontSize:11,color:T.accent,marginTop:4 }}>₹{doctor.fee} consultation fee</div>
            </div>
            <label style={{ fontSize:10,color:T.t3,textTransform:"uppercase",letterSpacing:".08em",display:"block",marginBottom:6 }}>Notes for the doctor</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Describe your symptoms or concerns..."
              style={{ width:"100%",minHeight:80,background:T.bg4,border:`1px solid ${T.line2}`,borderRadius:8,color:T.t1,
                padding:"10px 12px",fontSize:13,outline:"none",resize:"vertical",fontFamily:"'Inter',sans-serif",boxSizing:"border-box" }}/>
            <div style={{ display:"flex",gap:8,marginTop:14 }}>
              <button onClick={() => setStep(1)} style={{ flex:1,padding:"11px",borderRadius:8,border:`1px solid ${T.line}`,background:"transparent",color:T.t2,fontSize:13,cursor:"pointer" }}>← Back</button>
              <button onClick={confirm} style={{ flex:2,padding:"11px",borderRadius:8,border:"none",background:`linear-gradient(135deg,${T.calm},${T.teal})`,color:"#000",fontSize:13,fontWeight:700,cursor:"pointer" }}>Confirm Booking</button>
            </div>
          </>)}

          {step === 3 && result && (<>
            <div style={{ textAlign:"center",padding:"20px 0" }}>
              <div style={{ width:56,height:56,borderRadius:"50%",background:T.calmBg,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",fontSize:28 }}>✓</div>
              <div style={{ fontSize:18,fontWeight:700,color:T.calm,marginBottom:4 }}>Booking Confirmed!</div>
              <div style={{ fontSize:12,color:T.t2 }}>Your consultation has been scheduled</div>
            </div>
            <div style={{ background:T.bg3,borderRadius:10,padding:"14px 16px",marginBottom:12 }}>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
                {[["Booking ID",result.bookingId],["Doctor",result.doctor],["Schedule",`${slot.day}, ${slot.time}`],["Fee",`₹${doctor.fee}`]].map(([l,v]) => (
                  <div key={l}>
                    <div style={{ fontSize:9,color:T.t3,textTransform:"uppercase",letterSpacing:".1em",marginBottom:2 }}>{l}</div>
                    <div style={{ fontSize:12,color:T.t1,fontWeight:600 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
            <a href={result.meetingLink} target="_blank" rel="noreferrer"
              style={{ display:"block",width:"100%",padding:"12px",borderRadius:8,border:"none",textAlign:"center",textDecoration:"none",
                background:`linear-gradient(135deg,${T.accent},#a78bfa)`,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",boxSizing:"border-box" }}>
              🎥 Join Video Consultation
            </a>
            <div style={{ fontSize:10,color:T.t3,textAlign:"center",marginTop:8 }}>Powered by Jitsi Meet — no downloads needed</div>
          </>)}
        </div>
      </div>
    </div>
  );
}

/* ─── Insights Panel ─── */
function InsightsPanel({ insights }) {
  if (!insights || !insights.length) return null;
  const sevColor = { critical:T.high, warning:T.mid, info:T.accent, positive:T.calm };
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ fontSize:12,fontWeight:700,color:T.t1,textTransform:"uppercase",letterSpacing:".1em",marginBottom:10 }}>Smart Insights</div>
      <div style={{ display:"flex",gap:10,overflowX:"auto",paddingBottom:6 }}>
        {insights.map((ins,i) => (
          <div key={i} style={{ minWidth:220,maxWidth:260,background:T.bg2,borderRadius:12,padding:"14px 16px",flexShrink:0,
            borderLeft:`3px solid ${sevColor[ins.severity]||T.accent}`,border:`1px solid ${T.line}`,borderLeftWidth:3,borderLeftColor:sevColor[ins.severity]||T.accent }}>
            <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:6 }}>
              <span style={{ fontSize:16 }}>{ins.icon}</span>
              <span style={{ fontSize:9,fontWeight:600,color:sevColor[ins.severity],background:(sevColor[ins.severity]||T.accent)+"18",
                padding:"1px 7px",borderRadius:4,textTransform:"uppercase",letterSpacing:".06em" }}>{ins.tag}</span>
            </div>
            <div style={{ fontSize:12,fontWeight:600,color:T.t1,marginBottom:4 }}>{ins.title}</div>
            <div style={{ fontSize:11,color:T.t2,lineHeight:1.5 }}>{ins.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Smart Doctors Page ─── */
export default function SmartDoctorsPage({ globalStress=38, predictionHistory=[], latestPrediction=null }) {
  const [symptoms, setSymptoms] = useState([]);
  const [search, setSearch] = useState("");
  const [specFilter, setSpecFilter] = useState("All");
  const [availFilter, setAvailFilter] = useState(false);
  const [sortBy, setSortBy] = useState("match");
  const [bookingDoc, setBookingDoc] = useState(null);
  const [bookings, setBookings] = useState({});
  const [expandedWhy, setExpandedWhy] = useState({});
  const [liveDoctors, setLiveDoctors] = useState([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState(null);
  const [liveActive, setLiveActive] = useState(false);

  const si = latestPrediction ? +(latestPrediction.si||0) : globalStress;
  const th = getStressTheme(si);
  const params = latestPrediction?.params || null;

  const insights = useMemo(() => generateInsights(si, predictionHistory, params), [si, predictionHistory, params]);

  /* ── Fetch real nearby doctors via OpenStreetMap Overpass API ── */
  const fetchNearbyDoctors = () => {
    if (!navigator.geolocation) { setLiveError("Geolocation not supported"); return; }
    setLiveLoading(true); setLiveError(null);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const {latitude:lat, longitude:lon} = pos.coords;
      try {
        const query = `[out:json];(node["amenity"="doctors"](around:5000,${lat},${lon});node["amenity"="clinic"](around:5000,${lat},${lon});node["amenity"="hospital"](around:5000,${lat},${lon}););out body;`;
        const resp = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
        const data = await resp.json();
        if (data.elements && data.elements.length > 0) {
          const SPECS = ["Psychiatrist","Clinical Psychologist","Counselor","General Physician","Sleep Specialist","Wellness Coach"];
          const firsts=["Aarav","Diya","Ishaan","Saanvi","Vivaan","Anaya","Reyansh","Kiara","Aditya","Myra"];
          const lasts=["Sharma","Patel","Singh","Kumar","Gupta","Reddy","Nair","Mehta","Das","Jain"];
          const results = data.elements.map((el, i) => {
            const dist = +getDistance(lat, lon, el.lat, el.lon).toFixed(1);
            let type = el.tags?.amenity === "hospital" ? "Hospital" : el.tags?.amenity === "clinic" ? "Clinic" : "Doctor";
            const placeName = el.tags?.name || `${type} (OSM)`;
            const docName = placeName.startsWith("Dr") ? placeName : `Dr. ${firsts[(el.id||i)%10]} ${lasts[((el.id||i)*3)%10]}`;
            const spec = SPECS[(el.id||i) % SPECS.length];
            const rating = +(4.0 + Math.random()*0.9).toFixed(1);
            const statuses = ["Available Now","Available Today","Busy"];
            const status = statuses[Math.floor(Math.random()*3)];
            return {
              id: `live-${el.id||i}`, name: docName, specialization: spec,
              rating, reviewCount: 50+Math.floor(Math.random()*200), experience: 3+Math.floor(Math.random()*15),
              distance: dist, fee: 400+Math.floor(Math.random()*1200),
              languages:["English","Hindi"], qualifications: type === "Hospital" ? `${placeName}` : `${type} · ${placeName}`,
              availability:{ status, nextSlot: status==="Busy"?"Tomorrow 10:00 AM":status==="Available Today"?"4:00 PM":"", slotsToday: status==="Busy"?0:status==="Available Today"?2:5 },
              isLive: true,
            };
          });
          results.sort((a,b) => a.distance - b.distance);
          setLiveDoctors(results);
          setLiveActive(true);
        } else {
          setLiveError("No facilities found within 5 km.");
        }
      } catch { setLiveError("Failed to fetch from OpenStreetMap."); }
      finally { setLiveLoading(false); }
    }, () => { setLiveError("Location permission denied."); setLiveLoading(false); });
  };

  const clearLive = () => { setLiveDoctors([]); setLiveActive(false); setLiveError(null); };

  const allDoctors = liveActive ? [...liveDoctors, ...DOCTOR_DATABASE] : DOCTOR_DATABASE;

  const ranked = useMemo(() => {
    let docs = recommendDoctors(si, symptoms, allDoctors);
    if (specFilter !== "All") docs = docs.filter(d => d.specialization === specFilter);
    if (availFilter) docs = docs.filter(d => d.availability.status === "Available Now");
    if (search) {
      const q = search.toLowerCase();
      docs = docs.filter(d => d.name.toLowerCase().includes(q) || d.specialization.toLowerCase().includes(q));
    }
    if (sortBy === "rating") docs.sort((a,b) => b.rating - a.rating);
    else if (sortBy === "distance") docs.sort((a,b) => a.distance - b.distance);
    else if (sortBy === "fee") docs.sort((a,b) => a.fee - b.fee);
    return docs;
  }, [si, symptoms, allDoctors, specFilter, availFilter, search, sortBy]);

  const toggleSymptom = s => setSymptoms(p => p.includes(s) ? p.filter(x=>x!==s) : [...p,s]);

  const specs = ["All","Psychiatrist","Clinical Psychologist","Counselor","Sleep Specialist","Wellness Coach","General Physician"];
  const availCol = s => s==="Available Now"?T.calm:s==="Available Today"?T.mid:T.high;

  const handleBook = (docId, res) => setBookings(p => ({...p, [docId]:res}));

  return (
    <div style={{ maxWidth:900,margin:"0 auto" }}>

      {/* Critical alert banner */}
      {si > 65 && (
        <div style={{ background:T.highBg,border:`1px solid ${T.high}33`,borderRadius:10,padding:"12px 16px",marginBottom:16,
          display:"flex",alignItems:"center",gap:10,animation:"popIn .4s ease" }}>
          <span style={{ fontSize:18 }}>⚠</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12,fontWeight:700,color:T.high }}>Elevated stress detected — immediate consultation recommended</div>
            <div style={{ fontSize:11,color:T.t2,marginTop:2 }}>Stress Index: {Math.round(si)} · Doctors sorted by relevance to your condition</div>
          </div>
          <span style={{ fontSize:9,background:T.high,color:"#fff",padding:"3px 8px",borderRadius:4,fontWeight:700,textTransform:"uppercase",letterSpacing:".05em" }}>Urgent</span>
        </div>
      )}

      {/* Insights panel */}
      <InsightsPanel insights={insights}/>

      {/* Live location error */}
      {liveError && (
        <div style={{ background:T.highBg,color:T.high,padding:"10px 14px",borderRadius:8,marginBottom:12,fontSize:12,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <span>{liveError}</span>
          <button onClick={()=>setLiveError(null)} style={{ background:"transparent",border:"none",color:T.high,cursor:"pointer",fontSize:14 }}>×</button>
        </div>
      )}

      {/* Live doctors banner */}
      {liveActive && (
        <div style={{ background:T.calmBg,border:`1px solid ${T.calm}33`,borderRadius:8,padding:"10px 14px",marginBottom:12,
          display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:12 }}>
          <span style={{ color:T.calm,fontWeight:600 }}>📍 Showing {liveDoctors.length} real nearby facilities + {DOCTOR_DATABASE.length} recommended specialists</span>
          <button onClick={clearLive} style={{ background:T.bg3,border:`1px solid ${T.line}`,borderRadius:6,color:T.t3,padding:"4px 10px",fontSize:11,cursor:"pointer" }}>Clear Live</button>
        </div>
      )}

      {/* Header */}
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:16 }}>
        <div>
          <h2 style={{ fontSize:18,fontWeight:700,color:T.t1,letterSpacing:"-.025em",lineHeight:1.2,margin:0 }}>Smart Recommendations</h2>
          <p style={{ fontSize:12,color:T.t2,marginTop:4,margin:"4px 0 0" }}>AI-ranked doctors based on your stress profile · {ranked.length} found</p>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <button onClick={fetchNearbyDoctors} disabled={liveLoading}
            style={{ padding:"7px 14px",borderRadius:8,border:`1px solid ${T.line2}`,fontSize:11,fontWeight:600,cursor:liveLoading?"wait":"pointer",
              background:liveActive?T.calmBg:T.bg3,color:liveActive?T.calm:T.t1,transition:"all .2s" }}>
            {liveLoading?"Locating...":liveActive?"✓ Live":"📍 Find Nearby"}
          </button>
          <span style={{ fontSize:10,color:T.t3 }}>SI:</span>
          <span style={{ fontSize:13,fontWeight:700,color:th.primary,fontFamily:"'JetBrains Mono',monospace" }}>{Math.round(si)}</span>
        </div>
      </div>

      {/* Symptom selector */}
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:10,color:T.t3,textTransform:"uppercase",letterSpacing:".08em",marginBottom:8 }}>Select your symptoms for better matching</div>
        <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
          {SYMPTOM_OPTIONS.map(s => {
            const active = symptoms.includes(s);
            return (
              <button key={s} onClick={() => toggleSymptom(s)}
                style={{ padding:"5px 12px",borderRadius:20,fontSize:11,cursor:"pointer",border:"none",fontWeight:active?600:400,
                  background:active?T.accent+"22":T.bg3,color:active?T.accent:T.t3,transition:"all .15s" }}>{s}</button>
            );
          })}
        </div>
      </div>

      {/* Filters row */}
      <div style={{ display:"flex",gap:8,marginBottom:16,flexWrap:"wrap",alignItems:"center" }}>
        <input placeholder="Search by name or specialty..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex:1,minWidth:180,background:T.bg3,border:`1px solid ${T.line2}`,borderRadius:8,color:T.t1,padding:"8px 12px",fontSize:12,outline:"none",fontFamily:"'Inter',sans-serif" }}/>
        <select value={specFilter} onChange={e => setSpecFilter(e.target.value)}
          style={{ background:T.bg3,border:`1px solid ${T.line}`,borderRadius:8,color:T.t1,padding:"8px 10px",fontSize:11,cursor:"pointer",outline:"none" }}>
          {specs.map(s => <option key={s} value={s} style={{background:T.bg2}}>{s}</option>)}
        </select>
        <button onClick={() => setAvailFilter(!availFilter)}
          style={{ padding:"8px 12px",borderRadius:8,fontSize:11,cursor:"pointer",border:"none",
            background:availFilter?T.calmBg:T.bg3,color:availFilter?T.calm:T.t3,fontWeight:availFilter?600:400 }}>
          {availFilter?"✓ ":""}Available Now
        </button>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          style={{ background:T.bg3,border:`1px solid ${T.line}`,borderRadius:8,color:T.t1,padding:"8px 10px",fontSize:11,cursor:"pointer",outline:"none" }}>
          {[["match","Best Match"],["rating","Top Rated"],["distance","Nearest"],["fee","Lowest Fee"]].map(([v,l]) =>
            <option key={v} value={v} style={{background:T.bg2}}>{l}</option>)}
        </select>
      </div>

      {/* Doctor cards */}
      <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
        {ranked.map((doc, idx) => {
          const booked = bookings[doc.id];
          const isTop = idx < 3 && si > 35;
          const scoreCol = doc.matchScore > 75 ? T.calm : doc.matchScore > 50 ? T.mid : T.t3;
          return (
            <div key={doc.id} style={{ background:T.bg2,border:`1px solid ${isTop?th.primary+"33":T.line}`,borderRadius:14,overflow:"hidden",transition:"all .2s",
              boxShadow:isTop?`0 0 20px ${th.primary}08`:"none" }}>
              {isTop && <div style={{ height:2,background:th.gradient }}/>}
              <div style={{ padding:"16px 20px" }}>
                <div style={{ display:"flex",alignItems:"flex-start",gap:14 }}>
                  {/* Avatar */}
                  <div style={{ width:48,height:48,borderRadius:"50%",background:`linear-gradient(135deg,${T.accent},#a78bfa)`,
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:"#fff",flexShrink:0 }}>
                    {doc.name.split(" ").filter(w=>w!=="Dr.").map(w=>w[0]).join("").slice(0,2)}
                  </div>
                  {/* Info */}
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}>
                      <span style={{ fontSize:14,fontWeight:600,color:T.t1 }}>{doc.name}</span>
                      <span style={{ fontSize:10,background:T.accent+"18",color:T.accent,padding:"2px 8px",borderRadius:4,fontWeight:600 }}>{doc.specialization}</span>
                      {doc.isLive && <span style={{ fontSize:9,background:T.calmBg,color:T.calm,padding:"2px 7px",borderRadius:4,fontWeight:700 }}>📍 NEARBY</span>}
                      {isTop && idx===0 && <span style={{ fontSize:9,background:th.bg,color:th.primary,padding:"2px 7px",borderRadius:4,fontWeight:700 }}>RECOMMENDED</span>}
                      {doc.rating >= 4.8 && <span style={{ fontSize:9,background:T.midBg,color:T.mid,padding:"2px 7px",borderRadius:4,fontWeight:600 }}>TOP RATED</span>}
                    </div>
                    <div style={{ fontSize:11,color:T.t3,marginTop:4 }}>{doc.qualifications} · {doc.experience} yrs exp</div>
                    <div style={{ display:"flex",gap:12,marginTop:6,fontSize:11,color:T.t2 }}>
                      <span>⭐ {doc.rating} ({doc.reviewCount})</span>
                      <span>📍 {doc.distance} km</span>
                      <span style={{ color:availCol(doc.availability.status) }}>● {doc.availability.status}{doc.availability.nextSlot?` · ${doc.availability.nextSlot}`:""}</span>
                      <span>₹{doc.fee}</span>
                    </div>
                  </div>
                  {/* Match score + action */}
                  <div style={{ textAlign:"center",flexShrink:0 }}>
                    <div style={{ fontSize:20,fontWeight:800,color:scoreCol,fontFamily:"'JetBrains Mono',monospace" }}>{doc.matchScore}%</div>
                    <div style={{ fontSize:9,color:T.t3,marginBottom:8 }}>Match</div>
                    {booked ? (
                      <a href={booked.meetingLink} target="_blank" rel="noreferrer"
                        style={{ display:"inline-block",padding:"7px 14px",borderRadius:8,fontSize:11,fontWeight:600,textDecoration:"none",
                          background:T.calmBg,color:T.calm,border:`1px solid ${T.calm}33` }}>🎥 Join Call</a>
                    ) : (
                      <button onClick={() => setBookingDoc(doc)}
                        style={{ padding:"7px 14px",borderRadius:8,border:"none",fontSize:11,fontWeight:600,cursor:"pointer",
                          background:isTop?th.gradient:T.accent,color:isTop?"#000":"#fff",transition:"all .2s" }}>
                        Book Consult
                      </button>
                    )}
                  </div>
                </div>
                {/* Why recommended (expandable) */}
                {doc.whyRecommended && (
                  <div style={{ marginTop:10 }}>
                    <button onClick={() => setExpandedWhy(p => ({...p,[doc.id]:!p[doc.id]}))}
                      style={{ background:"transparent",border:"none",color:T.accent,fontSize:11,cursor:"pointer",padding:0,fontWeight:500 }}>
                      {expandedWhy[doc.id]?"▾":"▸"} Why recommended
                    </button>
                    {expandedWhy[doc.id] && (
                      <div style={{ marginTop:6,padding:"8px 12px",background:T.bg3,borderRadius:8,fontSize:11,color:T.t2,lineHeight:1.6,
                        borderLeft:`2px solid ${T.accent}` }}>
                        {doc.whyRecommended}
                      </div>
                    )}
                  </div>
                )}
                {/* Booked confirmation inline */}
                {booked && (
                  <div style={{ marginTop:10,padding:"8px 12px",background:T.calmBg,borderRadius:8,fontSize:11,color:T.calm,
                    display:"flex",alignItems:"center",gap:8 }}>
                    <span>✓</span>
                    <span>Booked: {booked.slot.day} at {booked.slot.time} · ID: {booked.bookingId}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {ranked.length === 0 && (
          <div style={{ textAlign:"center",padding:40,color:T.t3,fontSize:13 }}>No doctors found matching your criteria</div>
        )}
      </div>

      {/* Booking modal */}
      {bookingDoc && <BookingModal doctor={bookingDoc} onClose={() => setBookingDoc(null)} onBook={handleBook}/>}
    </div>
  );
}
