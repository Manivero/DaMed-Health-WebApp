import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const { handleLogin, loading, error } = useAuth();
  const location = useLocation();

  const onSubmit = (e) => {
    e.preventDefault();
    handleLogin(email, password, location.state?.from?.pathname || "/");
  };

  return (
    <div className="auth-layout">
      {/* Left panel */}
      <motion.div className="auth-left" initial={{ opacity:0,x:-30 }} animate={{ opacity:1,x:0 }} transition={{ duration:.5 }}>
        <div className="auth-left-inner">
          <div className="auth-brand">
            <div className="logo-mark" style={{ width:44,height:44,borderRadius:13 }}>
              <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z"/></svg>
            </div>
            <span style={{ fontFamily:"var(--font-head)",fontSize:22,color:"#fff" }}>Damu<span style={{color:"var(--teal)"}}>Med</span></span>
          </div>
          <h1 className="auth-left-title">Медицина нового поколения</h1>
          <p className="auth-left-sub">Записывайтесь к лучшим специалистам онлайн. Ваше здоровье — наш приоритет.</p>
          <div className="auth-features">
            {["🔒 Безопасное хранение данных","⚡ Запись за 2 минуты","🤖 AI-ассистент 24/7","💊 50+ проверенных врачей"].map(f => (
              <div key={f} className="auth-feature-item">{f}</div>
            ))}
          </div>
          <div className="auth-trust">
            <div className="trust-avatars">
              {[["АС","#00C9A7,#00E5C0"],["БЖ","#3B82F6,#60a5fa"],["АН","#8B5CF6,#a78bfa"]].map(([a,g])=>(
                <div key={a} className="trust-av" style={{background:`linear-gradient(135deg,${g})`}}>{a}</div>
              ))}
            </div>
            <span className="trust-text"><strong>12 000+</strong> пациентов доверяют нам</span>
          </div>
        </div>
      </motion.div>

      {/* Right panel */}
      <motion.div className="auth-right" initial={{ opacity:0,y:20 }} animate={{ opacity:1,y:0 }} transition={{ duration:.4, delay:.1 }}>
        <div className="auth-form-wrap">
          <div style={{ marginBottom:32 }}>
            <h2 className="auth-title">Добро пожаловать</h2>
            <p className="auth-subtitle">Войдите в свой аккаунт DamuMed</p>
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom:20 }}>{error}</div>}

          <form onSubmit={onSubmit} noValidate>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" placeholder="you@example.com"
                value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required />
            </div>
            <div className="field">
              <label htmlFor="pass">Пароль</label>
              <div style={{ position:"relative" }}>
                <input id="pass" type={showPass?"text":"password"} placeholder="••••••••"
                  value={password} onChange={e=>setPassword(e.target.value)}
                  autoComplete="current-password" required style={{ paddingRight:44 }} />
                <button type="button" onClick={()=>setShowPass(s=>!s)}
                  style={{ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",
                    background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:16,padding:4 }}>
                  {showPass?"🙈":"👁️"}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-full" style={{ marginTop:8,padding:"13px" }} disabled={loading}>
              {loading ? <><span className="loader-ring" style={{width:18,height:18,borderWidth:2,marginRight:8}}/>Входим…</> : "Войти в аккаунт →"}
            </button>
          </form>

          <div className="auth-divider"><span>или</span></div>
          <p className="auth-switch">Нет аккаунта? <Link to="/register">Зарегистрироваться бесплатно</Link></p>
        </div>
      </motion.div>
    </div>
  );
}
