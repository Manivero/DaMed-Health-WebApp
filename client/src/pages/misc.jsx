import { Link } from "react-router-dom";
import { motion } from "framer-motion";

function ResultPage({ icon, title, sub, actions, color="#00C9A7" }) {
  return (
    <motion.div
      initial={{ opacity:0, scale:.9 }}
      animate={{ opacity:1, scale:1 }}
      style={{
        display:"flex", flexDirection:"column", alignItems:"center",
        justifyContent:"center", minHeight:"calc(100vh - var(--nav-h))",
        textAlign:"center", padding:"40px 24px", gap:16,
      }}
    >
      <motion.div
        initial={{ scale:0 }} animate={{ scale:1 }}
        transition={{ delay:.15, type:"spring", stiffness:200 }}
        style={{ fontSize:80, lineHeight:1, marginBottom:8 }}
      >{icon}</motion.div>
      <h1 style={{ fontFamily:"var(--font-head)", fontSize:32, color:"var(--navy)", fontWeight:400 }}>{title}</h1>
      <p style={{ color:"var(--muted)", maxWidth:380, fontSize:16 }}>{sub}</p>
      <div style={{ display:"flex", gap:12, flexWrap:"wrap", justifyContent:"center", marginTop:8 }}>
        {actions}
      </div>
    </motion.div>
  );
}

export function Success() {
  return (
    <ResultPage
      icon="✅"
      title="Оплата прошла успешно!"
      sub="Ваша запись подтверждена. Ждём вас! Письмо с деталями отправлено на email."
      actions={<>
        <Link to="/appointments" className="btn btn-primary btn-lg">📋 Мои записи</Link>
        <Link to="/doctors" className="btn btn-ghost btn-lg">Другой врач</Link>
      </>}
    />
  );
}

export function Cancel() {
  return (
    <ResultPage
      icon="❌"
      title="Оплата отменена"
      sub="Ничего страшного — можете попробовать снова или выбрать другого врача."
      actions={<>
        <Link to="/doctors" className="btn btn-primary btn-lg">🔍 Выбрать врача</Link>
        <Link to="/" className="btn btn-ghost btn-lg">На главную</Link>
      </>}
    />
  );
}

export function NotFound() {
  return (
    <ResultPage
      icon="🗺️"
      title="Страница не найдена"
      sub="Возможно, ссылка устарела или страница была перемещена."
      actions={<>
        <Link to="/" className="btn btn-primary btn-lg">На главную</Link>
        <Link to="/doctors" className="btn btn-ghost btn-lg">Найти врача</Link>
      </>}
    />
  );
}

export function Download() {
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}}>
      <div className="page-header">
        <h1>Скачать приложение</h1>
        <p>DamuMed доступен на всех платформах — скоро</p>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:20,padding:"0 48px 48px" }}>
        {[
          { icon:"🤖",title:"Android",sub:"Google Play / APK",badge:"Скоро" },
          { icon:"🍎",title:"iOS",sub:"App Store",badge:"Скоро" },
        ].map(d=>(
          <div key={d.title} className="form-card" style={{ textAlign:"center",padding:"40px 24px",position:"relative" }}>
            <div style={{ position:"absolute",top:14,right:14,background:"var(--teal-l)",color:"var(--teal-d)",fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:"var(--r-full)",border:"1px solid var(--teal-mid)" }}>
              {d.badge}
            </div>
            <div style={{ fontSize:52,marginBottom:14 }}>{d.icon}</div>
            <div className="form-card-title" style={{ fontSize:22 }}>{d.title}</div>
            <p style={{ color:"var(--muted)",marginBottom:20,fontSize:14 }}>{d.sub}</p>
            <button className="btn btn-primary" style={{ width:"100%",justifyContent:"center",opacity:.6 }} disabled>
              Скоро в {d.title==="Android"?"Google Play":"App Store"}
            </button>
          </div>
        ))}
      </div>
      <div style={{ margin:"0 48px 48px",background:"linear-gradient(135deg,var(--navy),#1a3a62)",borderRadius:"var(--r-xl)",padding:"36px 40px",textAlign:"center" }}>
        <h2 style={{ fontFamily:"var(--font-head)",fontSize:26,color:"#fff",fontWeight:400,marginBottom:10 }}>
          Узнайте о запуске первыми
        </h2>
        <p style={{ color:"rgba(255,255,255,.5)",marginBottom:20,fontSize:14 }}>Оставьте email — пришлём уведомление о выходе приложения</p>
        <div style={{ display:"flex",gap:10,maxWidth:400,margin:"0 auto" }}>
          <input type="email" placeholder="you@example.com" style={{ flex:1,padding:"11px 14px",border:"1.5px solid rgba(255,255,255,.15)",borderRadius:"var(--r-sm)",background:"rgba(255,255,255,.08)",color:"#fff",fontFamily:"var(--font-body)",fontSize:14,outline:"none" }} />
          <button className="btn btn-primary">Уведомить</button>
        </div>
      </div>
    </motion.div>
  );
}
