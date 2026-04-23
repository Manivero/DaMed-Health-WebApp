import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useFavorites } from "../context/FavoritesContext";

const GRADIENTS = [
  "linear-gradient(135deg,#00C9A7,#00E5C0)",
  "linear-gradient(135deg,#3B82F6,#60a5fa)",
  "linear-gradient(135deg,#8B5CF6,#a78bfa)",
  "linear-gradient(135deg,#EC4899,#f472b6)",
  "linear-gradient(135deg,#F59E0B,#fbbf24)",
];
function getGrad(name="") { let h=0; for(const c of name) h=(h*31+c.charCodeAt(0))&0xffff; return GRADIENTS[h%GRADIENTS.length]; }
function isOnline(id="")  { return id.charCodeAt(id.length-1)%3!==0; }

export default function DoctorCard({ doctor }) {
  const { isFav, toggle } = useFavorites();
  const fav      = isFav(doctor._id);
  const initials = (doctor.name||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  const online   = isOnline(doctor._id||"");
  const rating   = doctor.rating||0;
  const filled   = Math.round(rating);

  return (
    <div className="doc-card" style={{ height:"100%", position:"relative" }}>
      {/* Favorite button */}
      <motion.button
        whileTap={{ scale:0.85 }}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(doctor._id); }}
        style={{
          position:"absolute", top:12, right:12, zIndex:10,
          background:fav?"rgba(239,68,68,.12)":"rgba(255,255,255,.9)",
          border:`1.5px solid ${fav?"rgba(239,68,68,.3)":"var(--border2)"}`,
          borderRadius:"50%", width:32, height:32,
          display:"flex", alignItems:"center", justifyContent:"center",
          cursor:"pointer", fontSize:16, backdropFilter:"blur(8px)",
          transition:"all .2s",
        }}
        title={fav?"Убрать из избранного":"Добавить в избранное"}
      >
        {fav ? "❤️" : "🤍"}
      </motion.button>

      <div className="dc-top">
        <div style={{ position:"relative", flexShrink:0 }}>
          <div className="dc-av" style={{ background:getGrad(doctor.name) }}>
            {doctor.photo
              ? <img src={doctor.photo} alt={doctor.name} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}}/>
              : initials}
          </div>
          {online && (
            <div style={{ position:"absolute",bottom:1,right:1,width:11,height:11,background:"#22c55e",borderRadius:"50%",border:"2px solid var(--surface)" }}/>
          )}
        </div>
        <div style={{ flex:1,minWidth:0 }}>
          <div className="dc-name">{doctor.name}</div>
          <div className="dc-spec">{doctor.specialty}</div>
        </div>
        {doctor.experience > 0 && <div className="dc-badge">{doctor.experience} лет</div>}
      </div>

      <div className="dc-body">
        <div className="dc-stats">
          <div className="dc-stat">
            <div style={{fontSize:12,fontWeight:700,color:"#f59e0b",letterSpacing:".5px"}}>{"★".repeat(filled)}{"☆".repeat(5-filled)}</div>
            <div style={{fontSize:10,color:"var(--muted)",marginTop:2}}>{rating.toFixed(1)}</div>
          </div>
          <div className="dc-stat">
            <div style={{fontSize:12,fontWeight:700,color:online?"#22c55e":"var(--muted)"}}>{online?"● Онлайн":"○ Офлайн"}</div>
            <div style={{fontSize:10,color:"var(--muted)",marginTop:2}}>Статус</div>
          </div>
          <div className="dc-stat">
            <div style={{fontSize:13,fontWeight:800,color:"var(--teal)"}}>{doctor.price?`$${(doctor.price/100).toFixed(0)}`:"—"}</div>
            <div style={{fontSize:10,color:"var(--muted)",marginTop:2}}>Приём</div>
          </div>
        </div>
        <div style={{
          marginTop:4, padding:"9px 14px", background:"var(--teal-l)",
          borderRadius:8, fontSize:13, color:"var(--teal-d)", fontWeight:600,
          textAlign:"center", border:"1px solid var(--teal-mid)", transition:"all .15s",
        }}
          onMouseEnter={e=>{e.currentTarget.style.background="var(--teal)";e.currentTarget.style.color="#fff";}}
          onMouseLeave={e=>{e.currentTarget.style.background="var(--teal-l)";e.currentTarget.style.color="var(--teal-d)";}}
        >
          Подробнее и запись →
        </div>
      </div>
    </div>
  );
}
