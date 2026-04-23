import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { getDoctors } from "../services/doctorService";
import { useFetch } from "../hooks/useFetch";
import Loader from "../components/Loader";

const GRADIENTS = [
  "linear-gradient(135deg,#00C9A7,#00E5C0)",
  "linear-gradient(135deg,#3B82F6,#60a5fa)",
  "linear-gradient(135deg,#8B5CF6,#a78bfa)",
  "linear-gradient(135deg,#EC4899,#f472b6)",
  "linear-gradient(135deg,#F59E0B,#fbbf24)",
];
function getGrad(name="") { let h=0; for(const c of name) h=(h*31+c.charCodeAt(0))&0xffff; return GRADIENTS[h%GRADIENTS.length]; }

export default function Consultation() {
  const { data, loading } = useFetch(() => getDoctors({ limit: 20 }));
  const [selected, setSelected] = useState(null);
  const [joining, setJoining] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [chatMsgs, setChatMsgs] = useState([
    { from: "doctor", text: "Здравствуйте! Готов к консультации. Чем могу помочь?" }
  ]);

  const doctors = (data?.doctors || []).filter(d => {
    let h=0; for(const c of (d._id||"")) h=(h*31+c.charCodeAt(0))&0xffff;
    return h%3!==0;
  });

  const join = () => {
    setJoining(true);
    setTimeout(() => { setJoining(false); setInCall(true); }, 1800);
  };

  const sendMsg = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatMsgs(prev => [...prev, { from: "me", text: msg }]);
    setChatInput("");
    setTimeout(() => {
      setChatMsgs(prev => [...prev, { from: "doctor", text: "Понял вас. Расскажите подробнее о симптомах — как давно это началось?" }]);
    }, 1200);
  };

  if (inCall && selected) {
    const initials = selected.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
    return (
      <motion.div initial={{opacity:0}} animate={{opacity:1}} style={{ display:"grid", gridTemplateColumns:"1fr 320px", height:"calc(100vh - var(--nav-h))", gap:0 }}>
        {/* Video area */}
        <div style={{ background:"#050d1a", position:"relative", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column" }}>
          {/* Doctor video (simulated) */}
          <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16 }}>
            <div style={{ width:120, height:120, borderRadius:"50%", background:getGrad(selected.name), display:"flex", alignItems:"center", justifyContent:"center", fontSize:40, fontWeight:800, color:"#fff", border:"4px solid rgba(0,201,167,.4)", boxShadow:"0 0 40px rgba(0,201,167,.2)" }}>
              {initials}
            </div>
            <div style={{ color:"rgba(255,255,255,.8)", fontFamily:"var(--font-head)", fontSize:22 }}>{selected.name}</div>
            <div style={{ color:"rgba(255,255,255,.45)", fontSize:14 }}>{selected.specialty}</div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:8 }}>
              <span style={{ width:8, height:8, borderRadius:"50%", background:"#22c55e", animation:"pulse 2s infinite" }}/>
              <span style={{ color:"rgba(255,255,255,.5)", fontSize:13 }}>Онлайн · 00:03:24</span>
            </div>
          </div>
          {/* Self preview */}
          <div style={{ position:"absolute", bottom:100, right:20, width:160, height:100, background:"#1a2a3a", borderRadius:12, border:"2px solid rgba(255,255,255,.15)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            {cam ? <div style={{ color:"rgba(255,255,255,.4)", fontSize:13 }}>📷 Камера</div>
                 : <div style={{ color:"rgba(255,255,255,.3)", fontSize:24 }}>🚫</div>}
          </div>
          {/* Controls */}
          <div style={{ position:"absolute", bottom:24, left:"50%", transform:"translateX(-50%)", display:"flex", gap:14, alignItems:"center" }}>
            {[
              { icon: mic?"🎙️":"🔇", active:mic, label:"Микрофон", action:()=>setMic(m=>!m) },
              { icon: cam?"📷":"📵", active:cam, label:"Камера",   action:()=>setCam(c=>!c) },
            ].map(b=>(
              <button key={b.label} onClick={b.action} title={b.label} style={{
                width:52, height:52, borderRadius:"50%", border:"none", cursor:"pointer",
                background: b.active?"rgba(255,255,255,.15)":"rgba(239,68,68,.3)",
                color:"#fff", fontSize:22, transition:"all .2s",
                backdropFilter:"blur(8px)",
              }}>{b.icon}</button>
            ))}
            <button onClick={()=>{setInCall(false);setSelected(null);}} style={{
              width:60, height:60, borderRadius:"50%", border:"none", cursor:"pointer",
              background:"var(--danger)", color:"#fff", fontSize:22,
              boxShadow:"0 4px 16px rgba(239,68,68,.4)",
            }}>📵</button>
          </div>
        </div>
        {/* Chat panel */}
        <div style={{ background:"var(--surface)", borderLeft:"1px solid var(--border)", display:"flex", flexDirection:"column" }}>
          <div style={{ padding:"16px 18px", borderBottom:"1px solid var(--border)", fontWeight:700, color:"var(--navy)" }}>💬 Чат консультации</div>
          <div style={{ flex:1, overflowY:"auto", padding:"16px", display:"flex", flexDirection:"column", gap:10 }}>
            {chatMsgs.map((m,i) => (
              <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:m.from==="me"?"flex-end":"flex-start" }}>
                <div style={{
                  maxWidth:"85%", padding:"10px 13px", borderRadius:14, fontSize:13.5, lineHeight:1.5,
                  background:m.from==="me"?"var(--teal)":"var(--surface2)",
                  color:m.from==="me"?"#fff":"var(--text)",
                  borderBottomRightRadius:m.from==="me"?4:14,
                  borderBottomLeftRadius:m.from==="me"?14:4,
                  border:m.from==="me"?"none":"1px solid var(--border)",
                }}>{m.text}</div>
              </div>
            ))}
          </div>
          <form onSubmit={sendMsg} style={{ padding:"12px 14px", borderTop:"1px solid var(--border)", display:"flex", gap:8 }}>
            <input placeholder="Напишите сообщение…" value={chatInput} onChange={e=>setChatInput(e.target.value)}
              style={{ flex:1, padding:"9px 14px", border:"1.5px solid var(--border2)", borderRadius:"var(--r-full)", fontSize:13.5, outline:"none", fontFamily:"var(--font-body)", background:"var(--surface2)" }} />
            <button type="submit" className="btn btn-primary btn-sm" style={{ borderRadius:"var(--r-full)", padding:"9px 16px" }}>→</button>
          </form>
        </div>
      </motion.div>
    );
  }

  if (joining) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh", gap:20 }}>
      <div style={{ width:80, height:80, borderRadius:"50%", border:"4px solid var(--teal)", borderTopColor:"transparent", animation:"spin .8s linear infinite" }}/>
      <p style={{ color:"var(--muted)", fontFamily:"var(--font-head)", fontSize:20 }}>Подключаемся к консультации…</p>
    </div>
  );

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}}>
      <div className="page-header">
        <h1>Онлайн-консультация</h1>
        <p>Видеоприём с врачом из любой точки Казахстана</p>
      </div>

      {/* How it works */}
      <div style={{ padding:"0 48px 32px" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:36 }}>
          {[
            { step:"1", icon:"👨‍⚕️", title:"Выберите врача", sub:"Из списка доступных онлайн" },
            { step:"2", icon:"📅", title:"Подтвердите время", sub:"Сразу или запланируйте" },
            { step:"3", icon:"💳", title:"Оплатите", sub:"Онлайн — быстро и безопасно" },
            { step:"4", icon:"🎥", title:"Начните приём", sub:"В браузере, без приложений" },
          ].map(s=>(
            <div key={s.step} style={{ background:"var(--surface)", border:"1.5px solid var(--border2)", borderRadius:"var(--r-xl)", padding:"22px 16px", textAlign:"center", position:"relative" }}>
              <div style={{ position:"absolute", top:-12, left:"50%", transform:"translateX(-50%)", width:24, height:24, borderRadius:"50%", background:"var(--teal)", color:"#fff", fontSize:12, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center" }}>{s.step}</div>
              <div style={{ fontSize:32, marginBottom:10, marginTop:8 }}>{s.icon}</div>
              <div style={{ fontWeight:700, color:"var(--navy)", marginBottom:5, fontSize:14 }}>{s.title}</div>
              <div style={{ fontSize:12, color:"var(--muted)", fontWeight:300 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        <h2 style={{ fontFamily:"var(--font-head)", fontSize:24, color:"var(--navy)", fontWeight:400, marginBottom:20 }}>Врачи онлайн сейчас</h2>
        {loading && <Loader />}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:16 }}>
          {doctors.map(doc => {
            const initials = doc.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
            const isSelected = selected?._id === doc._id;
            return (
              <motion.div key={doc._id}
                whileHover={{ y:-3 }}
                onClick={()=>setSelected(isSelected?null:doc)}
                style={{
                  background:"var(--surface)", cursor:"pointer",
                  border:`2px solid ${isSelected?"var(--teal)":"var(--border2)"}`,
                  borderRadius:"var(--r-xl)", overflow:"hidden", transition:"all .2s",
                  boxShadow: isSelected ? "var(--sh-teal)" : "var(--sh-sm)",
                }}
              >
                <div style={{ padding:"18px 18px 14px", display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ position:"relative", flexShrink:0 }}>
                    <div style={{ width:50, height:50, borderRadius:"50%", background:getGrad(doc.name), display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:800, fontSize:16 }}>{initials}</div>
                    <div style={{ position:"absolute", bottom:1, right:1, width:12, height:12, background:"#22c55e", borderRadius:"50%", border:"2px solid var(--surface)" }}/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:14, color:"var(--navy)", marginBottom:2 }}>{doc.name}</div>
                    <div style={{ fontSize:12, color:"var(--muted)" }}>{doc.specialty}</div>
                    <div style={{ fontSize:11, color:"#22c55e", fontWeight:600, marginTop:3 }}>● Онлайн · готов принять</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:14, fontWeight:800, color:"var(--teal)" }}>${doc.price?(doc.price/100).toFixed(0):"35"}</div>
                    <div style={{ fontSize:10, color:"var(--muted)" }}>за сеанс</div>
                  </div>
                </div>
                <div style={{ padding:"12px 18px", background:"var(--surface2)", borderTop:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <span style={{ fontSize:12, color:"var(--muted)" }}>⭐ {doc.rating?.toFixed(1)||"4.8"} · {doc.experience||5} лет опыта</span>
                  {isSelected && <span style={{ fontSize:12, fontWeight:700, color:"var(--teal)" }}>✓ Выбран</span>}
                </div>
              </motion.div>
            );
          })}
        </div>

        {selected && (
          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}}
            style={{ marginTop:28, background:"linear-gradient(135deg,var(--navy),#1a3a62)", borderRadius:"var(--r-xl)", padding:"28px 32px", display:"flex", alignItems:"center", gap:24 }}>
            <div style={{ flex:1 }}>
              <div style={{ color:"rgba(255,255,255,.5)", fontSize:12, marginBottom:6, textTransform:"uppercase", letterSpacing:".8px", fontWeight:700 }}>Выбранный врач</div>
              <div style={{ fontFamily:"var(--font-head)", fontSize:22, color:"#fff", marginBottom:4 }}>{selected.name}</div>
              <div style={{ color:"rgba(255,255,255,.5)", fontSize:14 }}>{selected.specialty} · ${selected.price?(selected.price/100).toFixed(0):"35"} за сеанс</div>
            </div>
            <button className="btn btn-white btn-lg" onClick={join}>🎥 Начать консультацию</button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
