import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../hooks/useAuth";

export default function Register() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showPass, setShowPass] = useState(false);
  const { handleRegister, loading, error, setError } = useAuth();

  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthLabel = ["","Слабый","Средний","Надёжный"][strength];
  const strengthColor = ["","#ef4444","#f59e0b","#22c55e"][strength];

  const onSubmit = (e) => {
    e.preventDefault();
    if (password !== confirm) return setError("Пароли не совпадают");
    if (password.length < 6) return setError("Пароль минимум 6 символов");
    handleRegister(email, password);
  };

  return (
    <div className="auth-layout">
      <motion.div className="auth-left" initial={{ opacity:0,x:-30 }} animate={{ opacity:1,x:0 }} transition={{ duration:.5 }}>
        <div className="auth-left-inner">
          <div className="auth-brand">
            <div className="logo-mark" style={{ width:44,height:44,borderRadius:13 }}>
              <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z"/></svg>
            </div>
            <span style={{ fontFamily:"var(--font-head)",fontSize:22,color:"#fff" }}>Damu<span style={{color:"var(--teal)"}}>Med</span></span>
          </div>
          <h1 className="auth-left-title">Начните заботиться о здоровье сегодня</h1>
          <p className="auth-left-sub">Создайте аккаунт и получите доступ к 50+ лучшим специалистам Казахстана.</p>
          <div className="auth-features">
            {["✅ Бесплатная регистрация","📋 История визитов","🔔 Напоминания о записях","💬 Чат с врачом после приёма"].map(f=>(
              <div key={f} className="auth-feature-item">{f}</div>
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div className="auth-right" initial={{ opacity:0,y:20 }} animate={{ opacity:1,y:0 }} transition={{ duration:.4,delay:.1 }}>
        <div className="auth-form-wrap">
          <div style={{ marginBottom:28 }}>
            <h2 className="auth-title">Создать аккаунт</h2>
            <p className="auth-subtitle">Регистрация займёт меньше минуты</p>
          </div>
          {error && <div className="alert alert-error" style={{ marginBottom:18 }}>{error}</div>}
          <form onSubmit={onSubmit} noValidate>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" placeholder="you@example.com"
                value={email} onChange={e=>setEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="pass">Пароль</label>
              <div style={{ position:"relative" }}>
                <input id="pass" type={showPass?"text":"password"} placeholder="Минимум 6 символов"
                  value={password} onChange={e=>setPassword(e.target.value)} required style={{ paddingRight:44 }}/>
                <button type="button" onClick={()=>setShowPass(s=>!s)}
                  style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",
                    background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:16,padding:4}}>
                  {showPass?"🙈":"👁️"}
                </button>
              </div>
              {password && (
                <div style={{ marginTop:6, display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ flex:1, height:4, borderRadius:4, background:"var(--border2)", overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${(strength/3)*100}%`, background:strengthColor, transition:"all .3s", borderRadius:4 }}/>
                  </div>
                  <span style={{ fontSize:11, fontWeight:700, color:strengthColor, minWidth:52 }}>{strengthLabel}</span>
                </div>
              )}
            </div>
            <div className="field">
              <label htmlFor="conf">Подтвердите пароль</label>
              <input id="conf" type="password" placeholder="Повторите пароль"
                value={confirm} onChange={e=>setConfirm(e.target.value)} required
                style={{ borderColor: confirm && confirm !== password ? "var(--danger)" : "" }} />
              {confirm && confirm !== password && (
                <span style={{fontSize:12,color:"var(--danger)",marginTop:4,display:"block"}}>Пароли не совпадают</span>
              )}
            </div>
            <button type="submit" className="btn btn-primary btn-full" style={{ marginTop:4,padding:"13px" }} disabled={loading}>
              {loading ? <><span className="loader-ring" style={{width:18,height:18,borderWidth:2,marginRight:8}}/>Создаём…</> : "Создать аккаунт →"}
            </button>
          </form>
          <div className="auth-divider"><span>или</span></div>
          <p className="auth-switch">Уже есть аккаунт? <Link to="/login">Войти</Link></p>
        </div>
      </motion.div>
    </div>
  );
}
